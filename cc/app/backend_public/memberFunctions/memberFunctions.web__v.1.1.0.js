/**
 * MEMBER CHECK FUNCTIONS
 * @version 1.1.0
 * @updated 2026-03-24
 */

import wixData from 'wix-data';
import { Permissions, webMethod } from 'wix-web-module';

const MODULE_NAME = '[memberFunctions.web-v1.1.0]';

/**
 * Checks if a member exists by email.
 * @param {string} email
 * @returns {Promise<{ok: boolean, exists: boolean, error?: object}>}
 */
export const checkMemberExists = webMethod(Permissions.Anyone, async (email) => {
    const requestId = Math.random().toString(36).substring(7);
    console.log(`${MODULE_NAME} [req:${requestId}] Checking existence for email.`);

    // Defensive check: Validate input
    if (!email || !email.includes('@')) {
        console.warn(`${MODULE_NAME} [req:${requestId}] Invalid email provided.`);
        return { ok: false, exists: false, error: { type: 'INVALID_INPUT', message: 'Malformed email' } };
    }

    try {
        const results = await wixData.query("Members/PrivateMembersData")
            .eq("loginEmail", email)
            .find({ "suppressAuth": true });

        const exists = results.items.length > 0;
        console.log(`${MODULE_NAME} [req:${requestId}] Result found: ${exists}`);

        return {
            ok: true,
            exists: exists
        };

    } catch (error) {
        console.error(`${MODULE_NAME} [req:${requestId}] Database query failed:`, error);
        return {
            ok: false,
            exists: false,
            error: { type: 'DATABASE_ERROR', message: error.message }
        };
    }
});