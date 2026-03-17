/**
 * Pricing Plans Backend Service
 * Handles retrieval of subscriber plans for members.
 * v.1.0.0
 */

import { webMethod, Permissions } from 'wix-web-module';
import { getSubscriberPlans as wixGetSubscriberPlans } from 'wix-pricing-plans-backend';
import { currentMember } from 'wix-members-backend';
import { v4 as uuidv4 } from 'uuid';  // For request tracing

// Constants
const MODULE_VERSION = '[pricingplans-v1.0.0]';
const MAX_RETRIES = 2;  // Wix backend APIs are reliable, but we'll keep minimal retries
const RETRY_DELAY_MS = 500;

/**
 * Retrieves the pricing plans subscribed to by a member.
 * @param {string} memberId - The Wix member ID.
 * @returns {Promise<Array>} Array of plan objects (empty if none).
 */
export const getSubscriberPlans = webMethod(
  Permissions.Anyone,
  async (memberId) => {
    const requestId = uuidv4().slice(0, 8);
    const logPrefix = `${MODULE_VERSION} [request:${requestId}]`;

    console.log(`${logPrefix} Called with memberId: ${memberId}`);

    // Security: Verify the caller is the same member or an admin (simplified: check current member)
    try {
      const caller = await currentMember.getMember();
      if (!caller) {
        console.error(`${logPrefix} No authenticated member found.`);
        return [];
      }
      if (caller._id !== memberId) {
        console.error(`${logPrefix} Caller member ID (${caller._id}) does not match requested ID (${memberId}).`);
        return [];  // Return empty to avoid leaking data
      }
    } catch (error) {
      console.error(`${logPrefix} Failed to verify caller:`, error);
      return [];
    }

    // Retry loop for the Wix API call
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`${logPrefix} Attempt ${attempt} – fetching subscriber plans for member ${memberId}`);
        
        // Call the Wix Pricing Plans backend API
        const plans = await wixGetSubscriberPlans(memberId);
        
        // Normalise response: ensure it's an array
        const plansArray = Array.isArray(plans) ? plans : (plans ? [plans] : []);
        
        console.log(`${logPrefix} Successfully fetched ${plansArray.length} plans`);
        return plansArray;

      } catch (error) {
        console.error(`${logPrefix} Attempt ${attempt} failed:`, error);
        
        if (attempt === MAX_RETRIES) {
          console.error(`${logPrefix} All retries exhausted. Returning empty array.`);
          return [];  // Fallback to empty array, allowing page to redirect to upgrade
        }
        
        // Exponential backoff with jitter
        const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1) + Math.random() * 200;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
);