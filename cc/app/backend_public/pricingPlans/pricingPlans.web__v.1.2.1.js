/**
 * Pricing Plans Backend Service
 * Handles retrieval of active subscriptions using modern Wix API standards.
 * v.1.2.1
 */

import { webMethod, Permissions } from 'wix-web-module';
import { orders } from 'wix-pricing-plans-backend';
import crypto from 'crypto'; // FIX #1: Explicit import for Node.js environment

const MODULE_VERSION = '[ pricingPlans-v1.2.1 ]';

export const getSubscriberPlans = webMethod(
    Permissions.Anyone, 
    async () => {
        // FIX: Use the standard Node crypto module
        const requestId = crypto.randomUUID().slice(0, 8);
        const logPrefix = `${MODULE_VERSION} [request:${requestId}]`;

        try {
            // FIX #2: The result IS the array of orders, not an object containing 'orders'
            const activeOrders = await orders.listCurrentMemberOrders({
                orderStatuses: ['ACTIVE', 'PENDING']
            });

            console.log(`${logPrefix} Success: Found ${activeOrders.length} active plans.`);
            return activeOrders; 

        } catch (error) {
            console.error(`${logPrefix} API Error:`, error.message);
            return [];
        }
    }
);
