/**
 * BACKEND SERVICE: Pricing Plans
 * v.1.2.3 - Fixed TypeScript 'suppressAuth' signature error
 */
import { webMethod, Permissions } from 'wix-web-module';
import { orders } from 'wix-pricing-plans-backend';
import { currentMember } from 'wix-members-backend'; // Required for ID-based filtering
import crypto from 'crypto';

const MODULE_VERSION = '[pricingPlans-v1.2.3]';
const MAX_RETRIES = 3;

export const getSubscriberPlans = webMethod(
    Permissions.Anyone, 
    async () => {
        const requestId = crypto.randomUUID().slice(0, 8);
        const logPrefix = `${MODULE_VERSION} [req:${requestId}]`;
        
        try {
            // Get current member context in backend
            const member = await currentMember.getMember();
            if (!member) {
                console.warn(`${logPrefix} No member found in context.`);
                return [];
            }

            for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
                try {
                    /**
                     * FIX: Switch to listOrders() to use suppressAuth.
                     * We manually filter by the member's ID to replicate
                     * the behavior of listCurrentMemberOrders().
                     */
                    const result = await orders.listOrders({
                        filter: {
                            memberId: member._id,
                            orderStatuses: ['ACTIVE', 'PENDING']
                        }
                    }, { suppressAuth: true }); // Valid option for listOrders()

                    const activeOrders = result.items || [];
                    console.log(`${logPrefix} Success: Found ${activeOrders.length} plans.`);
                    return activeOrders;

                } catch (error) {
                    if (attempt === MAX_RETRIES) throw error;
                    await delayWithJitter(attempt);
                }
            }
        } catch (error) {
            console.error(`${logPrefix} Critical API Error:`, error.message);
            return [];
        }
    }
);

function delayWithJitter(attempt) {
    const baseDelay = Math.pow(2, attempt) * 100;
    return new Promise(resolve => setTimeout(resolve, baseDelay + (Math.random() * 100)));
}
