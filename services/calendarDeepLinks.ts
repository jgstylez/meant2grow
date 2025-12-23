// Calendar Deep Links - Direct integration without requiring OAuth
// These allow users to add events directly to their calendars via browser/app links

import { CalendarEvent } from '../types';

/**
 * Generate Google Calendar deep link URL
 * Opens Google Calendar in browser with pre-filled event details
 */
export const generateGoogleCalendarLink = (event: CalendarEvent, meetLink?: string): string => {
  const startDateTime = new Date(`${event.date}T${event.startTime}`);
  const durationMinutes = parseDuration(event.duration);
  const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60000);
  
  // Format dates for Google Calendar (YYYYMMDDTHHmmss)
  const formatGoogleDate = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${formatGoogleDate(startDateTime)}/${formatGoogleDate(endDateTime)}`,
    details: `Meeting Type: ${event.type}${meetLink ? `\n\nJoin: ${meetLink}` : ''}`,
    location: event.type === 'In-Person' ? 'Location TBD' : '',
  });

  if (meetLink) {
    params.append('add', meetLink);
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

/**
 * Generate Outlook Calendar deep link URL
 * Opens Outlook Calendar in browser with pre-filled event details
 */
export const generateOutlookCalendarLink = (event: CalendarEvent, meetLink?: string): string => {
  const startDateTime = new Date(`${event.date}T${event.startTime}`);
  const durationMinutes = parseDuration(event.duration);
  const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60000);

  const params = new URLSearchParams({
    subject: event.title,
    startdt: startDateTime.toISOString(),
    enddt: endDateTime.toISOString(),
    body: `Meeting Type: ${event.type}${meetLink ? `\n\nJoin: ${meetLink}` : ''}`,
    location: event.type === 'In-Person' ? 'Location TBD' : '',
  });

  if (meetLink) {
    params.append('online', 'true');
    params.append('onlineurl', meetLink);
  }

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
};

/**
 * Generate Apple Calendar .ics file content
 * Can be used to download or open directly in Apple Calendar
 */
export const generateAppleCalendarICS = (event: CalendarEvent, meetLink?: string): string => {
  const startDateTime = new Date(`${event.date}T${event.startTime}`);
  const durationMinutes = parseDuration(event.duration);
  const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60000);
  
  const formatICSDate = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const uid = `${event.id || Date.now()}@meant2grow.com`;
  const now = new Date();
  
  let ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Meant2Grow//Calendar Event//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${formatICSDate(now)}`,
    `DTSTART:${formatICSDate(startDateTime)}`,
    `DTEND:${formatICSDate(endDateTime)}`,
    `SUMMARY:${escapeICS(event.title)}`,
    `DESCRIPTION:${escapeICS(`Meeting Type: ${event.type}${meetLink ? `\\n\\nJoin: ${meetLink}` : ''}`)}`,
  ];

  if (meetLink) {
    ics.push(`URL:${meetLink}`);
    ics.push(`LOCATION:${escapeICS('Virtual Meeting')}`);
  } else if (event.type === 'In-Person') {
    ics.push(`LOCATION:${escapeICS('Location TBD')}`);
  }

  ics.push('STATUS:CONFIRMED');
  ics.push('SEQUENCE:0');
  ics.push('END:VEVENT');
  ics.push('END:VCALENDAR');

  return ics.join('\r\n');
};

/**
 * Open calendar event in user's default calendar app
 * Uses data URI to trigger calendar app
 */
export const openCalendarEvent = async (
  event: CalendarEvent,
  provider: 'google' | 'outlook' | 'apple',
  meetLink?: string
): Promise<void> => {
  let url: string;

  switch (provider) {
    case 'google':
      url = generateGoogleCalendarLink(event, meetLink);
      window.open(url, '_blank');
      break;
    
    case 'outlook':
      url = generateOutlookCalendarLink(event, meetLink);
      window.open(url, '_blank');
      break;
    
    case 'apple':
      // For Apple, we generate .ics and trigger download/open
      const icsContent = generateAppleCalendarICS(event, meetLink);
      const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
      const urlObj = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = urlObj;
      link.download = `${event.title.replace(/[^a-z0-9]/gi, '_')}.ics`;
      link.click();
      URL.revokeObjectURL(urlObj);
      break;
  }
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
 * Escape text for ICS format
 */
const escapeICS = (text: string): string => {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '');
};

