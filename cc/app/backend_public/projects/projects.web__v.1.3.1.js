/**
 * PROJECT SERVICE
 * Handles backend logic for project data retrieval.
 * @version 1.3.1
 * @updated 2026-03-25
 */

import wixData from 'wix-data';
import { webMethod, Permissions } from 'wix-web-module';

// --- Constants ---
// Logs must include a version prefix (Standard 3.1, 9.1)
const VERSION_TAG = '[projects-v1.2.0]'; 
const PROJECTS_COLLECTION = 'ccProjects';
const MAX_RETRIES = 3;
const RETRYABLE_ERRORS = ['WDE0028', 'WDE0053']; // Timeout and Internal Error codes

/**
 * Retrieves projects for the current member.
 * Implements retry logic and structured error handling (Standard 5.3, 5.4).
 */
export const getProjects = webMethod(Permissions.Anyone, async (options = {}) => {
    // Generate a unique requestId for log correlation (Standard 5.5)
    const requestId = generateRequestId();
    const timestamp = new Date().toISOString();
    
    // Default sort set to 'title' to match Wix Primary Field standards
    const { limit = 10, sort = 'title' } = options;

    // Log key actions with timestamp and requestId (Standard 3.2, 5.5)
    console.log(`${VERSION_TAG} [${timestamp}] [${requestId}] Action: Fetching projects. Limit: ${limit}, Sort: ${sort}`);

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const results = await wixData.query(PROJECTS_COLLECTION)
                .limit(limit)
                .ascending(sort)
                .find({ suppressAuth: false });

            console.log(`${VERSION_TAG} [${requestId}] Success. Found ${results.items.length} items.`);

            // Return a structured response (Standard 5.4, 5.6)
            return {
                ok: true,
                status: 200,
                data: results.items,
                totalCount: results.totalCount
            };

        } catch (err) {
            const isRetryable = RETRYABLE_ERRORS.includes(err.code) || err.message.toLowerCase().includes('timeout');
            console.error(`${VERSION_TAG} [${requestId}] Attempt ${attempt}/${MAX_RETRIES} failed: ${err.message}`);

            if (!isRetryable || attempt === MAX_RETRIES) {
                // Return structured error details (Standard 5.4)
                return {
                    ok: false,
                    status: 500,
                    error: { 
                        type: 'DATABASE_ERROR', 
                        message: err.message, 
                        code: err.code, 
                        requestId 
                    }
                };
            }
            
            // Implement exponential backoff with jitter (Standard 5.3, 6.1)
            await delayWithJitter(attempt);
        }
    }
});

/**
 * Health Check Endpoint
 * Returns service status and version for monitoring (Standard 5.7).
 */
export const healthCheck = webMethod(Permissions.Anyone, async () => {
    return {
        ok: true,
        status: 200,
        version: '1.2.0',
        service: 'Project Service',
        timestamp: new Date().toISOString()
    };
});

// --- Helper Functions ---

/**
 * Generates a unique 7-character alphanumeric request ID.
 */
function generateRequestId() {
    return Math.random().toString(36).substring(2, 9).toUpperCase();
}

/**
 * Delays execution using exponential backoff with random jitter.
 */
function delayWithJitter(attempt) {
    const baseDelay = Math.pow(2, attempt) * 100;
    const jitter = Math.random() * 50;
    return new Promise(resolve => setTimeout(resolve, baseDelay + jitter));
}