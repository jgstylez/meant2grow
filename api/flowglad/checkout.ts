/**
 * Flowglad Checkout API Route
 * 
 * Creates checkout sessions for plan upgrades.
 * PCI Compliant: Redirects to Flowglad's hosted checkout page.
 * 
 * POST /api/flowglad/checkout
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
        const { 
            organizationId, 
            organizationName, 
            adminEmail, 
            priceId,
            successUrl,
            cancelUrl,
        } = req.body;

        if (!organizationId || !priceId || !successUrl || !cancelUrl) {
            return res.status(400).json({ 
                error: 'Missing required fields: organizationId, priceId, successUrl, cancelUrl' 
            });
        }

        // First, ensure the customer exists (upsert)
        const customerResponse = await fetch(`${FLOWGLAD_API_URL}/customers`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                customer: {
                    externalId: organizationId,
                    name: organizationName || 'Organization',
                    email: adminEmail,
                },
            }),
        });

        if (!customerResponse.ok) {
            const errorData = await customerResponse.json();
            // If customer already exists, that's fine - continue
            if (errorData.code !== 'CUSTOMER_ALREADY_EXISTS') {
                console.error('Failed to create customer:', errorData);
                return res.status(500).json({ error: 'Failed to create customer' });
            }
        }

        // Create checkout session
        const checkoutResponse = await fetch(`${FLOWGLAD_API_URL}/checkout/sessions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                customerExternalId: organizationId,
                priceId,
                successUrl,
                cancelUrl,
                quantity: 1,
            }),
        });

        if (!checkoutResponse.ok) {
            const errorData = await checkoutResponse.json();
            console.error('Failed to create checkout session:', errorData);
            return res.status(500).json({ error: 'Failed to create checkout session' });
        }

        const checkoutData = await checkoutResponse.json();
        
        return res.json({
            checkoutUrl: checkoutData.url,
            sessionId: checkoutData.sessionId,
        });

    } catch (error: any) {
        console.error('Checkout error:', error);
        return res.status(500).json({
            error: 'Internal server error',
            message: error.message,
        });
    }
}

