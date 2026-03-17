/**
 * BACKEND SERVICE: Pricing Plans
 * Handles retrieval of active subscriptions using V1 API Standards.
 * v.1.2.4 - Fixed Type errors and API Signature mismatches
 */

import { webMethod, Permissions } from 'wix-web-module';
import { orders } from 'wix-pricing-plans-backend';
import crypto from 'crypto';

// --- Constants (Standard 3.0) ---
const MODULE_VERSION = '[pricingPlans-v1.2.4]';
const MAX_RETRIES = 3;

/**
 * Standard 5.3: Fetch with Retries and Jitter
 */
export const getSubscriberPlans = webMethod(
    Permissions.Anyone,
    async () => {
        const requestId = crypto.randomUUID().slice(0, 8);
        const logPrefix = `${MODULE_VERSION} [req:${requestId}]`;

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                /**
                 * FIX #1: listCurrentMemberOrders returns the Array directly.
                 * FIX #2: It does NOT support 'suppressAuth' or 'filter'.
                 * We use the direct FilterOptions object allowed by the V1 API.
                 */
                const activeOrders = await orders.listCurrentMemberOrders({
                    orderStatuses: ['ACTIVE', 'PENDING']
                });

                console.log(`${logPrefix} Success: Found ${activeOrders.length} active plans.`);
                
                // Standard 5.4: Return structured response
                return activeOrders;

            } catch (error) {
                const isLastAttempt = attempt === MAX_RETRIES;
                
                // Standard 3.3: Prefix console logs with module version
                console.error(`${logPrefix} Attempt ${attempt} Failed:`, error.message);

                if (isLastAttempt) {
                    return []; // Return empty array to trigger frontend fallback
                }

                // Standard 6.1: Delay with jitter
                await delayWithJitter(attempt);
            }
        }
    }
);

function delayWithJitter(attempt) {
    const baseDelay = Math.pow(2, attempt) * 100;
    const jitter = Math.random() * 100;
    return new Promise(resolve => setTimeout(resolve, baseDelay + jitter));
}
