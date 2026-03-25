/**
 * PROJECTS
 * 
 * @version 1.0.0
 * @updated 2026-03-24
 */

import wixData from 'wix-data';
import { webMethod, Permissions } from 'wix-web-module';

// Constants
const VERSION_TAG = '[projects-v1.0.0]';
const PROJECTS_COLLECTION = 'Projects';
const MAX_RETRIES = 3;
const RETRYABLE_ERRORS = ['WDE0028', 'WDE0053']; // Wix Data: request timed out / internal error

/**
 * Retrieves projects for the current member with retry logic.
 * @param {Object} options - Query parameters (limit, sort).
 * @returns {Promise<Object>} Structured response { ok, data, status, error }.
 */
export const getProjects = webMethod(Permissions.Anyone, async (options = {}) => {
    const requestId = generateRequestId();
    const { limit = 10, sort = 'projectName' } = options;

    console.log(`${VERSION_TAG} [${requestId}] Fetching projects. Limit: ${limit}, Sort: ${sort}`);

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const results = await wixData.query(PROJECTS_COLLECTION)
                .limit(limit)
                .ascending(sort)
                .find({ suppressAuth: false });

            console.log(`${VERSION_TAG} [${requestId}] Successfully retrieved ${results.items.length} projects.`);

            return {
                ok: true,
                status: 200,
                data: results.items,
                totalCount: results.totalCount
            };

        } catch (err) {
            const isRetryable = RETRYABLE_ERRORS.includes(err.code) || err.message.includes('timeout');
            
            console.error(`${VERSION_TAG} [${requestId}] Attempt ${attempt}/${MAX_RETRIES} failed:`, err.message);

            if (!isRetryable || attempt === MAX_RETRIES) {
                return {
                    ok: false,
                    status: 500,
                    error: {
                        type: 'DATABASE_ERROR',
                        message: 'Unable to retrieve projects at this time.',
                        requestId
                    }
                };
            }

            await delayWithJitter(attempt);
        }
    }
});

// --- Helper Functions ---

/**
 * Generates a unique request ID for log correlation.
 */
function generateRequestId() {
    return Math.random().toString(36).substring(2, 9).toUpperCase();
}

/**
 * Implements exponential backoff with jitter to prevent "thundering herd" issues.
 */
function delayWithJitter(attempt) {
    const baseDelay = Math.pow(2, attempt) * 100;
    const jitter = Math.random() * 50;
    return new Promise(resolve => setTimeout(resolve, baseDelay + jitter));
}

/**
 * Health Check for the Projects service. 
 */
export const projectsHealthCheck = webMethod(Permissions.Anyone, async () => {
    return {
        status: 'healthy',
        version: '1.0.0',
        timestamp: new Date().toISOString()
    };
});