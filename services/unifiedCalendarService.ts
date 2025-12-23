// Unified Calendar Service - Works with Google, Outlook, and Apple Calendar
import { CalendarEvent } from '../types';
import {
  GoogleCalendarCredentials,
  createGoogleCalendarEvent,
  updateGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
  syncFromGoogleCalendar,
  getCalendarCredentials,
} from './calendarService';
import {
  OutlookCalendarCredentials,
  createOutlookCalendarEvent,
  updateOutlookCalendarEvent,
  deleteOutlookCalendarEvent,
  syncFromOutlookCalendar,
  getOutlookCredentials,
} from './outlookCalendarService';
import {
  AppleCalendarCredentials,
  createAppleCalendarEvent,
  updateAppleCalendarEvent,
  deleteAppleCalendarEvent,
  syncFromAppleCalendar,
  getAppleCredentials,
} from './appleCalendarService';

export type CalendarProvider = 'google' | 'outlook' | 'apple';

export interface CalendarConnection {
  provider: CalendarProvider;
  connected: boolean;
  credentials?: GoogleCalendarCredentials | OutlookCalendarCredentials | AppleCalendarCredentials;
}

/**
 * Get all connected calendar providers for a user
 */
export const getConnectedCalendars = (userId: string): CalendarConnection[] => {
  const connections: CalendarConnection[] = [];

  // Check Google Calendar
  const googleCreds = getCalendarCredentials(userId);
  connections.push({
    provider: 'google',
    connected: !!googleCreds,
    credentials: googleCreds || undefined,
  });

  // Check Outlook Calendar
  const outlookCreds = getOutlookCredentials(userId);
  connections.push({
    provider: 'outlook',
    connected: !!outlookCreds,
    credentials: outlookCreds || undefined,
  });

  // Check Apple Calendar
  const appleCreds = getAppleCredentials(userId);
  connections.push({
    provider: 'apple',
    connected: !!appleCreds,
    credentials: appleCreds || undefined,
  });

  return connections;
};

/**
 * Create event in all connected calendars
 */
export const createEventInAllCalendars = async (
  event: CalendarEvent,
  userId: string,
  meetLink?: string
): Promise<Record<CalendarProvider, string | null>> => {
  const results: Record<CalendarProvider, string | null> = {
    google: null,
    outlook: null,
    apple: null,
  };

  const connections = getConnectedCalendars(userId);

  // Create in Google Calendar
  if (connections.find(c => c.provider === 'google' && c.connected)) {
    try {
      const googleCreds = getCalendarCredentials(userId);
      if (googleCreds) {
        results.google = await createGoogleCalendarEvent(event, googleCreds, meetLink);
      }
    } catch (error) {
      console.error('Failed to create event in Google Calendar:', error);
    }
  }

  // Create in Outlook Calendar
  if (connections.find(c => c.provider === 'outlook' && c.connected)) {
    try {
      const outlookCreds = getOutlookCredentials(userId);
      if (outlookCreds) {
        results.outlook = await createOutlookCalendarEvent(event, outlookCreds, meetLink);
      }
    } catch (error) {
      console.error('Failed to create event in Outlook Calendar:', error);
    }
  }

  // Create in Apple Calendar
  if (connections.find(c => c.provider === 'apple' && c.connected)) {
    try {
      const appleCreds = getAppleCredentials(userId);
      if (appleCreds) {
        results.apple = await createAppleCalendarEvent(event, appleCreds, meetLink);
      }
    } catch (error) {
      console.error('Failed to create event in Apple Calendar:', error);
    }
  }

  return results;
};

/**
 * Update event in all connected calendars
 */
export const updateEventInAllCalendars = async (
  event: CalendarEvent,
  userId: string,
  calendarEventIds: Record<CalendarProvider, string | null>,
  meetLink?: string
): Promise<void> => {
  const connections = getConnectedCalendars(userId);

  // Update in Google Calendar
  if (calendarEventIds.google && connections.find(c => c.provider === 'google' && c.connected)) {
    try {
      const googleCreds = getCalendarCredentials(userId);
      if (googleCreds) {
        await updateGoogleCalendarEvent(calendarEventIds.google, event, googleCreds, meetLink);
      }
    } catch (error) {
      console.error('Failed to update event in Google Calendar:', error);
    }
  }

  // Update in Outlook Calendar
  if (calendarEventIds.outlook && connections.find(c => c.provider === 'outlook' && c.connected)) {
    try {
      const outlookCreds = getOutlookCredentials(userId);
      if (outlookCreds) {
        await updateOutlookCalendarEvent(calendarEventIds.outlook, event, outlookCreds, meetLink);
      }
    } catch (error) {
      console.error('Failed to update event in Outlook Calendar:', error);
    }
  }

  // Update in Apple Calendar
  if (calendarEventIds.apple && connections.find(c => c.provider === 'apple' && c.connected)) {
    try {
      const appleCreds = getAppleCredentials(userId);
      if (appleCreds) {
        await updateAppleCalendarEvent(calendarEventIds.apple, event, appleCreds, meetLink);
      }
    } catch (error) {
      console.error('Failed to update event in Apple Calendar:', error);
    }
  }
};

/**
 * Delete event from all connected calendars
 */
export const deleteEventFromAllCalendars = async (
  userId: string,
  calendarEventIds: Record<CalendarProvider, string | null>
): Promise<void> => {
  const connections = getConnectedCalendars(userId);

  // Delete from Google Calendar
  if (calendarEventIds.google && connections.find(c => c.provider === 'google' && c.connected)) {
    try {
      const googleCreds = getCalendarCredentials(userId);
      if (googleCreds) {
        await deleteGoogleCalendarEvent(calendarEventIds.google, googleCreds);
      }
    } catch (error) {
      console.error('Failed to delete event from Google Calendar:', error);
    }
  }

  // Delete from Outlook Calendar
  if (calendarEventIds.outlook && connections.find(c => c.provider === 'outlook' && c.connected)) {
    try {
      const outlookCreds = getOutlookCredentials(userId);
      if (outlookCreds) {
        await deleteOutlookCalendarEvent(calendarEventIds.outlook, outlookCreds);
      }
    } catch (error) {
      console.error('Failed to delete event from Outlook Calendar:', error);
    }
  }

  // Delete from Apple Calendar
  if (calendarEventIds.apple && connections.find(c => c.provider === 'apple' && c.connected)) {
    try {
      const appleCreds = getAppleCredentials(userId);
      if (appleCreds) {
        await deleteAppleCalendarEvent(calendarEventIds.apple, appleCreds);
      }
    } catch (error) {
      console.error('Failed to delete event from Apple Calendar:', error);
    }
  }
};

/**
 * Sync events from all connected calendars
 */
export const syncFromAllCalendars = async (
  userId: string,
  organizationId: string
): Promise<Omit<CalendarEvent, 'id' | 'createdAt'>[]> => {
  const allEvents: Omit<CalendarEvent, 'id' | 'createdAt'>[] = [];
  const connections = getConnectedCalendars(userId);
  const startDate = new Date();
  const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // Next 30 days

  // Sync from Google Calendar
  if (connections.find(c => c.provider === 'google' && c.connected)) {
    try {
      const googleCreds = getCalendarCredentials(userId);
      if (googleCreds) {
        const events = await syncFromGoogleCalendar(googleCreds, organizationId, userId, startDate, endDate);
        allEvents.push(...events);
      }
    } catch (error) {
      console.error('Failed to sync from Google Calendar:', error);
    }
  }

  // Sync from Outlook Calendar
  if (connections.find(c => c.provider === 'outlook' && c.connected)) {
    try {
      const outlookCreds = getOutlookCredentials(userId);
      if (outlookCreds) {
        const events = await syncFromOutlookCalendar(outlookCreds, organizationId, userId, startDate, endDate);
        allEvents.push(...events);
      }
    } catch (error) {
      console.error('Failed to sync from Outlook Calendar:', error);
    }
  }

  // Sync from Apple Calendar
  if (connections.find(c => c.provider === 'apple' && c.connected)) {
    try {
      const appleCreds = getAppleCredentials(userId);
      if (appleCreds) {
        const events = await syncFromAppleCalendar(appleCreds, organizationId, userId, startDate, endDate);
        allEvents.push(...events);
      }
    } catch (error) {
      console.error('Failed to sync from Apple Calendar:', error);
    }
  }

  // Remove duplicates based on title, date, and time
  const uniqueEvents = allEvents.filter((event, index, self) =>
    index === self.findIndex(e =>
      e.title === event.title &&
      e.date === event.date &&
      e.startTime === event.startTime
    )
  );

  return uniqueEvents;
};

