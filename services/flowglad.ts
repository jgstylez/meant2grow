import { Organization } from '../types';
import { logger } from './logger';

// Flowglad Configuration
// In a real app, these would come from env vars
// const FLOWGLAD_API_KEY = process.env.FLOWGLAD_API_KEY;
// const FLOWGLAD_API_URL = 'https://api.flowglad.com/api/v1';

// Mocked response types based on Flowglad docs
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

    // REAL IMPLEMENTATION:
    /*
    const response = await fetch(`${FLOWGLAD_API_URL}/customers`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FLOWGLAD_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: organization.name,
        email: email,
        externalId: organization.id,
      }),
    });
    const data = await response.json();
    return data.id;
    */

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

    // REAL IMPLEMENTATION:
    /*
    const response = await fetch(`${FLOWGLAD_API_URL}/checkout-sessions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FLOWGLAD_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customerExternalId: organizationId, // Link by external ID
        items: [{ priceSlug: priceSlug, quantity: 1 }],
        successUrl: `${window.location.origin}/dashboard?billing=success`,
        cancelUrl: `${window.location.origin}/dashboard?billing=cancel`,
      }),
    });
    const data = await response.json();
    return data.url;
    */

    // MOCK IMPLEMENTATION:
    return new Promise((resolve) => {
        setTimeout(() => {
            // Return a dummy URL that just redirects back to the app with a success param
            // In a real integration, this would be the Flowglad hosted checkout URL
            // We simulate a successful checkout after a short delay
            resolve(`${window.location.origin}/settings?tab=billing&status=success&plan=${priceSlug}`);
        }, 800);
    });
};

/**
 * Gets a portal session URL for managing subscription
 */
export const getCustomerPortalUrl = async (organizationId: string): Promise<string> => {
    logger.info('Getting portal URL', { organizationId });

    // REAL IMPLEMENTATION:
    /*
    // Flowglad might have a dedicated endpoint for portal sessions or it's handled via the dashboard links
    // For now, we'll assume a standard pattern
    */

    // MOCK IMPLEMENTATION:
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve('https://flowglad.com/portal/mock-session');
        }, 500);
    });
};

/**
 * Mapping of internal tiers to Flowglad Price Slugs
 * You would configure these in your Flowglad dashboard
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
