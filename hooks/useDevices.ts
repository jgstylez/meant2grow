import { useState, useEffect, useCallback } from 'react';
import { getUserDevices, removeDevice, updateLastActive, DeviceInfo } from '../services/deviceTracking';
import { removeFCMToken } from '../services/messaging';
import { getErrorMessage } from '../utils/errors';

interface UseDevicesReturn {
  devices: DeviceInfo[];
  isLoading: boolean;
  error: string | null;
  refreshDevices: () => Promise<void>;
  revokeDevice: (deviceId: string) => Promise<void>;
  currentDeviceId: string | null;
}

/**
 * Hook to manage user devices
 */
export function useDevices(userId: string | null): UseDevicesReturn {
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentDeviceId, setCurrentDeviceId] = useState<string | null>(null);

  // Get current device ID from localStorage
  useEffect(() => {
    if (userId) {
      const deviceId = localStorage.getItem(`deviceId_${userId}`);
      setCurrentDeviceId(deviceId);
    }
  }, [userId]);

  const refreshDevices = useCallback(async () => {
    if (!userId) {
      setDevices([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const userDevices = await getUserDevices(userId);
      
      // Sort devices: current device first, then by last active
      const sortedDevices = userDevices.sort((a, b) => {
        if (a.isCurrentDevice && !b.isCurrentDevice) return -1;
        if (!a.isCurrentDevice && b.isCurrentDevice) return 1;
        return new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime();
      });
      
      setDevices(sortedDevices);
    } catch (err: unknown) {
      console.error('Error fetching devices:', err);
      setError(getErrorMessage(err) || 'Failed to load devices');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const revokeDevice = useCallback(async (deviceId: string) => {
    if (!userId) return;

    try {
      // Remove device from Firestore
      await removeDevice(userId, deviceId);
      
      // Also remove FCM token for that device
      await removeFCMToken(userId, deviceId);
      
      // Refresh device list
      await refreshDevices();
    } catch (err: unknown) {
      console.error('Error revoking device:', err);
      throw err;
    }
  }, [userId, refreshDevices]);

  // Update last active timestamp periodically for current device
  useEffect(() => {
    if (!userId || !currentDeviceId) return;

    const updateActive = async () => {
      try {
        await updateLastActive(userId, currentDeviceId);
      } catch (error) {
        console.error('Error updating last active:', error);
      }
    };

    // Update immediately
    updateActive();

    // Update every 5 minutes
    const interval = setInterval(updateActive, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [userId, currentDeviceId]);

  // Load devices on mount and when userId changes
  useEffect(() => {
    refreshDevices();
  }, [refreshDevices]);

  return {
    devices,
    isLoading,
    error,
    refreshDevices,
    revokeDevice,
    currentDeviceId,
  };
}

