/**
 * PROJECT SERVICE
 * @version 1.3.0
 * @updated 2026-03-26
 */

import wixData from 'wix-data';
import { webMethod, Permissions } from 'wix-web-module';
import { currentUser } from 'wix-auth';

// Constants
const VERSION_TAG = '[projects-v1.3.0]';
const PROJECTS_COLLECTION = 'ccProjects';
const MAX_RETRIES = 3;
const RETRYABLE_ERRORS = ['WDE0028', 'WDE0053']; 

export const getProjects = webMethod(Permissions.Anyone, async (options = {}) => {
    const requestId = generateRequestId();
    const { limit = 10, sort = 'title' } = options;
    const memberId = currentUser.id; 

    if (!memberId) {
        console.error(`${VERSION_TAG} [${requestId}] Unauthorized access attempt. No member logged in.`);
        return {
            ok: false,
            status: 401,
            error: { type: 'AUTH_ERROR', message: 'User must be logged in to view projects.' }
        };
    }

    console.log(`${VERSION_TAG} [${requestId}] Fetching projects for Member: ${memberId}`);

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const results = await wixData.query(PROJECTS_COLLECTION)
                .eq('_owner', memberId)
                .limit(limit)
                .ascending(sort)
                .find({ suppressAuth: false });

            console.log(`${VERSION_TAG} [${requestId}] Success. Found ${results.items.length} items for owner.`);

            return {
                ok: true,
                status: 200,
                data: results.items,
                totalCount: results.totalCount
            };

        } catch (err) {
            const isRetryable = RETRYABLE_ERRORS.includes(err.code) || err.message.includes('timeout');
            console.error(`${VERSION_TAG} [${requestId}] Attempt ${attempt}/${MAX_RETRIES} failed: ${err.message}`);

            if (!isRetryable || attempt === MAX_RETRIES) {
                return {
                    ok: false,
                    status: 500,
                    error: { 
                        type: 'DATABASE_ERROR', 
                        message: 'Internal server error while retrieving projects.', 
                        requestId 
                    }
                };
            }
            await delayWithJitter(attempt);
        }
    }
});

// --- Helper Functions (Defensive Programming) ---

/**
 * Generates a unique ID for request tracking - Standard 3.1
 */
function generateRequestId() {
    return Math.random().toString(36).substring(2, 9).toUpperCase();
}

/**
 * Implements exponential backoff to handle transient database errors - Standard 4.6
 */
function delayWithJitter(attempt) {
    const baseDelay = Math.pow(2, attempt) * 100;
    const jitter = Math.random() * 50;
    return new Promise(resolve => setTimeout(resolve, baseDelay + jitter));
}