import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

export interface DeviceInfo {
  deviceId: string;
  fcmToken: string;
  userAgent: string;
  platform: 'ios' | 'android' | 'desktop' | 'unknown';
  deviceName: string;
  lastActiveAt: string;
  createdAt: string;
  location?: string;
  isCurrentDevice: boolean;
}

/**
 * Generate a unique device ID based on browser fingerprint
 * Uses a combination of user agent, screen size, timezone, and language
 */
export function generateDeviceId(): string {
  const userAgent = navigator.userAgent || '';
  const screen = `${window.screen.width}x${window.screen.height}`;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const language = navigator.language || 'en';
  
  // Create a simple hash from the fingerprint components
  const fingerprint = `${userAgent}|${screen}|${timezone}|${language}`;
  
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Add timestamp to ensure uniqueness
  const timestamp = Date.now();
  return `device_${Math.abs(hash)}_${timestamp}`;
}

/**
 * Get device name from user agent
 */
export function getDeviceName(): string {
  const userAgent = navigator.userAgent || '';
  const ua = userAgent.toLowerCase();
  
  // Detect iOS devices
  if (/iphone/.test(ua)) {
    const match = userAgent.match(/iPhone\s?OS\s(\d+)/i) || userAgent.match(/iPhone/i);
    if (match) {
      return 'iPhone';
    }
  }
  if (/ipad/.test(ua)) {
    return 'iPad';
  }
  if (/ipod/.test(ua)) {
    return 'iPod';
  }
  
  // Detect Android devices
  if (/android/.test(ua)) {
    // Try to extract device model
    const match = userAgent.match(/Android.*;\s([^)]+)\)/i);
    if (match && match[1]) {
      return match[1].trim();
    }
    return 'Android Device';
  }
  
  // Detect desktop browsers
  if (/windows/.test(ua)) {
    if (/edge/.test(ua)) return 'Windows (Edge)';
    if (/chrome/.test(ua)) return 'Windows (Chrome)';
    if (/firefox/.test(ua)) return 'Windows (Firefox)';
    return 'Windows';
  }
  if (/macintosh/.test(ua) || /mac os/.test(ua)) {
    if (/safari/.test(ua) && !/chrome/.test(ua)) return 'Mac (Safari)';
    if (/chrome/.test(ua)) return 'Mac (Chrome)';
    if (/firefox/.test(ua)) return 'Mac (Firefox)';
    return 'Mac';
  }
  if (/linux/.test(ua)) {
    if (/chrome/.test(ua)) return 'Linux (Chrome)';
    if (/firefox/.test(ua)) return 'Linux (Firefox)';
    return 'Linux';
  }
  
  return 'Unknown Device';
}

/**
 * Detect platform from user agent
 */
export function detectPlatform(): 'ios' | 'android' | 'desktop' | 'unknown' {
  const userAgent = navigator.userAgent || '';
  const ua = userAgent.toLowerCase();
  
  if (/iphone|ipad|ipod/.test(ua) || (window.navigator as any).standalone === true) {
    return 'ios';
  }
  
  if (/android/.test(ua)) {
    return 'android';
  }
  
  // Check if it's a desktop browser
  if (/windows|macintosh|linux/.test(ua) && !/mobile|android|iphone|ipad|ipod/.test(ua)) {
    return 'desktop';
  }
  
  return 'unknown';
}

/**
 * Get approximate location (city/region) - simplified version
 * In production, you might want to use a geolocation API
 */
export async function getLocation(): Promise<string | undefined> {
  try {
    // Try to get location from timezone
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (timezone) {
      // Extract city name from timezone (e.g., "America/New_York" -> "New York")
      const parts = timezone.split('/');
      if (parts.length > 1) {
        const city = parts[parts.length - 1].replace(/_/g, ' ');
        return city;
      }
    }
  } catch (error) {
    console.warn('Could not determine location:', error);
  }
  return undefined;
}

/**
 * Create device info object for current device
 */
export async function createDeviceInfo(fcmToken: string, deviceId?: string): Promise<DeviceInfo> {
  const id = deviceId || generateDeviceId();
  const location = await getLocation();
  
  return {
    deviceId: id,
    fcmToken,
    userAgent: navigator.userAgent || '',
    platform: detectPlatform(),
    deviceName: getDeviceName(),
    lastActiveAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    location,
    isCurrentDevice: true,
  };
}

/**
 * Save or update device info for a user
 * If device already exists (same deviceId), update it; otherwise add new device
 */
export async function saveDeviceInfo(userId: string, deviceInfo: DeviceInfo): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      throw new Error('User document does not exist');
    }
    
    const userData = userDoc.data();
    const devices: DeviceInfo[] = userData.devices || [];
    
    // Check if device already exists
    const existingDeviceIndex = devices.findIndex(d => d.deviceId === deviceInfo.deviceId);
    
    if (existingDeviceIndex >= 0) {
      // Update existing device
      devices[existingDeviceIndex] = {
        ...devices[existingDeviceIndex],
        ...deviceInfo,
        lastActiveAt: new Date().toISOString(),
        isCurrentDevice: true,
      };
      
      // Mark all other devices as not current
      devices.forEach((device, index) => {
        if (index !== existingDeviceIndex) {
          device.isCurrentDevice = false;
        }
      });
    } else {
      // Add new device
      // Mark all existing devices as not current
      devices.forEach(device => {
        device.isCurrentDevice = false;
      });
      
      devices.push(deviceInfo);
    }
    
    // Update user document
    await updateDoc(userRef, {
      devices,
      lastActiveAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error saving device info:', error);
    throw error;
  }
}

/**
 * Get all devices for a user
 */
export async function getUserDevices(userId: string): Promise<DeviceInfo[]> {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      return [];
    }
    
    const userData = userDoc.data();
    return userData.devices || [];
  } catch (error) {
    console.error('Error getting user devices:', error);
    return [];
  }
}

/**
 * Remove a device by deviceId
 */
export async function removeDevice(userId: string, deviceId: string): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      throw new Error('User document does not exist');
    }
    
    const userData = userDoc.data();
    const devices: DeviceInfo[] = userData.devices || [];
    
    // Remove the device
    const updatedDevices = devices.filter(d => d.deviceId !== deviceId);
    
    await updateDoc(userRef, {
      devices: updatedDevices,
    });
  } catch (error) {
    console.error('Error removing device:', error);
    throw error;
  }
}

/**
 * Update last active timestamp for current device
 */
export async function updateLastActive(userId: string, deviceId: string): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      return;
    }
    
    const userData = userDoc.data();
    const devices: DeviceInfo[] = userData.devices || [];
    
    const deviceIndex = devices.findIndex(d => d.deviceId === deviceId);
    if (deviceIndex >= 0) {
      devices[deviceIndex].lastActiveAt = new Date().toISOString();
      
      await updateDoc(userRef, {
        devices,
      });
    }
  } catch (error) {
    console.error('Error updating last active:', error);
  }
}

