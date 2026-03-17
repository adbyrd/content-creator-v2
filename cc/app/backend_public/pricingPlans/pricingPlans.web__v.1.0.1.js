/**
 * Pricing Plans Backend Service
 * Handles retrieval of active subscriptions using modern Wix API standards.
 * v.2.0.0
 */

import { webMethod, Permissions } from 'wix-web-module';
import { orders } from 'wix-pricing-plans-backend';

// Constants
const MODULE_VERSION = '[pricingplans-v2.0.0]';
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 500;

/**
 * Retrieves the active pricing plan orders for the currently logged-in member.
 * No memberId parameter is needed as the API identifies the caller automatically.
 * 
 * @returns {Promise<Array>} Array of active/pending plan orders.
 */
export const getSubscriberPlans = webMethod(
    Permissions.Anyone, 
    async () => {
        // ISSUE #2 FIX: Use native crypto.randomUUID() for tracing
        const requestId = crypto.randomUUID().slice(0, 8);
        const logPrefix = `${MODULE_VERSION} [request:${requestId}]`;

        console.log(`${logPrefix} Fetching orders for current member...`);

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                // ISSUE #1 FIX: Using the orders API to list active/pending plans
                // This replaces the non-existent 'getSubscriberPlans'
                const result = await orders.listCurrentMemberOrders({
                    orderStatuses: ['ACTIVE', 'PENDING']
                });

                const plansArray = result.orders || [];
                console.log(`${logPrefix} Success: Found ${plansArray.length} active plans.`);
                
                return plansArray;

            } catch (error) {
                console.error(`${logPrefix} Attempt ${attempt} failed:`, error.message);

                if (attempt === MAX_RETRIES) {
                    console.error(`${logPrefix} All retries exhausted.`);
                    return []; 
                }

                // Exponential backoff with jitter
                const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1) + Math.random() * 200;
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
);
