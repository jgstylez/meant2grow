/**
 * Flowglad Server Configuration
 * 
 * This module configures the Flowglad server for B2B billing.
 * Customers are Organizations (not individual users).
 * 
 * PCI Compliance: All payment handling is done through Flowglad's
 * hosted checkout and billing portal. We never handle card data directly.
 */

import { FlowgladServer } from '@flowglad/server';

/**
 * Creates a Flowglad server instance with custom authentication.
 * 
 * For B2B: The customer is the Organization, identified by organizationId.
 * The externalId maps to Organization.id in our Firestore database.
 */
export const createFlowgladServer = (organizationId: string, organizationName: string, adminEmail: string) => {
    return new FlowgladServer({
        getRequestingCustomer: async () => {
            // For B2B, the customer is the organization
            return {
                externalId: organizationId,
                name: organizationName,
                email: adminEmail,
            };
        },
    });
};

/**
 * Flowglad API configuration
 */
export const FLOWGLAD_CONFIG = {
    // API base URL
    apiUrl: 'https://app.flowglad.com/api/v1',
    
    // Pricing tiers with Flowglad price IDs
    // These should match the prices configured in your Flowglad dashboard
    pricingTiers: {
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
            // Replace with actual Flowglad price IDs from your dashboard
            monthlyPriceId: process.env.FLOWGLAD_PRICE_STARTER_MONTHLY || 'price_starter_monthly',
            yearlyPriceId: process.env.FLOWGLAD_PRICE_STARTER_YEARLY || 'price_starter_yearly',
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
            monthlyPriceId: process.env.FLOWGLAD_PRICE_PRO_MONTHLY || 'price_pro_monthly',
            yearlyPriceId: process.env.FLOWGLAD_PRICE_PRO_YEARLY || 'price_pro_yearly',
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
            monthlyPriceId: process.env.FLOWGLAD_PRICE_BUSINESS_MONTHLY || 'price_business_monthly',
            yearlyPriceId: process.env.FLOWGLAD_PRICE_BUSINESS_YEARLY || 'price_business_yearly',
        },
        enterprise: {
            name: 'Enterprise',
            description: '1000+ participants',
            monthlyPrice: null, // Custom pricing
            yearlyPrice: null,
            features: [
                'Unlimited participants',
                'Custom integrations',
                'Dedicated support',
                'SLA guarantees',
                'On-premise options',
            ],
            monthlyPriceId: null, // Contact sales
            yearlyPriceId: null,
        },
    },
} as const;

export type PricingTier = keyof typeof FLOWGLAD_CONFIG.pricingTiers;

