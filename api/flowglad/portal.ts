/**
 * Flowglad Billing Portal API Route
 * 
 * Gets the billing portal URL for managing subscriptions and payment methods.
 * PCI Compliant: Redirects to Flowglad's hosted billing portal.
 * 
 * POST /api/flowglad/portal
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

const FLOWGLAD_API_URL = 'https://app.flowglad.com/api/v1';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const apiKey = process.env.FLOWGLAD_SECRET_KEY;
    if (!apiKey) {
        console.error('FLOWGLAD_SECRET_KEY not configured');
        return res.status(500).json({ error: 'Billing service not configured' });
    }

    try {
        const { organizationId } = req.body;

        if (!organizationId) {
            return res.status(400).json({ error: 'Missing required field: organizationId' });
        }

        // Get billing details which includes the portal URL
        const billingResponse = await fetch(
            `${FLOWGLAD_API_URL}/customers/${organizationId}/billing`,
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!billingResponse.ok) {
            const errorData = await billingResponse.json();
            console.error('Failed to get billing details:', errorData);
            
            // If customer doesn't exist, return a helpful message
            if (billingResponse.status === 404) {
                return res.status(404).json({ 
                    error: 'No billing account found',
                    message: 'Please subscribe to a plan first',
                });
            }
            
            return res.status(500).json({ error: 'Failed to get billing portal' });
        }

        const billingData = await billingResponse.json();
        
        return res.json({
            portalUrl: billingData.billingPortalUrl,
            subscriptions: billingData.currentSubscriptions,
            invoices: billingData.invoices,
            paymentMethods: billingData.paymentMethods?.map((pm: any) => ({
                id: pm.id,
                type: pm.type,
                brand: pm.card?.brand,
                last4: pm.card?.last4,
                expMonth: pm.card?.expMonth,
                expYear: pm.card?.expYear,
            })),
        });

    } catch (error: any) {
        console.error('Portal error:', error);
        return res.status(500).json({
            error: 'Internal server error',
            message: error.message,
        });
    }
}

