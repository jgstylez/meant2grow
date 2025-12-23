// Google Calendar API service for syncing events
import { CalendarEvent } from '../types';

export interface GoogleCalendarCredentials {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
}

export interface GoogleCalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
  }>;
  conferenceData?: {
    createRequest: {
      requestId: string;
      conferenceSolutionKey: {
        type: string;
      };
    };
  };
  hangoutLink?: string;
}

/**
 * Initialize Google Calendar OAuth flow
 */
export const initializeCalendarAuth = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.google) {
      reject(new Error('Google API not loaded'));
      return;
    }

    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      reject(new Error('VITE_GOOGLE_CLIENT_ID is not set'));
      return;
    }

    resolve();
  });
};

/**
 * Request Google Calendar access token
 */
export const requestCalendarAccess = (): Promise<GoogleCalendarCredentials> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.google) {
      reject(new Error('Google API not loaded'));
      return;
    }

    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      reject(new Error('VITE_GOOGLE_CLIENT_ID is not set'));
      return;
    }

    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events',
      callback: (tokenResponse: any) => {
        if (tokenResponse.error) {
          reject(new Error(tokenResponse.error));
          return;
        }

        resolve({
          accessToken: tokenResponse.access_token,
          expiresAt: Date.now() + (tokenResponse.expires_in * 1000),
        });
      },
    });

    tokenClient.requestAccessToken();
  });
};

/**
 * Store calendar credentials in localStorage
 */
export const storeCalendarCredentials = (userId: string, credentials: GoogleCalendarCredentials): void => {
  localStorage.setItem(`calendar_credentials_${userId}`, JSON.stringify(credentials));
};

/**
 * Get stored calendar credentials
 */
export const getCalendarCredentials = (userId: string): GoogleCalendarCredentials | null => {
  const stored = localStorage.getItem(`calendar_credentials_${userId}`);
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
 * Clear stored calendar credentials
 */
export const clearCalendarCredentials = (userId: string): void => {
  localStorage.removeItem(`calendar_credentials_${userId}`);
};

/**
 * Convert CalendarEvent to Google Calendar event format
 */
export const convertToGoogleEvent = (event: CalendarEvent, meetLink?: string): GoogleCalendarEvent => {
  const startDateTime = new Date(`${event.date}T${event.startTime}`);
  const durationMinutes = parseDuration(event.duration);
  const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60000);

  const googleEvent: GoogleCalendarEvent = {
    summary: event.title,
    description: `Meeting Type: ${event.type}${meetLink ? `\n\nJoin: ${meetLink}` : ''}`,
    start: {
      dateTime: startDateTime.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    end: {
      dateTime: endDateTime.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  };

  if (meetLink) {
    googleEvent.hangoutLink = meetLink;
  }

  return googleEvent;
};

/**
 * Convert Google Calendar event to CalendarEvent format
 */
export const convertFromGoogleEvent = (
  googleEvent: GoogleCalendarEvent,
  organizationId: string,
  userId: string
): Omit<CalendarEvent, 'id' | 'createdAt'> => {
  const start = googleEvent.start.dateTime 
    ? new Date(googleEvent.start.dateTime)
    : new Date(googleEvent.start.date!);
  
  const end = googleEvent.end.dateTime
    ? new Date(googleEvent.end.dateTime)
    : new Date(googleEvent.end.date!);

  const durationMs = end.getTime() - start.getTime();
  const durationMinutes = Math.round(durationMs / 60000);
  const duration = formatDuration(durationMinutes);

  return {
    organizationId,
    title: googleEvent.summary || 'Untitled Event',
    date: start.toISOString().split('T')[0],
    startTime: start.toTimeString().slice(0, 5),
    duration,
    type: googleEvent.hangoutLink ? 'Virtual' : 'In-Person',
    googleMeetLink: googleEvent.hangoutLink,
  };
};

/**
 * Parse duration string (e.g., "1h", "30 min", "1.5h") to minutes
 */
const parseDuration = (duration: string): number => {
  if (duration.includes('h')) {
    const hours = parseFloat(duration.replace('h', '').trim());
    return Math.round(hours * 60);
  }
  if (duration.includes('min')) {
    return parseInt(duration.replace('min', '').trim(), 10);
  }
  return 60; // Default to 1 hour
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
 * Create event in Google Calendar via backend API
 */
export const createGoogleCalendarEvent = async (
  event: CalendarEvent,
  credentials: GoogleCalendarCredentials,
  meetLink?: string
): Promise<string> => {
  const googleEvent = convertToGoogleEvent(event, meetLink);
  
  const functionsUrl = import.meta.env.VITE_FUNCTIONS_URL 
    ? `${import.meta.env.VITE_FUNCTIONS_URL}/syncCalendarEvent`
    : (import.meta.env.DEV 
      ? 'http://localhost:5001/meant2grow-dev/us-central1/syncCalendarEvent'
      : 'https://us-central1-meant2grow-dev.cloudfunctions.net/syncCalendarEvent');

  const response = await fetch(functionsUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'create',
      event: googleEvent,
      accessToken: credentials.accessToken,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create calendar event');
  }

  const data = await response.json();
  return data.eventId;
};

/**
 * Update event in Google Calendar
 */
export const updateGoogleCalendarEvent = async (
  googleEventId: string,
  event: CalendarEvent,
  credentials: GoogleCalendarCredentials,
  meetLink?: string
): Promise<void> => {
  const googleEvent = convertToGoogleEvent(event, meetLink);
  googleEvent.id = googleEventId;
  
  const functionsUrl = import.meta.env.VITE_FUNCTIONS_URL 
    ? `${import.meta.env.VITE_FUNCTIONS_URL}/syncCalendarEvent`
    : (import.meta.env.DEV 
      ? 'http://localhost:5001/meant2grow-dev/us-central1/syncCalendarEvent'
      : 'https://us-central1-meant2grow-dev.cloudfunctions.net/syncCalendarEvent');

  const response = await fetch(functionsUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'update',
      event: googleEvent,
      accessToken: credentials.accessToken,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update calendar event');
  }
};

/**
 * Delete event from Google Calendar
 */
export const deleteGoogleCalendarEvent = async (
  googleEventId: string,
  credentials: GoogleCalendarCredentials
): Promise<void> => {
  const functionsUrl = import.meta.env.VITE_FUNCTIONS_URL 
    ? `${import.meta.env.VITE_FUNCTIONS_URL}/syncCalendarEvent`
    : (import.meta.env.DEV 
      ? 'http://localhost:5001/meant2grow-dev/us-central1/syncCalendarEvent'
      : 'https://us-central1-meant2grow-dev.cloudfunctions.net/syncCalendarEvent');

  const response = await fetch(functionsUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'delete',
      eventId: googleEventId,
      accessToken: credentials.accessToken,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to delete calendar event');
  }
};

/**
 * Sync events from Google Calendar
 */
export const syncFromGoogleCalendar = async (
  credentials: GoogleCalendarCredentials,
  organizationId: string,
  userId: string,
  startDate?: Date,
  endDate?: Date
): Promise<Omit<CalendarEvent, 'id' | 'createdAt'>[]> => {
  const timeMin = startDate?.toISOString() || new Date().toISOString();
  const timeMax = endDate?.toISOString();

  const functionsUrl = import.meta.env.VITE_FUNCTIONS_URL 
    ? `${import.meta.env.VITE_FUNCTIONS_URL}/syncCalendarEvent`
    : (import.meta.env.DEV 
      ? 'http://localhost:5001/meant2grow-dev/us-central1/syncCalendarEvent'
      : 'https://us-central1-meant2grow-dev.cloudfunctions.net/syncCalendarEvent');

  const response = await fetch(functionsUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'list',
      accessToken: credentials.accessToken,
      timeMin,
      timeMax,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to sync calendar events');
  }

  const data = await response.json();
  return data.events.map((ge: GoogleCalendarEvent) => 
    convertFromGoogleEvent(ge, organizationId, userId)
  );
};

