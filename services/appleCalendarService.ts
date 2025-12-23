// Apple iCloud Calendar service
// Note: Apple doesn't provide a direct web API like Google/Microsoft
// Options:
// 1. Use .ics file generation (simplest - user adds to calendar manually)
// 2. Use CalDAV server implementation (complex, requires server)
// 3. Use third-party unified API (like Nylas, Unified.to) - optional
// This implementation uses .ics files as the primary method, with optional OAuth for advanced sync

import { CalendarEvent } from '../types';

export interface AppleCalendarCredentials {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  // For CalDAV, we might also need:
  caldavUrl?: string;
  username?: string;
  password?: string; // App-specific password for iCloud
}

export interface AppleCalendarEvent {
  uid?: string;
  summary: string;
  description?: string;
  dtstart: string; // ISO 8601 format
  dtend: string; // ISO 8601 format
  location?: string;
  url?: string; // Meeting link
  attendees?: Array<{
    email: string;
    name?: string;
  }>;
}

/**
 * Request Apple Calendar access
 * Note: Apple doesn't provide a direct OAuth flow for web apps
 * This would typically require:
 * 1. App-specific password generation (user must create in Apple ID settings)
 * 2. CalDAV authentication
 * 3. Or using a third-party service like Nylas/Unified.to
 */
export const requestAppleCalendarAccess = (): Promise<AppleCalendarCredentials> => {
  return new Promise((resolve, reject) => {
    // For web apps, we'll use a simplified flow that requires:
    // 1. User to provide their iCloud email
    // 2. User to generate an app-specific password
    // 3. Or redirect to a third-party OAuth service
    
    // Check if using third-party service (like Unified.to or Nylas)
    const useThirdParty = import.meta.env.VITE_USE_APPLE_CALENDAR_SERVICE === 'true';
    
    if (useThirdParty) {
      // Use third-party OAuth flow
      const serviceUrl = import.meta.env.VITE_APPLE_CALENDAR_SERVICE_URL;
      if (!serviceUrl) {
        reject(new Error('Apple Calendar service URL not configured'));
        return;
      }
      
      // Open OAuth popup
      const popup = window.open(
        `${serviceUrl}/oauth/authorize?redirect_uri=${encodeURIComponent(window.location.origin + '/auth/apple/callback')}`,
        'Apple Calendar Auth',
        'width=600,height=700,scrollbars=yes,resizable=yes'
      );

      if (!popup) {
        reject(new Error('Popup blocked. Please allow popups for this site.'));
        return;
      }

      // Listen for callback
      const handleMessage = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;

        if (event.data.type === 'APPLE_CALENDAR_AUTH_SUCCESS') {
          window.removeEventListener('message', handleMessage);
          popup.close();
          resolve({
            accessToken: event.data.accessToken,
            refreshToken: event.data.refreshToken,
            expiresAt: event.data.expiresAt,
          });
        } else if (event.data.type === 'APPLE_CALENDAR_AUTH_ERROR') {
          window.removeEventListener('message', handleMessage);
          popup.close();
          reject(new Error(event.data.error || 'Authentication failed'));
        }
      };

      window.addEventListener('message', handleMessage);

      // Handle popup closed
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          window.removeEventListener('message', handleMessage);
          reject(new Error('Authentication cancelled'));
        }
      }, 1000);
    } else {
      // Manual credential entry (for CalDAV)
      // In a real implementation, you'd show a form for:
      // - iCloud email
      // - App-specific password
      // For now, we'll use a simplified approach
      reject(new Error('Apple Calendar integration requires third-party service or manual CalDAV setup. Please configure VITE_USE_APPLE_CALENDAR_SERVICE and VITE_APPLE_CALENDAR_SERVICE_URL.'));
    }
  });
};

/**
 * Store Apple Calendar credentials
 */
export const storeAppleCredentials = (userId: string, credentials: AppleCalendarCredentials): void => {
  localStorage.setItem(`apple_calendar_credentials_${userId}`, JSON.stringify(credentials));
};

/**
 * Get stored Apple Calendar credentials
 */
export const getAppleCredentials = (userId: string): AppleCalendarCredentials | null => {
  const stored = localStorage.getItem(`apple_calendar_credentials_${userId}`);
  if (!stored) return null;
  
  try {
    const creds = JSON.parse(stored);
    // Check if token is expired
    if (creds.expiresAt && creds.expiresAt < Date.now()) {
      return null;
    }
    return creds;
  } catch {
    return null;
  }
};

/**
 * Clear stored Apple Calendar credentials
 */
export const clearAppleCredentials = (userId: string): void => {
  localStorage.removeItem(`apple_calendar_credentials_${userId}`);
};

/**
 * Convert CalendarEvent to iCal format (for CalDAV)
 */
export const convertToAppleEvent = (event: CalendarEvent, meetLink?: string): AppleCalendarEvent => {
  const startDateTime = new Date(`${event.date}T${event.startTime}`);
  const durationMinutes = parseDuration(event.duration);
  const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60000);

  return {
    summary: event.title,
    description: `Meeting Type: ${event.type}${meetLink ? `\n\nJoin: ${meetLink}` : ''}`,
    dtstart: startDateTime.toISOString(),
    dtend: endDateTime.toISOString(),
    url: meetLink,
  };
};

/**
 * Convert Apple Calendar event to CalendarEvent format
 */
export const convertFromAppleEvent = (
  appleEvent: AppleCalendarEvent,
  organizationId: string,
  userId: string
): Omit<CalendarEvent, 'id' | 'createdAt'> => {
  const start = new Date(appleEvent.dtstart);
  const end = new Date(appleEvent.dtend);

  const durationMs = end.getTime() - start.getTime();
  const durationMinutes = Math.round(durationMs / 60000);
  const duration = formatDuration(durationMinutes);

  return {
    organizationId,
    title: appleEvent.summary || 'Untitled Event',
    date: start.toISOString().split('T')[0],
    startTime: start.toTimeString().slice(0, 5),
    duration,
    type: appleEvent.url ? 'Virtual' : 'In-Person',
    googleMeetLink: appleEvent.url,
  };
};

/**
 * Parse duration string to minutes
 */
const parseDuration = (duration: string): number => {
  if (duration.includes('h')) {
    const hours = parseFloat(duration.replace('h', '').trim());
    return Math.round(hours * 60);
  }
  if (duration.includes('min')) {
    return parseInt(duration.replace('min', '').trim(), 10);
  }
  return 60;
};

/**
 * Format minutes to duration string
 */
const formatDuration = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = minutes / 60;
  if (hours % 1 === 0) {
    return `${hours}h`;
  }
  return `${hours}h`;
};

/**
 * Create event in Apple Calendar via backend API
 */
export const createAppleCalendarEvent = async (
  event: CalendarEvent,
  credentials: AppleCalendarCredentials,
  meetLink?: string
): Promise<string> => {
  const appleEvent = convertToAppleEvent(event, meetLink);
  
  const functionsUrl = import.meta.env.VITE_FUNCTIONS_URL 
    ? `${import.meta.env.VITE_FUNCTIONS_URL}/syncAppleCalendar`
    : (import.meta.env.DEV 
      ? 'http://localhost:5001/meant2grow-dev/us-central1/syncAppleCalendar'
      : 'https://us-central1-meant2grow-dev.cloudfunctions.net/syncAppleCalendar');

  const response = await fetch(functionsUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'create',
      event: appleEvent,
      credentials,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create Apple calendar event');
  }

  const data = await response.json();
  return data.eventId;
};

/**
 * Update event in Apple Calendar
 */
export const updateAppleCalendarEvent = async (
  appleEventId: string,
  event: CalendarEvent,
  credentials: AppleCalendarCredentials,
  meetLink?: string
): Promise<void> => {
  const appleEvent = convertToAppleEvent(event, meetLink);
  appleEvent.uid = appleEventId;
  
  const functionsUrl = import.meta.env.VITE_FUNCTIONS_URL 
    ? `${import.meta.env.VITE_FUNCTIONS_URL}/syncAppleCalendar`
    : (import.meta.env.DEV 
      ? 'http://localhost:5001/meant2grow-dev/us-central1/syncAppleCalendar'
      : 'https://us-central1-meant2grow-dev.cloudfunctions.net/syncAppleCalendar');

  const response = await fetch(functionsUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'update',
      event: appleEvent,
      credentials,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update Apple calendar event');
  }
};

/**
 * Delete event from Apple Calendar
 */
export const deleteAppleCalendarEvent = async (
  appleEventId: string,
  credentials: AppleCalendarCredentials
): Promise<void> => {
  const functionsUrl = import.meta.env.VITE_FUNCTIONS_URL 
    ? `${import.meta.env.VITE_FUNCTIONS_URL}/syncAppleCalendar`
    : (import.meta.env.DEV 
      ? 'http://localhost:5001/meant2grow-dev/us-central1/syncAppleCalendar'
      : 'https://us-central1-meant2grow-dev.cloudfunctions.net/syncAppleCalendar');

  const response = await fetch(functionsUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'delete',
      eventId: appleEventId,
      credentials,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to delete Apple calendar event');
  }
};

/**
 * Sync events from Apple Calendar
 */
export const syncFromAppleCalendar = async (
  credentials: AppleCalendarCredentials,
  organizationId: string,
  userId: string,
  startDate?: Date,
  endDate?: Date
): Promise<Omit<CalendarEvent, 'id' | 'createdAt'>[]> => {
  const startDateTime = startDate?.toISOString() || new Date().toISOString();
  const endDateTime = endDate?.toISOString();

  const functionsUrl = import.meta.env.VITE_FUNCTIONS_URL 
    ? `${import.meta.env.VITE_FUNCTIONS_URL}/syncAppleCalendar`
    : (import.meta.env.DEV 
      ? 'http://localhost:5001/meant2grow-dev/us-central1/syncAppleCalendar'
      : 'https://us-central1-meant2grow-dev.cloudfunctions.net/syncAppleCalendar');

  const response = await fetch(functionsUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'list',
      credentials,
      startDateTime,
      endDateTime,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to sync Apple calendar events');
  }

  const data = await response.json();
  return data.events.map((ae: AppleCalendarEvent) => 
    convertFromAppleEvent(ae, organizationId, userId)
  );
};

