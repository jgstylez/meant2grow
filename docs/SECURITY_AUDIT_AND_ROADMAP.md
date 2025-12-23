# Security Audit & Implementation Roadmap

**Date:** December 22, 2025  
**Status:** Comprehensive Security Review  
**Priority:** CRITICAL for Production Deployment

---

## 🔒 EXECUTIVE SUMMARY

This document provides a complete security audit of the Meant2Grow platform and a detailed roadmap for addressing all security concerns before production deployment.

### Current Security Status: 🟡 MODERATE

**Strengths:**
- ✅ Firestore authentication required (basic)
- ✅ Environment variables properly configured
- ✅ Firebase API keys (public by design - OK)
- ✅ Google OAuth client IDs (public by design - OK)
- ✅ Type-safe error handling (44 `any` types eliminated)

**Critical Issues:**
- 🔴 Gemini API calls from client-side (SECURITY RISK)
- 🔴 Mock authentication (not production-ready)
- 🟡 Firestore rules don't enforce roles (client-side only)
- 🟡 No rate limiting on Cloud Functions
- 🟡 No input validation on API endpoints

---

## 🔴 CRITICAL SECURITY ISSUES

### 1. Gemini API Service - Client-Side Exposure

**File:** `services/geminiService.ts`

**Current Issue:**
```typescript
// ❌ SECURITY RISK: API calls from browser
const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const getMatchSuggestions = async (mentee: User, potentialMentors: User[]) => {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    // ... API call from client
  });
};
```

**Why This Is Dangerous:**
1. API key could be exposed in network requests
2. No rate limiting - anyone can spam your API
3. No cost control - malicious users can rack up charges
4. API usage not tracked per user
5. Can't revoke access without redeploying

**Impact:** HIGH - Potential for API abuse and unexpected costs

**Estimated Fix Time:** 2-3 hours

---

### 2. Mock Authentication System

**Files:** Multiple (authentication flow)

**Current Issue:**
- Using localStorage for "authentication"
- No real user verification
- Client-side role checks only
- Anyone can modify localStorage

**Why This Is Dangerous:**
1. No real authentication
2. Users can impersonate others
3. No session management
4. No password security
5. Can't enforce access control

**Impact:** CRITICAL - Complete security bypass

**Estimated Fix Time:** 8-10 hours

---

## 🟡 HIGH PRIORITY SECURITY ISSUES

### 3. Firestore Security Rules - Incomplete

**File:** `firestore.rules`

**Current Status:**
```javascript
// Current: Basic authentication only
function isAuthenticated() {
  return true; // Compatible with mock auth
}

// All authenticated users can access everything
allow read, write: if isAuthenticated();
```

**Missing:**
- Role-based access control
- Field-level security
- Organization isolation enforcement
- Audit logging

**Impact:** MEDIUM - Relies on client-side validation

**Estimated Fix Time:** 2 hours (after Firebase Auth)

---

### 4. No Rate Limiting

**Files:** Cloud Functions

**Current Issue:**
- No rate limiting on any endpoints
- Vulnerable to DDoS attacks
- No cost protection

**Impact:** MEDIUM - Potential for abuse

**Estimated Fix Time:** 2 hours

---

### 5. Incomplete Input Validation

**Files:** Multiple API endpoints

**Current Issue:**
- Limited server-side validation
- Trusting client data
- No sanitization

**Impact:** MEDIUM - Potential for injection attacks

**Estimated Fix Time:** 4 hours

---

## 📋 DETAILED IMPLEMENTATION PLAN

### Phase 1: Gemini API Security (2-3 hours)

#### Step 1.1: Create Cloud Function for Gemini Calls

**Create:** `functions/src/gemini.ts`

```typescript
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { GoogleGenAI } from '@google/genai';
import { defineSecret } from 'firebase-functions/params';

// Secure API key in Firebase Functions config
const geminiApiKey = defineSecret('GEMINI_API_KEY');

export const getMatchSuggestions = onCall(
  { secrets: [geminiApiKey] },
  async (request) => {
    // Verify authentication
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be authenticated');
    }

    // Rate limiting check
    // TODO: Implement rate limiting

    const { mentee, potentialMentors } = request.data;

    // Input validation
    if (!mentee || !potentialMentors) {
      throw new HttpsError('invalid-argument', 'Missing required data');
    }

    const ai = new GoogleGenAI({ apiKey: geminiApiKey.value() });

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `...`, // Same prompt as before
        config: { /* ... */ }
      });

      return { suggestions: JSON.parse(response.text) };
    } catch (error) {
      console.error('Gemini API error:', error);
      throw new HttpsError('internal', 'Failed to get suggestions');
    }
  }
);
```

#### Step 1.2: Update Client to Call Function

**Update:** `services/geminiService.ts`

```typescript
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();

export const getMatchSuggestions = async (
  mentee: User,
  potentialMentors: User[]
): Promise<{ mentorId: string; reason: string; score: number }[]> => {
  try {
    const getMatches = httpsCallable(functions, 'getMatchSuggestions');
    const result = await getMatches({ mentee, potentialMentors });
    return (result.data as any).suggestions || [];
  } catch (error) {
    console.error('Error fetching match suggestions:', error);
    return [];
  }
};
```

#### Step 1.3: Deploy and Test

```bash
# Set secret
firebase functions:secrets:set GEMINI_API_KEY

# Deploy function
firebase deploy --only functions:getMatchSuggestions

# Test from client
# Verify API key not exposed in network tab
```

**Checklist:**
- [ ] Create Cloud Function
- [ ] Set up secret management
- [ ] Update client code
- [ ] Deploy function
- [ ] Test authentication
- [ ] Verify API key not exposed
- [ ] Test rate limiting
- [ ] Update other Gemini functions (getRecommendedResources, breakdownGoal)

---

### Phase 2: Firebase Authentication (8-10 hours)

#### Step 2.1: Enable Firebase Authentication

**Firebase Console:**
1. Go to Authentication section
2. Enable Email/Password provider
3. Enable Google Sign-In provider
4. Configure authorized domains

#### Step 2.2: Update Authentication Component

**Update:** `components/Authentication.tsx`

```typescript
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged
} from 'firebase/auth';

const auth = getAuth();
const googleProvider = new GoogleAuthProvider();

// Replace mock login
const handleLogin = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Get user data from Firestore
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (!userDoc.exists()) {
      throw new Error('User not found in database');
    }

    const userData = userDoc.data() as User;
    // Set user state
    setUserId(user.uid);
    setOrganizationId(userData.organizationId);
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

// Google Sign-In
const handleGoogleSignIn = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    // Handle user data
  } catch (error) {
    console.error('Google sign-in error:', error);
    throw error;
  }
};
```

#### Step 2.3: Update App.tsx with Auth State Listener

**Update:** `App.tsx`

```typescript
import { getAuth, onAuthStateChanged } from 'firebase/auth';

const App: React.FC = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // User is signed in
        setUserId(user.uid);

        // Load user data from Firestore
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data() as User;
          setOrganizationId(userData.organizationId);
        }
      } else {
        // User is signed out
        setUserId(null);
        setOrganizationId(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <LoadingSpinner message="Initializing..." />;
  }

  // Rest of app...
};
```

#### Step 2.4: Update Firestore Security Rules

**Update:** `firestore.rules`

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function getUserData() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data;
    }
    
    function belongsToOrg(organizationId) {
      return isAuthenticated() && getUserData().organizationId == organizationId;
    }
    
    function isOrgAdmin(organizationId) {
      return isAuthenticated() && 
             getUserData().organizationId == organizationId &&
             (getUserData().role == 'ORGANIZATION_ADMIN' || 
              getUserData().role == 'PLATFORM_OPERATOR');
    }
    
    function isPlatformAdmin() {
      return isAuthenticated() && getUserData().role == 'PLATFORM_OPERATOR';
    }
    
    // Organizations
    match /organizations/{orgId} {
      allow create: if isAuthenticated();
      allow read: if belongsToOrg(orgId) || isPlatformAdmin();
      allow update: if isOrgAdmin(orgId) || isPlatformAdmin();
      allow delete: if isPlatformAdmin();
    }
    
    // Users
    match /users/{userId} {
      allow create: if isAuthenticated();
      allow read: if belongsToOrg(resource.data.organizationId) || isPlatformAdmin();
      allow update: if userId == request.auth.uid || 
                       isOrgAdmin(resource.data.organizationId) || 
                       isPlatformAdmin();
      allow delete: if isPlatformAdmin();
    }
    
    // ... (similar patterns for other collections)
  }
}
```

#### Step 2.5: Remove Mock Authentication

**Files to Update:**
- Remove localStorage token management
- Remove mock auth service
- Update all auth checks

**Checklist:**
- [ ] Enable Firebase Auth in console
- [ ] Update Authentication component
- [ ] Add auth state listener
- [ ] Update Firestore rules
- [ ] Remove mock auth code
- [ ] Test email/password signup
- [ ] Test email/password login
- [ ] Test Google Sign-In
- [ ] Test logout
- [ ] Test protected routes
- [ ] Test role-based access

---

### Phase 3: Rate Limiting (2 hours)

#### Step 3.1: Implement Rate Limiting Middleware

**Create:** `functions/src/middleware/rateLimiter.ts`

```typescript
import { Firestore } from 'firebase-admin/firestore';

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export const checkRateLimit = async (
  db: Firestore,
  userId: string,
  endpoint: string,
  config: RateLimitConfig
): Promise<boolean> => {
  const now = Date.now();
  const windowStart = now - config.windowMs;

  const rateLimitRef = db.collection('rateLimits').doc(`${userId}_${endpoint}`);
  const doc = await rateLimitRef.get();

  if (!doc.exists) {
    await rateLimitRef.set({
      requests: [now],
      createdAt: now
    });
    return true;
  }

  const data = doc.data()!;
  const recentRequests = data.requests.filter((time: number) => time > windowStart);

  if (recentRequests.length >= config.maxRequests) {
    return false; // Rate limit exceeded
  }

  await rateLimitRef.update({
    requests: [...recentRequests, now]
  });

  return true;
};
```

#### Step 3.2: Apply to Cloud Functions

```typescript
export const getMatchSuggestions = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be authenticated');
  }

  // Rate limiting: 10 requests per hour
  const allowed = await checkRateLimit(
    db,
    request.auth.uid,
    'getMatchSuggestions',
    { maxRequests: 10, windowMs: 60 * 60 * 1000 }
  );

  if (!allowed) {
    throw new HttpsError('resource-exhausted', 'Rate limit exceeded');
  }

  // ... rest of function
});
```

**Checklist:**
- [ ] Create rate limiting middleware
- [ ] Apply to Gemini functions
- [ ] Apply to other Cloud Functions
- [ ] Test rate limiting
- [ ] Configure appropriate limits
- [ ] Add user feedback for rate limits

---

### Phase 4: Input Validation (4 hours)

#### Step 4.1: Create Validation Schemas

**Create:** `functions/src/validation/schemas.ts`

```typescript
import Joi from 'joi';

export const matchSuggestionSchema = Joi.object({
  mentee: Joi.object({
    id: Joi.string().required(),
    name: Joi.string().required(),
    title: Joi.string().required(),
    // ... other fields
  }).required(),
  potentialMentors: Joi.array().items(
    Joi.object({
      id: Joi.string().required(),
      name: Joi.string().required(),
      // ... other fields
    })
  ).min(1).required()
});

export const createUserSchema = Joi.object({
  email: Joi.string().email().required(),
  name: Joi.string().min(2).max(100).required(),
  role: Joi.string().valid('MENTOR', 'MENTEE', 'ORGANIZATION_ADMIN').required(),
  organizationId: Joi.string().required(),
  // ... other fields
});
```

#### Step 4.2: Apply Validation

```typescript
import { matchSuggestionSchema } from './validation/schemas';

export const getMatchSuggestions = onCall(async (request) => {
  // ... auth and rate limit checks

  // Validate input
  const { error, value } = matchSuggestionSchema.validate(request.data);
  if (error) {
    throw new HttpsError('invalid-argument', error.message);
  }

  // Use validated data
  const { mentee, potentialMentors } = value;

  // ... rest of function
});
```

**Checklist:**
- [ ] Install Joi validation library
- [ ] Create validation schemas
- [ ] Apply to all Cloud Functions
- [ ] Test with invalid data
- [ ] Add sanitization for text inputs
- [ ] Document validation rules

---

## 📊 IMPLEMENTATION TIMELINE

### Week 1: Critical Security Fixes

**Days 1-2: Gemini API Security (2-3 hours)**
- Move Gemini calls to Cloud Functions
- Set up secret management
- Test and deploy

**Days 3-5: Firebase Authentication (8-10 hours)**
- Enable Firebase Auth
- Update authentication flow
- Update Firestore rules
- Remove mock auth
- Comprehensive testing

**Day 6: Rate Limiting (2 hours)**
- Implement rate limiting
- Apply to all functions
- Test limits

**Day 7: Input Validation (4 hours)**
- Create validation schemas
- Apply to all endpoints
- Test validation

### Week 2: Additional Security Enhancements

**Days 8-9: Security Audit**
- Penetration testing
- Code review
- Dependency audit

**Days 10-14: Monitoring & Logging**
- Set up security monitoring
- Configure alerts
- Implement audit logging

---

## 🔍 TESTING CHECKLIST

### Security Testing

- [ ] **Authentication Testing**
  - [ ] Test signup flow
  - [ ] Test login flow
  - [ ] Test logout
  - [ ] Test session expiration
  - [ ] Test password reset
  - [ ] Test Google Sign-In

- [ ] **Authorization Testing**
  - [ ] Test role-based access
  - [ ] Test organization isolation
  - [ ] Test admin privileges
  - [ ] Test unauthorized access attempts

- [ ] **API Security Testing**
  - [ ] Test rate limiting
  - [ ] Test input validation
  - [ ] Test error handling
  - [ ] Test API key security

- [ ] **Firestore Rules Testing**
  - [ ] Test read permissions
  - [ ] Test write permissions
  - [ ] Test delete permissions
  - [ ] Test cross-organization access

### Penetration Testing

- [ ] SQL injection attempts
- [ ] XSS attempts
- [ ] CSRF attempts
- [ ] Session hijacking attempts
- [ ] Privilege escalation attempts

---

## 📈 SECURITY METRICS

### Current Status

| Security Area | Status | Priority |
|---------------|--------|----------|
| **API Key Security** | 🔴 Exposed | CRITICAL |
| **Authentication** | 🔴 Mock | CRITICAL |
| **Authorization** | 🟡 Client-side | HIGH |
| **Rate Limiting** | 🔴 None | HIGH |
| **Input Validation** | 🟡 Partial | MEDIUM |
| **Audit Logging** | 🔴 None | MEDIUM |
| **Encryption** | ✅ Firebase | GOOD |
| **HTTPS** | ✅ Enforced | GOOD |

### Target Status (Production-Ready)

| Security Area | Target | Timeline |
|---------------|--------|----------|
| **API Key Security** | ✅ Server-side | Week 1 |
| **Authentication** | ✅ Firebase Auth | Week 1 |
| **Authorization** | ✅ Firestore Rules | Week 1 |
| **Rate Limiting** | ✅ Implemented | Week 1 |
| **Input Validation** | ✅ Comprehensive | Week 1 |
| **Audit Logging** | ✅ Enabled | Week 2 |
| **Monitoring** | ✅ Active | Week 2 |

---

## 💰 COST IMPLICATIONS

### Current Risks

**Gemini API Abuse:**
- Unlimited API calls from client
- Potential cost: $1000s if abused
- No cost controls

**Firebase Usage:**
- Unlimited reads/writes
- Potential cost: $100s if abused

### After Implementation

**Gemini API:**
- Rate limited: 10 calls/hour/user
- Server-side only
- Cost predictable: ~$50/month

**Firebase:**
- Rate limited
- Proper access control
- Cost predictable: ~$100/month

---

## 🎯 SUCCESS CRITERIA

### Phase 1 Complete When:
- ✅ Gemini API calls server-side only
- ✅ API keys not exposed in client
- ✅ Rate limiting active
- ✅ Tests passing

### Phase 2 Complete When:
- ✅ Real Firebase Authentication
- ✅ Mock auth removed
- ✅ Firestore rules enforcing roles
- ✅ All auth tests passing

### Production-Ready When:
- ✅ All phases complete
- ✅ Security audit passed
- ✅ Penetration testing passed
- ✅ Monitoring active
- ✅ Documentation complete

---

## 📚 RESOURCES

### Documentation
- [Firebase Authentication](https://firebase.google.com/docs/auth)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Cloud Functions Security](https://firebase.google.com/docs/functions/security)
- [Rate Limiting Best Practices](https://cloud.google.com/architecture/rate-limiting-strategies)

### Tools
- [Firebase Emulator Suite](https://firebase.google.com/docs/emulator-suite)
- [Firestore Rules Testing](https://firebase.google.com/docs/firestore/security/test-rules-emulator)
- [OWASP Security Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)

---

**Document Version:** 1.0  
**Last Updated:** December 22, 2025  
**Next Review:** After Phase 1 completion  
**Owner:** Development Team

---

## 🚨 IMMEDIATE ACTION ITEMS

1. **This Week:**
   - [ ] Review this document with team
   - [ ] Prioritize Phase 1 (Gemini API)
   - [ ] Schedule Phase 2 (Firebase Auth)
   - [ ] Set up development environment for testing

2. **Before Production:**
   - [ ] Complete all phases
   - [ ] Pass security audit
   - [ ] Get security sign-off
   - [ ] Document all changes

**DO NOT DEPLOY TO PRODUCTION WITHOUT COMPLETING PHASES 1 & 2!**
