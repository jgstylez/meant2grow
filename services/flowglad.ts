/**
 * Flowglad Client Service
 * 
 * Client-side service for Flowglad billing integration.
 * All payment handling is done through Flowglad's hosted pages for PCI compliance.
 * 
 * This service calls our API routes which securely communicate with Flowglad.
 */

import { Organization } from '../types';

/**
 * Billing data returned from the portal API
 */
export interface BillingData {
    portalUrl: string | null;
    subscriptions: Array<{
        id: string;
        status: string;
        priceId: string;
        currentBillingPeriodEnd: number | null;
    }>;
    invoices: Array<{
        invoice: {
            id: string;
            invoiceNumber: string;
            invoiceDate: number;
            status: string;
            pdfURL: string | null;
        };
    }>;
    paymentMethods: Array<{
        id: string;
        type: string;
        brand: string | null;
        last4: string | null;
        expMonth: number | null;
        expYear: number | null;
    }>;
}

/**
 * Creates a checkout session for upgrading subscription
 * Redirects to Flowglad's hosted checkout page (PCI compliant)
 */
export const createCheckoutSession = async (
    organizationId: string,
    priceId: string,
    organizationName?: string,
    adminEmail?: string
): Promise<string> => {
    const response = await fetch('/api/flowglad/checkout', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            organizationId,
            organizationName,
            adminEmail,
            priceId,
            successUrl: `${window.location.origin}/settings?tab=billing&checkout=success`,
            cancelUrl: `${window.location.origin}/settings?tab=billing&checkout=canceled`,
        }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create checkout session');
    }

    const data = await response.json();
    return data.checkoutUrl;
};

/**
 * Gets billing portal URL and billing data
 * Redirects to Flowglad's hosted billing portal (PCI compliant)
 */
export const getBillingData = async (organizationId: string): Promise<BillingData> => {
    const response = await fetch('/api/flowglad/portal', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ organizationId }),
    });

    if (!response.ok) {
        const error = await response.json();
        
        // If no billing account exists yet, return empty data
        if (response.status === 404) {
            return {
                portalUrl: null,
                subscriptions: [],
                invoices: [],
                paymentMethods: [],
            };
        }
        
        throw new Error(error.message || 'Failed to get billing data');
    }

    return response.json();
};

/**
 * Opens the Flowglad billing portal in a new window
 * All payment method management happens in Flowglad's hosted UI (PCI compliant)
 */
export const openBillingPortal = async (organizationId: string): Promise<void> => {
    const data = await getBillingData(organizationId);
    
    if (data.portalUrl) {
        window.location.href = data.portalUrl;
    } else {
        throw new Error('No billing portal available. Please subscribe to a plan first.');
    }
};

/**
 * Legacy function for backwards compatibility
 * @deprecated Use createCheckoutSession instead
 */
export const createCustomer = async (organization: Organization, email: string): Promise<string> => {
    // Customer creation is now handled automatically during checkout
    // Return the organization ID as a placeholder
    return organization.id;
};

/**
 * Legacy function for backwards compatibility  
 * @deprecated Use openBillingPortal instead
 */
export const getCustomerPortalUrl = async (organizationId: string): Promise<string> => {
    const data = await getBillingData(organizationId);
    return data.portalUrl || '';
};

/**
 * Pricing tiers configuration
 * Price IDs should match those configured in your Flowglad dashboard
 */
export const PRICING_TIERS = {
    starter: {
        name: 'Starter',
        description: '1-99 participants',
        monthlyPrice: 99,
        yearlyPrice: 990,
        features: [
            'Up to 99 participants',
            'Basic mentorship matching',
            'Goal tracking',
            'Email support',
        ],
        // These should be replaced with actual Flowglad price IDs from your dashboard
        monthlyPriceId: 'price_starter_monthly',
        yearlyPriceId: 'price_starter_yearly',
        // Legacy slugs for backwards compatibility
        monthlySlug: 'price_starter_monthly',
        yearlySlug: 'price_starter_yearly',
    },
    professional: {
        name: 'Professional',
        description: '100-399 participants',
        monthlyPrice: 199,
        yearlyPrice: 1990,
        features: [
            'Up to 399 participants',
            'Advanced analytics',
            'Priority support',
            'Custom branding',
            'Calendar integration',
        ],
        monthlyPriceId: 'price_pro_monthly',
        yearlyPriceId: 'price_pro_yearly',
        monthlySlug: 'price_pro_monthly',
        yearlySlug: 'price_pro_yearly',
    },
    business: {
        name: 'Business',
        description: '400-999 participants',
        monthlyPrice: 299,
        yearlyPrice: 2990,
        features: [
            'Up to 999 participants',
            'API access',
            'SSO integration',
            'Dedicated success manager',
            'Advanced reporting',
        ],
        monthlyPriceId: 'price_business_monthly',
        yearlyPriceId: 'price_business_yearly',
        monthlySlug: 'price_business_monthly',
        yearlySlug: 'price_business_yearly',
    },
    enterprise: {
        name: 'Enterprise',
        description: '1000+ participants',
        monthlyPrice: null,
        yearlyPrice: null,
        features: [
            'Unlimited participants',
            'Custom integrations',
            'Dedicated support',
            'SLA guarantees',
            'On-premise options',
        ],
        monthlyPriceId: null,
        yearlyPriceId: null,
        monthlySlug: null,
        yearlySlug: null,
    },
} as const;

export type PricingTierKey = keyof typeof PRICING_TIERS;
