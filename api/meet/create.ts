import type { VercelRequest, VercelResponse } from '@vercel/node';
import { google } from 'googleapis';
import { getErrorMessage } from '../../utils/errors';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { title, startTime, endTime } = req.body;

    // Use service account for Meet API (not user's personal account)
    const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY?.replace(/\\n/g, '\n');

    if (!serviceAccountEmail || !serviceAccountKey) {
      console.error('Missing service account credentials');
      return res.status(500).json({ error: 'Meet service not configured' });
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: serviceAccountEmail,
        private_key: serviceAccountKey,
      },
      scopes: ['https://www.googleapis.com/auth/meetings.space.created'],
    });

    const authClient = await auth.getClient();
    const meet = (google as any).meet({ version: 'v2', auth: authClient });

    // Create a new meeting space
    const meeting = await meet.spaces.create({
      requestBody: {
        config: {
          accessType: 'OPEN',
          entryPointAccess: 'CREATOR_APP',
        },
      },
    });

    if (!meeting.data.meetingUri) {
      throw new Error('Failed to create meeting');
    }

    // Extract meeting code from URI (format: https://meet.google.com/xxx-xxxx-xxx)
    const meetLink = meeting.data.meetingUri;
    const meetingCodeMatch = meetLink.match(/meet\.google\.com\/([a-z-]+)/);
    const meetingCode = meetingCodeMatch ? meetingCodeMatch[1] : undefined;

    res.json({
      meetLink,
      meetingCode,
      expiresAt: endTime || undefined,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('Error creating Meet link:', error);

    // Return proper error instead of fake meeting link
    // Fake links break meeting creation and confuse users
    return res.status(500).json({
      error: 'Failed to create meeting',
      message: getErrorMessage(error) || 'Google Meet API error',
      details: process.env.NODE_ENV === 'development' ? errorStack : undefined
    });
  }
}

