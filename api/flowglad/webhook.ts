/**
 * Flowglad Webhook Handler
 * 
 * Handles subscription lifecycle events from Flowglad.
 * Updates organization subscription status in Firestore.
 * 
 * POST /api/flowglad/webhook
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import crypto from 'crypto';

// Initialize Firebase Admin
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
    }
}

const db = getFirestore();

// Map Flowglad price IDs to our subscription tiers
const PRICE_TO_TIER: Record<string, string> = {
    // Monthly prices
    [process.env.FLOWGLAD_PRICE_STARTER_MONTHLY || 'price_starter_monthly']: 'starter',
    [process.env.FLOWGLAD_PRICE_PRO_MONTHLY || 'price_pro_monthly']: 'professional',
    [process.env.FLOWGLAD_PRICE_BUSINESS_MONTHLY || 'price_business_monthly']: 'business',
    // Yearly prices
    [process.env.FLOWGLAD_PRICE_STARTER_YEARLY || 'price_starter_yearly']: 'starter',
    [process.env.FLOWGLAD_PRICE_PRO_YEARLY || 'price_pro_yearly']: 'professional',
    [process.env.FLOWGLAD_PRICE_BUSINESS_YEARLY || 'price_business_yearly']: 'business',
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Verify webhook signature (Flowglad uses Svix-style signatures)
    const webhookSecret = process.env.FLOWGLAD_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
        console.error('FLOWGLAD_WEBHOOK_SECRET not configured');
        return res.status(500).json({ error: 'Webhook secret not configured' });
    }

    // Flowglad/Svix sends signature in x-flowglad-signature or svix-signature header
    const signature = req.headers['x-flowglad-signature'] || 
                     req.headers['svix-signature'] ||
                     req.headers['x-svix-signature'];
    
    if (!signature) {
        console.error('Missing webhook signature header');
        return res.status(401).json({ error: 'Missing signature' });
    }

    // Verify signature using Svix format (v1,timestamp,signature)
    // Note: Vercel automatically parses JSON, so we reconstruct the raw body
    // For production, consider using Vercel's rawBody feature or middleware to capture raw body
    try {
        const signatureString = Array.isArray(signature) ? signature[0] : signature;
        const rawBody = JSON.stringify(req.body);
        
        // Parse Svix signature format: "v1,timestamp1,signature1 v1,timestamp2,signature2"
        // Svix sends multiple signatures for redundancy, we verify at least one matches
        const signatures = signatureString.split(' ');
        let isValid = false;
        
        for (const sigEntry of signatures) {
            const parts = sigEntry.split(',');
            if (parts.length === 3 && parts[0] === 'v1') {
                const [, timestamp, receivedSig] = parts;
                
                // Verify timestamp is within 5 minutes (prevent replay attacks)
                const eventTimestamp = parseInt(timestamp);
                const currentTimestamp = Math.floor(Date.now() / 1000);
                const tolerance = 300; // 5 minutes
                
                if (Math.abs(currentTimestamp - eventTimestamp) > tolerance) {
                    console.warn(`Webhook signature timestamp expired: ${eventTimestamp}, current: ${currentTimestamp}`);
                    continue; // Try next signature
                }
                
                // Verify signature: HMAC-SHA256 of "timestamp.rawBody"
                const signedPayload = `${timestamp}.${rawBody}`;
                const expectedSig = crypto
                    .createHmac('sha256', webhookSecret)
                    .update(signedPayload)
                    .digest('base64');
                
                // Use constant-time comparison to prevent timing attacks
                if (crypto.timingSafeEqual(
                    Buffer.from(receivedSig),
                    Buffer.from(expectedSig)
                )) {
                    isValid = true;
                    break;
                }
            }
        }
        
        if (!isValid) {
            console.error('Invalid webhook signature - no valid signatures found');
            return res.status(401).json({ error: 'Invalid signature' });
        }
        
        // Signature verified successfully
        console.log('Webhook signature verified successfully');
    } catch (verifyError: unknown) {
        console.error('Signature verification error:', verifyError);
        return res.status(401).json({ error: 'Signature verification failed' });
    }

    try {
        const event = req.body;
        const eventType = event.type;
        
        console.log('Flowglad webhook received:', eventType);

        switch (eventType) {
            case 'subscription.created':
            case 'subscription.updated':
            case 'subscription.activated': {
                const subscription = event.data.subscription;
                const customerId = subscription.customerId;
                
                // Get organization by Flowglad customer ID or external ID
                const orgsRef = db.collection('organizations');
                const orgQuery = await orgsRef
                    .where('flowgladCustomerId', '==', customerId)
                    .limit(1)
                    .get();

                let orgDoc = orgQuery.docs[0];
                
                // If not found by flowgladCustomerId, try external ID (which is our org ID)
                if (!orgDoc && event.data.customer?.externalId) {
                    const directOrgRef = db.collection('organizations').doc(event.data.customer.externalId);
                    const directOrgDoc = await directOrgRef.get();
                    if (directOrgDoc.exists) {
                        orgDoc = directOrgDoc as any;
                    }
                }

                if (!orgDoc) {
                    console.error('Organization not found for customer:', customerId);
                    return res.status(404).json({ error: 'Organization not found' });
                }

                // Determine tier from price ID
                const priceId = subscription.priceId;
                const tier = PRICE_TO_TIER[priceId] || 'starter';
                
                // Determine billing interval
                const interval = subscription.interval === 'year' ? 'yearly' : 'monthly';

                // Update organization
                await db.collection('organizations').doc(orgDoc.id).update({
                    subscriptionTier: tier,
                    subscriptionStatus: subscription.status,
                    billingInterval: interval,
                    flowgladCustomerId: customerId,
                    flowgladSubscriptionId: subscription.id,
                    trialEnd: subscription.trialEnd 
                        ? new Date(subscription.trialEnd).toISOString() 
                        : null,
                });

                console.log(`Updated organization ${orgDoc.id} to tier: ${tier}, status: ${subscription.status}`);
                break;
            }

            case 'subscription.canceled':
            case 'subscription.expired': {
                const subscription = event.data.subscription;
                const customerId = subscription.customerId;
                
                const orgsRef = db.collection('organizations');
                const orgQuery = await orgsRef
                    .where('flowgladCustomerId', '==', customerId)
                    .limit(1)
                    .get();

                if (orgQuery.empty) {
                    console.error('Organization not found for customer:', customerId);
                    return res.status(404).json({ error: 'Organization not found' });
                }

                const orgDoc = orgQuery.docs[0];

                // Downgrade to free tier
                await db.collection('organizations').doc(orgDoc.id).update({
                    subscriptionTier: 'free',
                    subscriptionStatus: subscription.status,
                });

                console.log(`Downgraded organization ${orgDoc.id} to free tier`);
                break;
            }

            case 'customer.created': {
                const customer = event.data.customer;
                const externalId = customer.externalId;
                
                if (externalId) {
                    // Update organization with Flowglad customer ID
                    await db.collection('organizations').doc(externalId).update({
                        flowgladCustomerId: customer.id,
                    });
                    console.log(`Linked Flowglad customer ${customer.id} to organization ${externalId}`);
                }
                break;
            }

            case 'invoice.paid':
            case 'invoice.payment_failed': {
                // Log invoice events for debugging
                console.log('Invoice event:', eventType, event.data);
                break;
            }

            default:
                console.log('Unhandled webhook event:', eventType);
        }

        return res.json({ received: true });

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Webhook error:', error);
        return res.status(500).json({
            error: 'Webhook processing failed',
            message: errorMessage,
        });
    }
}

