/**
 * MEMBER CHECK FUNCTIONS
 * @version 1.1.2
 * @updated 2026-03-24
 */

import wixData from 'wix-data';
import { Permissions, webMethod } from 'wix-web-module';

/** * Naming Conventions: Constants in UPPER_SNAKE_CASE [cite: 24]
 */
const MODULE_NAME = '[memberFunctions.web-v1.1.2]';
const MEMBERS_COLLECTION = 'Members/PrivateMembersData';

/**
 * Checks if a member exists by email.
 * * 1. Uses webMethod for explicit permission handling[cite: 19, 95].
 * 2. Implements defensive programming by validating input.
 * 3. Returns a structured response with ok status and error details[cite: 118, 119, 131].
 * * @param {string} email
 * @returns {Promise<{ok: boolean, exists: boolean, error?: {message: string, type: string}}>}
 */
export const checkMemberExists = webMethod(Permissions.Anyone, async (email) => {
    // Generate unique request ID for log correlation 
    const requestId = Math.random().toString(36).substring(7);
    const logPrefix = `${MODULE_NAME} [req:${requestId}]`;

    console.log(`${logPrefix} Checking existence for: ${email}`);

    // Defensive check: Basic email validation 
    if (!email || !email.includes('@')) {
        console.warn(`${logPrefix} Validation failed: Invalid email format.`);
        return { 
            ok: false, 
            exists: false, 
            error: { type: 'INVALID_INPUT', message: 'Malformed email address provided' } 
        };
    }

    try {
        /**
         * Querying PrivateMembersData requires suppressAuth because the 
         * visitor is likely not yet logged in[cite: 25].
         */
        const results = await wixData.query(MEMBERS_COLLECTION)
            .eq("loginEmail", email.toLowerCase().trim())
            .find({ "suppressAuth": true });

        const exists = results.items.length > 0;
        
        console.log(`${logPrefix} Query successful. Member found: ${exists}`);

        return { 
            ok: true, 
            exists: exists 
        };

    } catch (error) {
        // Standardized error logging [cite: 29, 33, 127]
        console.error(`${logPrefix} Database query failed:`, error);
        
        return { 
            ok: false, 
            exists: false, 
            error: { 
                type: 'DATABASE_ERROR', 
                message: 'Internal service error during member lookup' 
            } 
        };
    }
});

/**
 * Health Check: Standard pattern to monitor module availability [cite: 134]
 */
export const healthCheck = webMethod(Permissions.Anyone, async () => {
    return { status: 'healthy', version: '1.1.2', timestamp: new Date().toISOString() };
});