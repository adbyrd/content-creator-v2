/**
 * PROJECT SERVICE
 * Handles backend logic for project data retrieval.
 * @version 1.3.1
 * @updated 2026-03-25
 */

import wixData from 'wix-data';
import { webMethod, Permissions } from 'wix-web-module';

const VERSION_TAG = '[projects-v1.3.1]'; 
const PROJECTS_COLLECTION = 'ccProjects';
const MAX_RETRIES = 3;
const RETRYABLE_ERRORS = ['WDE0028', 'WDE0053'];

export const getProjects = webMethod(Permissions.Anyone, async (options = {}) => {
    const requestId = generateRequestId();
    const timestamp = new Date().toISOString();
    const { limit = 10, sort = 'title' } = options;

    console.log(`${VERSION_TAG} [${timestamp}] [${requestId}] Action: Fetching projects. Limit: ${limit}, Sort: ${sort}`);

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const results = await wixData.query(PROJECTS_COLLECTION)
                .limit(limit)
                .ascending(sort)
                .find({ suppressAuth: false });

            console.log(`${VERSION_TAG} [${requestId}] Success. Found ${results.items.length} items.`);

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
        
            await delayWithJitter(attempt);
        }
    }
});

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

function generateRequestId() {
    return Math.random().toString(36).substring(2, 9).toUpperCase();
}

function delayWithJitter(attempt) {
    const baseDelay = Math.pow(2, attempt) * 100;
    const jitter = Math.random() * 50;
    return new Promise(resolve => setTimeout(resolve, baseDelay + jitter));
}