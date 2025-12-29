# Meant2Grow Codebase Analysis for Flowglad Integration

This document provides a comprehensive overview of the Meant2Grow codebase to facilitate Flowglad payments and billing integration.

---

## 1. Framework & Language Detection

### Framework
- **Primary Framework**: React 19.2.1 with Vite 6.2.0 (SPA architecture)
- **Backend**: Vercel Serverless Functions (for API routes) + Firebase Cloud Functions
- **Database**: Firebase Firestore
- **Authentication**: Custom Google OAuth 2.0 integration with Firestore user storage
- **Hosting**: Vercel (with Firebase Functions support)

### Language
- **Language**: TypeScript (~5.8.2)
- **Frontend**: React with TypeScript
- **Backend/API**: TypeScript (Vercel serverless functions)

### Package Manager
- **Package Manager**: npm
- **Dependency File**: `package.json` (project root)

```json
{
  "name": "meant2grow",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "engines": {
    "node": ">=18.0.0"
  },
  "dependencies": {
    "@google-cloud/firestore": "^8.0.0",
    "firebase": "^12.6.0",
    "firebase-admin": "^13.6.0",
    "googleapis": "^168.0.0",
    "react": "^19.2.1",
    "react-dom": "^19.2.1",
    "lucide-react": "^0.556.0",
    "recharts": "^3.5.1",
    "vercel": "^50.0.0"
  }
}
```

---

## 2. File Structure & Paths

### API Routes
- **Location**: `api/`
- **Pattern**: Vercel serverless functions
- **Current routes**:
  - `api/auth/google.ts` - Google OAuth authentication handler
  - `api/meet/create.ts` - Google Meet link creation

### Utility Functions & Shared Code
- **Location**: `utils/`, `services/`
- **Key files**:
  - `utils/errors.ts` - Error handling utilities
  - `utils/htmlUtils.ts` - HTML processing
  - `utils/resourceUtils.ts` - Resource helpers
  - `services/database.ts` - Firestore database operations
  - `services/firebase.ts` - Firebase initialization
  - `services/flowglad.ts` - **Existing mock Flowglad service**
  - `services/googleAuth.ts` - Google authentication

### UI Components
- **Location**: `components/`
- **Key components**:
  - `components/SettingsView.tsx` - Contains billing tab UI
  - `components/Dashboard.tsx` - Main dashboard
  - `components/Authentication.tsx` - Auth flow
  - `components/Layout.tsx` - App shell/navigation
  - `components/LandingPage.tsx` - Public landing page
  - `components/PublicPages.tsx` - Public pages including pricing

### Main Entry Points
- **App Entry**: `index.tsx`
- **Main App Component**: `App.tsx`
- **No traditional server file** - Uses Vite dev server and Vercel serverless for production

### Common Styles
- **Location**: `styles/common.ts`

---

## 3. Authentication System

### Authentication Library/System
- **System**: Custom Google OAuth 2.0 with Firestore user storage
- **No traditional auth library** (like NextAuth, Clerk, etc.)
- **Session Storage**: localStorage-based tokens + Firestore user records

### Server-Side Auth Configuration
- **Location**: `api/auth/google.ts`

Complete API route handler:

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { Role } from '../../types';

// Initialize Firebase Admin (server-side)
if (!getApps().length) {
  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  };

  if (serviceAccount.projectId && serviceAccount.clientEmail && serviceAccount.privateKey) {
    initializeApp({
      credential: cert(serviceAccount as any),
    });
  } else {
    const missingVars: string[] = [];
    if (!serviceAccount.projectId) missingVars.push('FIREBASE_PROJECT_ID');
    if (!serviceAccount.clientEmail) missingVars.push('FIREBASE_CLIENT_EMAIL');
    if (!serviceAccount.privateKey) missingVars.push('FIREBASE_PRIVATE_KEY');
    
    throw new Error(
      `Firebase Admin SDK initialization failed: Missing required environment variables: ${missingVars.join(', ')}`
    );
  }
}

const db = getFirestore();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { googleId, email, name, picture, organizationCode, invitationToken, isNewOrg, orgName, role } = req.body;

    if (!googleId || !email || !name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // ... handles organization creation, user lookup, invitation processing
    // Returns: { user, organizationId, token }
  } catch (error: any) {
    console.error('Auth error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}
```

### Client-Side Auth Configuration
- **Location**: `services/googleAuth.ts`

```typescript
export interface GoogleUser {
  id: string;
  email: string;
  name: string;
  picture: string;
}

export const signInWithGoogle = (): Promise<{ user: GoogleUser; idToken: string }> => {
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
      scope: 'openid https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
      callback: async (tokenResponse: any) => {
        try {
          if (tokenResponse.error) {
            reject(new Error(tokenResponse.error));
            return;
          }

          const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: {
              Authorization: `Bearer ${tokenResponse.access_token}`,
            },
          });

          const userInfo = await userInfoResponse.json();

          if (tokenResponse.id_token) {
            localStorage.setItem('google_id_token', tokenResponse.id_token);
          }

          resolve({
            user: {
              id: userInfo.id,
              email: userInfo.email,
              name: userInfo.name,
              picture: userInfo.picture,
            },
            idToken: tokenResponse.id_token,
          });
        } catch (error) {
          reject(error);
        }
      },
    });

    tokenClient.requestAccessToken();
  });
};
```

### Session Extraction - Server Side

To get the authenticated user on the server, extract from localStorage IDs and query Firestore:

```typescript
// In Vercel API routes - Firebase Admin SDK
import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore();

// Get user by ID from request
async function getUser(userId: string) {
  const userRef = db.collection('users').doc(userId);
  const userSnap = await userRef.get();
  
  if (!userSnap.exists) {
    return null;
  }
  
  return {
    id: userSnap.id,
    ...userSnap.data(),
  };
}

// Get organization by ID
async function getOrganization(organizationId: string) {
  const orgRef = db.collection('organizations').doc(organizationId);
  const orgSnap = await orgRef.get();
  
  if (!orgSnap.exists) {
    return null;
  }
  
  return {
    id: orgSnap.id,
    ...orgSnap.data(),
  };
}
```

### Session Extraction - Client Side

```typescript
// From App.tsx - getting user/org IDs from localStorage
const getInitialAuthState = () => {
  const storedUserId = localStorage.getItem("userId");
  const storedOrgId = localStorage.getItem("organizationId");
  const isAuthenticated = !!(storedUserId && storedOrgId);

  return {
    userId: storedUserId,
    organizationId: storedOrgId,
    publicRoute: isAuthenticated ? ("hidden" as const) : ("landing" as PublicRoute),
    currentPage: isAuthenticated ? "dashboard" : "dashboard",
  };
};

// Using the useOrganizationData hook to get current user
const {
  currentUser,
  organization,
  loading,
  error,
} = useOrganizationData(userId, organizationId);
```

### User Object Structure

```typescript
export interface User {
  id: string;
  organizationId: string; // CRITICAL: Links user to organization
  name: string;
  email: string;
  role: Role; // "ORGANIZATION_ADMIN" | "PLATFORM_ADMIN" | "MENTOR" | "MENTEE"
  avatar: string;
  title: string;
  company: string;
  skills: string[];
  goals?: string[];
  bio: string;
  experience?: string;
  mood?: Mood;
  googleId?: string;
  goalsPublic?: boolean;
  acceptingNewMentees?: boolean;
  maxMentees?: number;
  linkedinUrl?: string;
  createdAt: string;
}
```

---

## 4. Customer Model (B2C vs B2B)

### Model Type: **B2B (Organizations/Teams)**

Meant2Grow is a **B2B SaaS** platform where organizations (companies, schools, non-profits) sign up and manage mentorship programs for their members.

### Customer ID Source

**Organization ID** is the billing entity:
- **Field**: `organization.id`
- **In types**: `Organization.id`

### Organization Structure

```typescript
export interface Organization {
  id: string;
  name: string;
  domain?: string;
  logo: string | null;
  accentColor: string;
  programSettings: ProgramSettings;
  createdAt: string;
  subscriptionTier: "free" | "starter" | "professional" | "business" | "enterprise";
  organizationCode: string;

  // Billing/Subscription fields (Flowglad)
  flowgladCustomerId?: string;
  subscriptionStatus?: 'active' | 'past_due' | 'canceled' | 'trialing' | 'incomplete';
  billingInterval?: 'monthly' | 'yearly';
  trialEnd?: string; // ISO date string - when free trial ends
}
```

### Organization Derivation

The organization is derived from the authenticated user's `organizationId`:

```typescript
// From hooks/useOrganizationData.ts
export const useOrganizationData = (
  userId: string | null,
  organizationId: string | null
): UseOrganizationDataResult => {
  // ...
  const unsubscribeOrg = subscribeToOrganization(organizationId, (org) => {
    setOrganization(org);
    if (org) {
      setProgramSettings(org.programSettings);
    }
  });
  // ...
};

// From services/database.ts
export const getOrganization = async (organizationId: string): Promise<Organization | null> => {
  const orgRef = doc(db, 'organizations', organizationId);
  const orgSnap = await getDoc(orgRef);

  if (!orgSnap.exists()) {
    return null;
  }

  return {
    id: orgSnap.id,
    ...orgSnap.data(),
    createdAt: convertTimestamp(orgSnap.data().createdAt),
  } as Organization;
};
```

---

## 5. Frontend Framework

### Framework Details
- **Framework**: React 19.2.1
- **Build Tool**: Vite 6.2.0
- **Styling**: Tailwind CSS 3.4.19
- **Icons**: Lucide React 0.556.0
- **Charts**: Recharts 3.5.1

### Provider Pattern

There is **no explicit provider pattern** used. The app uses:
- Local React state in `App.tsx`
- Custom hooks for data fetching (`useOrganizationData`, `useToasts`, etc.)
- Prop drilling for most state

### Root Component Structure

**Location**: `index.tsx` and `App.tsx`

```typescript
// index.tsx - Entry point
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';

const root = ReactDOM.createRoot(document.getElementById('root')!);

root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
```

### State Management
- **No Redux, Zustand, or React Query**
- Uses React's built-in `useState` and `useEffect`
- Custom hooks for organized data fetching
- Firestore real-time subscriptions via `onSnapshot`

### Client-Side Auth Hook

There's no dedicated auth hook. Auth state is managed in `App.tsx`:

```typescript
// From App.tsx
const [userId, setUserId] = useState<string | null>(initialAuthState.userId);
const [organizationId, setOrganizationId] = useState<string | null>(
  initialAuthState.organizationId
);

// User data is fetched via useOrganizationData hook
const {
  currentUser: loadedUser,
  organization,
  loading: dataLoading,
  error: dataError,
} = useOrganizationData(userId, organizationId);
```

---

## 6. Route Handler Pattern

### API Route Definition
Vercel serverless functions in the `api/` directory with standard Node.js handler pattern:

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse request body
    const { param1, param2 } = req.body;

    // Validate
    if (!param1 || !param2) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Process and return JSON
    return res.json({
      success: true,
      data: { /* result */ }
    });
  } catch (error: any) {
    console.error('Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message 
    });
  }
}
```

### Complete Example: `api/meet/create.ts`

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { google } from 'googleapis';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { title, startTime, endTime } = req.body;

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

    const meetLink = meeting.data.meetingUri;
    const meetingCodeMatch = meetLink.match(/meet\.google\.com\/([a-z-]+)/);
    const meetingCode = meetingCodeMatch ? meetingCodeMatch[1] : undefined;

    res.json({
      meetLink,
      meetingCode,
      expiresAt: endTime || undefined,
    });
  } catch (error: any) {
    console.error('Error creating Meet link:', error);
    return res.status(500).json({
      error: 'Failed to create meeting',
      message: error.message || 'Google Meet API error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
```

---

## 7. Validation & Error Handling Patterns

### Validation Library
- **No dedicated validation library** (no Zod, Yup, Joi)
- Manual validation with TypeScript types and conditional checks

### Validation Pattern Example

```typescript
// From api/auth/google.ts
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { googleId, email, name, picture, organizationCode, invitationToken, isNewOrg, orgName, role } = req.body;

    // Validation
    if (!googleId || !email || !name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Business logic validation
    if (!invitationToken && !organizationCode && !isNewOrg) {
      return res.status(400).json({ 
        error: 'Either invitationToken, organizationCode, or isNewOrg must be provided' 
      });
    }

    // ... processing
  } catch (error: any) {
    console.error('Auth error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}
```

### Error Handling Pattern

**Location**: `utils/errors.ts`

```typescript
export type AppError = Error | { message: string; code?: string;[key: string]: unknown };

export function isError(error: unknown): error is Error {
    return error instanceof Error;
}

export function hasMessage(error: unknown): error is { message: string } {
    return (
        typeof error === 'object' &&
        error !== null &&
        'message' in error &&
        typeof (error as { message: unknown }).message === 'string'
    );
}

export function getErrorMessage(error: unknown): string {
    if (isError(error)) {
        return error.message;
    }

    if (hasMessage(error)) {
        return error.message;
    }

    if (typeof error === 'string') {
        return error;
    }

    return 'An unknown error occurred';
}

export function getErrorCode(error: unknown): string | undefined {
    if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        typeof (error as { code: unknown }).code === 'string'
    ) {
        return (error as { code: string }).code;
    }

    return undefined;
}

export function formatError(error: unknown): {
    message: string;
    code?: string;
    stack?: string;
    details?: Record<string, unknown>;
} {
    const message = getErrorMessage(error);
    const code = getErrorCode(error);

    const formatted: {
        message: string;
        code?: string;
        stack?: string;
        details?: Record<string, unknown>;
    } = { message };

    if (code) {
        formatted.code = code;
    }

    if (isError(error) && error.stack) {
        formatted.stack = error.stack;
    }

    if (typeof error === 'object' && error !== null) {
        const details: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(error)) {
            if (key !== 'message' && key !== 'code' && key !== 'stack') {
                details[key] = value;
            }
        }
        if (Object.keys(details).length > 0) {
            formatted.details = details;
        }
    }

    return formatted;
}
```

### Error Handling in Components

```typescript
// From App.tsx - using getErrorMessage
import { getErrorMessage } from "./utils/errors";

const handleDeleteNotification = async (id: string) => {
  try {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    await deleteNotification(id);
    addToast("Notification deleted", "info");
  } catch (error: unknown) {
    console.error("Error deleting notification:", error);
    await refreshData();
    addToast(
      getErrorMessage(error) || "Failed to delete notification",
      "error"
    );
  }
};
```

---

## 8. Type System

### TypeScript Configuration
- **Full TypeScript** with strict type checking
- **Location**: `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "types": ["node"],
    "moduleResolution": "bundler",
    "isolatedModules": true,
    "jsx": "react-jsx",
    "paths": {
      "@/*": ["./*"]
    },
    "allowImportingTsExtensions": true,
    "noEmit": true
  }
}
```

### Type Definitions Location
- **Main types**: `types.ts`
- **Onboarding types**: `types/onboarding.ts`

---

## 9. Helper Function Patterns

### Location
- `utils/errors.ts` - Error handling utilities
- `services/database.ts` - Firestore CRUD operations
- `services/flowglad.ts` - Billing helpers (mock)

### Complete Helper Function Examples

**Database Helper - `services/database.ts`:**

```typescript
// Helper function to safely convert Firestore Timestamp to ISO string
const convertTimestamp = (value: any): string => {
  if (!value) {
    return new Date().toISOString();
  }
  if (typeof value === 'string') {
    return value;
  }
  if (value && typeof value.toDate === 'function') {
    return value.toDate().toISOString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return new Date().toISOString();
};

// Organization CRUD
export const createOrganization = async (
  orgData: Omit<Organization, 'id' | 'createdAt' | 'organizationCode'>
): Promise<string> => {
  const orgRef = doc(collection(db, 'organizations'));
  const organizationCode = generateOrganizationCode();

  await setDoc(orgRef, {
    ...orgData,
    organizationCode,
    createdAt: Timestamp.now(),
  });

  return orgRef.id;
};

export const getOrganization = async (organizationId: string): Promise<Organization | null> => {
  const orgRef = doc(db, 'organizations', organizationId);
  const orgSnap = await getDoc(orgRef);

  if (!orgSnap.exists()) {
    return null;
  }

  return {
    id: orgSnap.id,
    ...orgSnap.data(),
    createdAt: convertTimestamp(orgSnap.data().createdAt),
  } as Organization;
};

export const updateOrganization = async (
  organizationId: string, 
  updates: Partial<Organization>
): Promise<void> => {
  const orgRef = doc(db, 'organizations', organizationId);
  await updateDoc(orgRef, updates);
};

// Code generation helper
const generateOrganizationCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};
```

**Toast Hook - `hooks/useToasts.ts`:**

```typescript
import { useState, useCallback } from 'react';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
    id: string;
    message: string;
    type: ToastType;
}

export const useToasts = () => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const addToast = useCallback((message: string, type: ToastType = 'info') => {
        const id = Date.now().toString();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 5000);
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return { toasts, addToast, removeToast };
};
```

### Code Organization Style
- Helpers organized in multiple files by domain (database, auth, billing)
- Consistent function signatures with TypeScript types
- Early returns for error cases
- Async/await pattern for all database operations

---

## 10. Provider Composition Pattern

### Structure
**No traditional provider pattern**. The app uses a single root component with hooks:

```typescript
// index.tsx
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
```

### Complete Root Layout (`App.tsx` structure):

```typescript
const App: React.FC = () => {
  // Auth state
  const [userId, setUserId] = useState<string | null>(initialAuthState.userId);
  const [organizationId, setOrganizationId] = useState<string | null>(
    initialAuthState.organizationId
  );

  // Load organization data from Firestore
  const {
    currentUser: loadedUser,
    users,
    matches,
    goals,
    organization,
    programSettings,
    loading: dataLoading,
    error: dataError,
    refresh: refreshData,
  } = useOrganizationData(userId, organizationId);

  // Toast notifications
  const { toasts, addToast, removeToast } = useToasts();

  // ... handlers and effects

  // Render based on auth state
  if (publicRoute !== "hidden") {
    // Public pages (landing, auth, pricing, etc.)
    return <PublicPages ... />;
  }

  if (dataLoading) {
    return <LoadingSpinner />;
  }

  // Authenticated layout
  return (
    <>
      <Layout
        currentUser={currentUser}
        currentPage={currentPage.split(":")[0]}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
        notifications={notifications}
        toasts={toasts}
        removeToast={removeToast}
        programSettings={programSettings}
      >
        {renderContent()}
      </Layout>
      <PrivacyBanner />
    </>
  );
};
```

---

## 11. Environment Variables

### Environment File
- **Name**: `.env.local` (for local development)
- **Example**: `env.local.example`

### Access Pattern
```typescript
// Vite environment variables (client-side)
import.meta.env.VITE_GOOGLE_CLIENT_ID
import.meta.env.VITE_FIREBASE_API_KEY
import.meta.env.VITE_FIREBASE_PROJECT_ID
import.meta.env.VITE_APP_URL

// Node.js environment variables (server-side in Vercel functions)
process.env.FIREBASE_PROJECT_ID
process.env.FIREBASE_CLIENT_EMAIL
process.env.FIREBASE_PRIVATE_KEY
```

### Current Environment Variables (`env.local.example`):

```bash
# Google OAuth Client ID
VITE_GOOGLE_CLIENT_ID=493534533344-e2mcmbht3802t1fhdmtq9rgrf0ljc1qe.apps.googleusercontent.com

# Firebase Config
VITE_FIREBASE_API_KEY=YOUR_API_KEY_HERE
VITE_FIREBASE_AUTH_DOMAIN=meant2grow-dev.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=meant2grow-dev
VITE_FIREBASE_STORAGE_BUCKET=meant2grow-dev.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=YOUR_SENDER_ID_HERE
VITE_FIREBASE_APP_ID=YOUR_APP_ID_HERE

# Functions URL
VITE_FUNCTIONS_URL=https://us-central1-meant2grow-dev.cloudfunctions.net

# App URL
VITE_APP_URL=http://localhost:5173

# Stripe Configuration (existing placeholder)
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
STRIPE_PRICE_ID_PRO=price_your_pro_price_id_here
STRIPE_PRICE_ID_ENTERPRISE=price_your_enterprise_price_id_here
```

---

## 12. Existing Billing Code

### Mock Billing Service Location
- **File**: `services/flowglad.ts`

### Complete Existing Flowglad Service:

```typescript
import { Organization } from '../types';
import { logger } from './logger';

// Flowglad Configuration
// In a real app, these would come from env vars
// const FLOWGLAD_API_KEY = process.env.FLOWGLAD_API_KEY;
// const FLOWGLAD_API_URL = 'https://api.flowglad.com/api/v1';

interface FlowgladCustomer {
    id: string;
    name: string;
    email: string;
    externalId: string;
}

interface CheckoutSession {
    url: string;
    id: string;
}

/**
 * Creates a customer in Flowglad linked to the organization
 */
export const createCustomer = async (organization: Organization, email: string): Promise<string> => {
    logger.info('Creating Flowglad customer', { organizationId: organization.id });

    // MOCK IMPLEMENTATION:
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve(`cus_mock_${organization.id}`);
        }, 500);
    });
};

/**
 * Creates a checkout session for upgrading subscription
 */
export const createCheckoutSession = async (
    organizationId: string,
    priceSlug: string,
    customerId?: string
): Promise<string> => {
    logger.info('Creating checkout session', { organizationId, priceSlug, customerId });

    // MOCK IMPLEMENTATION:
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve(`${window.location.origin}/settings?tab=billing&status=success&plan=${priceSlug}`);
        }, 800);
    });
};

/**
 * Gets a portal session URL for managing subscription
 */
export const getCustomerPortalUrl = async (organizationId: string): Promise<string> => {
    logger.info('Getting portal URL', { organizationId });

    // MOCK IMPLEMENTATION:
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve('https://flowglad.com/portal/mock-session');
        }, 500);
    });
};

/**
 * Mapping of internal tiers to Flowglad Price Slugs
 */
export const PRICING_TIERS = {
    starter: {
        name: 'Starter',
        monthlyPrice: 29,
        yearlyPrice: 290,
        features: ['Up to 50 users', 'Basic Reporting', 'Email Support'],
        monthlySlug: 'starter-monthly',
        yearlySlug: 'starter-yearly',
    },
    professional: {
        name: 'Professional',
        monthlyPrice: 99,
        yearlyPrice: 990,
        features: ['Up to 200 users', 'Advanced Analytics', 'Priority Support', 'Custom Branding'],
        monthlySlug: 'pro-monthly',
        yearlySlug: 'pro-yearly',
    },
    business: {
        name: 'Business',
        monthlyPrice: 299,
        yearlyPrice: 2990,
        features: ['Unlimited users', 'API Access', 'SSO Integration', 'Dedicated Success Manager'],
        monthlySlug: 'business-monthly',
        yearlySlug: 'business-yearly',
    }
};
```

### Import Pattern

```typescript
// From components/SettingsView.tsx
import { createCheckoutSession, getCustomerPortalUrl, createCustomer, PRICING_TIERS } from '../services/flowglad';
```

### Usage Meter References
**None found** - No usage metering is currently implemented.

### Feature Toggle References
**None found** - No feature toggles are currently implemented.

### Product/Price References

**Price Slugs in `services/flowglad.ts`:**
- `starter-monthly`, `starter-yearly`
- `pro-monthly`, `pro-yearly`
- `business-monthly`, `business-yearly`

**Subscription Tiers in `types.ts`:**
```typescript
subscriptionTier: "free" | "starter" | "professional" | "business" | "enterprise";
```

---

## 13. Component Locations

### Pricing Page/Component
- **Public Pricing Page**: `components/PublicPages.tsx` (case "pricing" section)
- **Billing Settings (Organization Admin Only)**: `components/SettingsView.tsx` (activeTab === 'billing')
  - **Note**: Only Organization Admins (`Role.ADMIN`) have access to billing management
  - Platform Operators, Mentors, and Mentees do NOT see the billing tab

### Navbar/Account Menu Component
- **Location**: `components/Layout.tsx`
- Contains sidebar navigation, user info, notification panel

### Main Dashboard/Home Page Component
- **Location**: `components/Dashboard.tsx`
- Has different views for:
  - Platform Operators (`isPlatformAdmin`)
  - Organization Admins (`isAdmin`)
  - Mentors (`isMentor`)
  - Mentees (default)

### Key Settings Billing UI (`components/SettingsView.tsx`):

```typescript
// Billing tab handler
const handleUpgrade = async (planSlug: string) => {
    if (!organizationId || !organization) return;

    try {
        setIsBillingLoading(true);
        let customerId = organization.flowgladCustomerId;

        if (!customerId) {
            // Lazy create customer
            customerId = await createCustomer(organization, user.email);
            await onUpdateOrganization?.(organizationId, { flowgladCustomerId: customerId });
            setOrganization(prev => prev ? ({ ...prev, flowgladCustomerId: customerId }) : null);
        }

        const checkoutUrl = await createCheckoutSession(organizationId, planSlug, customerId);
        window.location.href = checkoutUrl;
    } catch (error) {
        console.error('Error starting checkout:', error);
        alert('Failed to start checkout session');
        setIsBillingLoading(false);
    }
};

const handleManageSubscription = async () => {
    if (!organizationId || !organization) return;

    try {
        setIsBillingLoading(true);
        let customerId = organization.flowgladCustomerId;

        if (!customerId) {
            customerId = await createCustomer(organization, user.email);
            await onUpdateOrganization?.(organizationId, { flowgladCustomerId: customerId });
            setOrganization(prev => prev ? ({ ...prev, flowgladCustomerId: customerId }) : null);
        }

        const portalUrl = await getCustomerPortalUrl(organizationId);
        window.location.href = portalUrl;
    } catch (error) {
        console.error('Error getting portal URL:', error);
        alert('Failed to open billing portal');
        setIsBillingLoading(false);
    }
};
```

---

## Summary for Flowglad Integration

### Key Integration Points

1. **Customer Creation**: Map `Organization.id` to Flowglad customer `externalId`
2. **Checkout Sessions**: Update `services/flowglad.ts` with real API calls
3. **Webhook Endpoint**: Create `api/flowglad/webhook.ts` to handle subscription events
4. **Organization Updates**: Update `Organization.subscriptionTier`, `subscriptionStatus`, `flowgladCustomerId` on Firestore

### Recommended New Files
- `api/flowglad/webhook.ts` - Webhook handler
- `api/flowglad/checkout.ts` - Checkout session creation (server-side)
- `api/flowglad/portal.ts` - Customer portal session

### Database Fields Already Present
The `Organization` type already includes billing fields:
- `flowgladCustomerId?: string`
- `subscriptionStatus?: 'active' | 'past_due' | 'canceled' | 'trialing' | 'incomplete'`
- `billingInterval?: 'monthly' | 'yearly'`
- `trialEnd?: string`
- `subscriptionTier: "free" | "starter" | "professional" | "business" | "enterprise"`

### UI Already Present
- Billing tab in Settings (`components/SettingsView.tsx`)
- Pricing page (`components/PublicPages.tsx`)
- Upgrade/downgrade modal flows

