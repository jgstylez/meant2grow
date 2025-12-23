// Google Meet API service for creating video call links
// This will be called from the backend API, not directly from the frontend

export interface MeetLinkResponse {
  meetLink: string;
  meetingCode?: string;
  expiresAt?: string;
}

/**
 * Create a Google Meet link via backend API
 * This ensures we use service account credentials, not user credentials
 */
export const createMeetLink = async (
  eventTitle: string,
  startTime?: string,
  endTime?: string
): Promise<MeetLinkResponse> => {
  try {
    // Use Firebase Cloud Functions URL
    // In production: https://us-central1-meant2grow-dev.cloudfunctions.net/createMeetLink
    // For local development with emulator: http://localhost:5001/meant2grow-dev/us-central1/createMeetLink
    const functionsUrl = import.meta.env.VITE_FUNCTIONS_URL 
      ? `${import.meta.env.VITE_FUNCTIONS_URL}/createMeetLink`
      : (import.meta.env.DEV 
        ? 'http://localhost:5001/meant2grow-dev/us-central1/createMeetLink'
        : 'https://us-central1-meant2grow-dev.cloudfunctions.net/createMeetLink');
    
    const response = await fetch(functionsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('authToken') || ''}`,
      },
      body: JSON.stringify({
        title: eventTitle,
        startTime,
        endTime,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create Meet link');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error creating Meet link:', error);
    throw error;
  }
};

/**
 * Generate a simple Meet link format (for display purposes)
 * Actual Meet links are created via the API
 */
export const formatMeetLink = (meetingCode: string): string => {
  return `https://meet.google.com/${meetingCode}`;
};

