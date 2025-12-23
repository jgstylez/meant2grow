// Microsoft Outlook Calendar API service using Microsoft Graph API
import { CalendarEvent } from '../types';

export interface OutlookCalendarCredentials {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
}

export interface OutlookCalendarEvent {
  id?: string;
  subject: string;
  body?: {
    contentType: string;
    content: string;
  };
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  attendees?: Array<{
    emailAddress: {
      address: string;
      name?: string;
    };
    type: string;
  }>;
  isOnlineMeeting?: boolean;
  onlineMeetingProvider?: string;
  onlineMeetingUrl?: string;
}

/**
 * Request Microsoft Outlook Calendar access via OAuth 2.0
 * Uses Microsoft Identity Platform (Azure AD)
 */
export const requestOutlookAccess = (): Promise<OutlookCalendarCredentials> => {
  return new Promise((resolve, reject) => {
    const clientId = import.meta.env.VITE_MICROSOFT_CLIENT_ID;
    if (!clientId) {
      reject(new Error('VITE_MICROSOFT_CLIENT_ID is not set'));
      return;
    }

    const redirectUri = `${window.location.origin}/auth/outlook/callback`;
    const scopes = ['https://graph.microsoft.com/Calendars.ReadWrite', 'offline_access'].join(' ');
    const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
      `client_id=${encodeURIComponent(clientId)}` +
      `&response_type=code` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_mode=query` +
      `&scope=${encodeURIComponent(scopes)}` +
      `&state=${encodeURIComponent(Date.now().toString())}`;

    // Open popup for OAuth
    const popup = window.open(
      authUrl,
      'Outlook Calendar Auth',
      'width=600,height=700,scrollbars=yes,resizable=yes'
    );

    if (!popup) {
      reject(new Error('Popup blocked. Please allow popups for this site.'));
      return;
    }

    // Listen for callback
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;

      if (event.data.type === 'OUTLOOK_AUTH_SUCCESS') {
        window.removeEventListener('message', handleMessage);
        popup.close();
        resolve({
          accessToken: event.data.accessToken,
          refreshToken: event.data.refreshToken,
          expiresAt: event.data.expiresAt,
        });
      } else if (event.data.type === 'OUTLOOK_AUTH_ERROR') {
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
  });
};

/**
 * Exchange authorization code for access token (server-side)
 */
export const exchangeOutlookCode = async (code: string): Promise<OutlookCalendarCredentials> => {
  const functionsUrl = import.meta.env.VITE_FUNCTIONS_URL 
    ? `${import.meta.env.VITE_FUNCTIONS_URL}/outlookAuth`
    : (import.meta.env.DEV 
      ? 'http://localhost:5001/meant2grow-dev/us-central1/outlookAuth'
      : 'https://us-central1-meant2grow-dev.cloudfunctions.net/outlookAuth');

  const response = await fetch(functionsUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ code }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to authenticate with Outlook');
  }

  return response.json();
};

/**
 * Store Outlook credentials in localStorage
 */
export const storeOutlookCredentials = (userId: string, credentials: OutlookCalendarCredentials): void => {
  localStorage.setItem(`outlook_credentials_${userId}`, JSON.stringify(credentials));
};

/**
 * Get stored Outlook credentials
 */
export const getOutlookCredentials = (userId: string): OutlookCalendarCredentials | null => {
  const stored = localStorage.getItem(`outlook_credentials_${userId}`);
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
 * Clear stored Outlook credentials
 */
export const clearOutlookCredentials = (userId: string): void => {
  localStorage.removeItem(`outlook_credentials_${userId}`);
};

/**
 * Convert CalendarEvent to Outlook Calendar event format
 */
export const convertToOutlookEvent = (event: CalendarEvent, meetLink?: string): OutlookCalendarEvent => {
  const startDateTime = new Date(`${event.date}T${event.startTime}`);
  const durationMinutes = parseDuration(event.duration);
  const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60000);
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const outlookEvent: OutlookCalendarEvent = {
    subject: event.title,
    body: {
      contentType: 'HTML',
      content: `Meeting Type: ${event.type}${meetLink ? `<br><br>Join: <a href="${meetLink}">${meetLink}</a>` : ''}`,
    },
    start: {
      dateTime: startDateTime.toISOString(),
      timeZone,
    },
    end: {
      dateTime: endDateTime.toISOString(),
      timeZone,
    },
  };

  if (meetLink) {
    outlookEvent.isOnlineMeeting = true;
    outlookEvent.onlineMeetingProvider = 'teamsForBusiness';
    outlookEvent.onlineMeetingUrl = meetLink;
  }

  return outlookEvent;
};

/**
 * Convert Outlook Calendar event to CalendarEvent format
 */
export const convertFromOutlookEvent = (
  outlookEvent: OutlookCalendarEvent,
  organizationId: string,
  userId: string
): Omit<CalendarEvent, 'id' | 'createdAt'> => {
  const start = new Date(outlookEvent.start.dateTime);
  const end = new Date(outlookEvent.end.dateTime);

  const durationMs = end.getTime() - start.getTime();
  const durationMinutes = Math.round(durationMs / 60000);
  const duration = formatDuration(durationMinutes);

  return {
    organizationId,
    title: outlookEvent.subject || 'Untitled Event',
    date: start.toISOString().split('T')[0],
    startTime: start.toTimeString().slice(0, 5),
    duration,
    type: outlookEvent.isOnlineMeeting ? 'Virtual' : 'In-Person',
    googleMeetLink: outlookEvent.onlineMeetingUrl,
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
 * Create event in Outlook Calendar via backend API
 */
export const createOutlookCalendarEvent = async (
  event: CalendarEvent,
  credentials: OutlookCalendarCredentials,
  meetLink?: string
): Promise<string> => {
  const outlookEvent = convertToOutlookEvent(event, meetLink);
  
  const functionsUrl = import.meta.env.VITE_FUNCTIONS_URL 
    ? `${import.meta.env.VITE_FUNCTIONS_URL}/syncOutlookCalendar`
    : (import.meta.env.DEV 
      ? 'http://localhost:5001/meant2grow-dev/us-central1/syncOutlookCalendar'
      : 'https://us-central1-meant2grow-dev.cloudfunctions.net/syncOutlookCalendar');

  const response = await fetch(functionsUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'create',
      event: outlookEvent,
      accessToken: credentials.accessToken,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create Outlook calendar event');
  }

  const data = await response.json();
  return data.eventId;
};

/**
 * Update event in Outlook Calendar
 */
export const updateOutlookCalendarEvent = async (
  outlookEventId: string,
  event: CalendarEvent,
  credentials: OutlookCalendarCredentials,
  meetLink?: string
): Promise<void> => {
  const outlookEvent = convertToOutlookEvent(event, meetLink);
  outlookEvent.id = outlookEventId;
  
  const functionsUrl = import.meta.env.VITE_FUNCTIONS_URL 
    ? `${import.meta.env.VITE_FUNCTIONS_URL}/syncOutlookCalendar`
    : (import.meta.env.DEV 
      ? 'http://localhost:5001/meant2grow-dev/us-central1/syncOutlookCalendar'
      : 'https://us-central1-meant2grow-dev.cloudfunctions.net/syncOutlookCalendar');

  const response = await fetch(functionsUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'update',
      event: outlookEvent,
      accessToken: credentials.accessToken,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update Outlook calendar event');
  }
};

/**
 * Delete event from Outlook Calendar
 */
export const deleteOutlookCalendarEvent = async (
  outlookEventId: string,
  credentials: OutlookCalendarCredentials
): Promise<void> => {
  const functionsUrl = import.meta.env.VITE_FUNCTIONS_URL 
    ? `${import.meta.env.VITE_FUNCTIONS_URL}/syncOutlookCalendar`
    : (import.meta.env.DEV 
      ? 'http://localhost:5001/meant2grow-dev/us-central1/syncOutlookCalendar'
      : 'https://us-central1-meant2grow-dev.cloudfunctions.net/syncOutlookCalendar');

  const response = await fetch(functionsUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'delete',
      eventId: outlookEventId,
      accessToken: credentials.accessToken,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to delete Outlook calendar event');
  }
};

/**
 * Sync events from Outlook Calendar
 */
export const syncFromOutlookCalendar = async (
  credentials: OutlookCalendarCredentials,
  organizationId: string,
  userId: string,
  startDate?: Date,
  endDate?: Date
): Promise<Omit<CalendarEvent, 'id' | 'createdAt'>[]> => {
  const startDateTime = startDate?.toISOString() || new Date().toISOString();
  const endDateTime = endDate?.toISOString();

  const functionsUrl = import.meta.env.VITE_FUNCTIONS_URL 
    ? `${import.meta.env.VITE_FUNCTIONS_URL}/syncOutlookCalendar`
    : (import.meta.env.DEV 
      ? 'http://localhost:5001/meant2grow-dev/us-central1/syncOutlookCalendar'
      : 'https://us-central1-meant2grow-dev.cloudfunctions.net/syncOutlookCalendar');

  const response = await fetch(functionsUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'list',
      accessToken: credentials.accessToken,
      startDateTime,
      endDateTime,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to sync Outlook calendar events');
  }

  const data = await response.json();
  return data.events.map((oe: OutlookCalendarEvent) => 
    convertFromOutlookEvent(oe, organizationId, userId)
  );
};

