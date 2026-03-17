/**
 * BACKEND SERVICE: Pricing Plans
 * Handles retrieval of active subscriptions with robust retry logic.
 * v.1.2.2 - Refactored to Wix Velo Development Standards
 */

import { webMethod, Permissions } from 'wix-web-module';
import { orders } from 'wix-pricing-plans-backend';
import crypto from 'crypto';

// --- Constants (Standard 3.0 & 6.1) ---
const MODULE_VERSION = '[pricingPlans-v1.2.2]';
const MAX_RETRIES = 3;
const RETRYABLE_ERRORS = ['ECONNRESET', 'ETIMEDOUT', 'EADDRINUSE'];

/**
 * Retrieves active or pending orders for the currently logged-in member.
 * @returns {Promise<Array>} List of active orders or empty array on failure.
 */
export const getSubscriberPlans = webMethod(
    Permissions.Anyone, 
    async () => {
        const requestId = crypto.randomUUID().slice(0, 8);
        const logPrefix = `${MODULE_VERSION} [req:${requestId}]`;
        
        console.log(`${logPrefix} Checking membership status...`);

        // Standard 5.3: Implement Retry Logic with Exponential Backoff
        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                /**
                 * FIX: Added { suppressAuth: true }
                 * This ensures the API can read the member's own orders even if 
                 * they don't have "Manage Subscriptions" administrative permissions.
                 */
                const activeOrders = await orders.listCurrentMemberOrders({
                    orderStatuses: ['ACTIVE', 'PENDING']
                }, { suppressAuth: true });

                console.log(`${logPrefix} Success: Found ${activeOrders?.length || 0} plans.`);
                
                // Standard 5.4: Return structured, predictable data
                return activeOrders || [];

            } catch (error) {
                const isLastAttempt = attempt === MAX_RETRIES;
                const canRetry = RETRYABLE_ERRORS.some(err => error.message?.includes(err));

                console.error(`${logPrefix} Attempt ${attempt} failed: ${error.message}`);

                if (isLastAttempt || !canRetry) {
                    // Standard 5.4: Fallback to safe empty state on final failure
                    console.error(`${logPrefix} Critical Failure: Max retries reached or non-retryable error.`);
                    return []; 
                }

                // Standard 6.1: Delay with Jitter
                await delayWithJitter(attempt);
            }
        }
    }
);

/**
 * Standard 6.1: Utility for preventing "Thundering Herd" API hits
 */
function delayWithJitter(attempt) {
    const baseDelay = Math.pow(2, attempt) * 100; // 200ms, 400ms, 800ms
    const jitter = Math.random() * 100;
    return new Promise(resolve => setTimeout(resolve, baseDelay + jitter));
}
