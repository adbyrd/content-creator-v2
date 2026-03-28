/**
 * PROJECT SERVICE
 * Handles C.R.U.D operations for the Project management system.
 * @version 1.5.0
 * @updated 2026-03-26
 */

import wixData from 'wix-data';
import { webMethod, Permissions } from 'wix-web-module';

const VERSION_TAG = '[projects-v1.5.0]';
const PROJECTS_COLLECTION = 'ccProjects';
const MAX_RETRIES = 3;
const RETRYABLE_ERRORS = ['WDE0028', 'WDE0053'];

export const upsertProject = webMethod(Permissions.Anyone, async (projectData) => {
    const requestId = generateRequestId();
    const timestamp = new Date().toISOString();

    console.log(`${VERSION_TAG} [${timestamp}] [${requestId}] Action: Upserting project: ${projectData.projectName || 'Unknown'}`);

    try {
        if (!projectData || typeof projectData !== 'object') {
            throw new Error("Invalid payload: projectData is required.");
        }

        const requiredFields = ['projectName', 'description', 'goal'];
        for (const field of requiredFields) {
            if (!projectData[field]) {
                throw new Error(`Missing required field: ${field}`);
            }
        }

        const toSave = {
            "title": projectData.projectName,
            "description": projectData.description,
            "goal": projectData.goal,
            "offer": projectData.offer,
            "misconception": projectData.misconception,
            "targetAudience": projectData.targetAudience
        };

        if (projectData.projectId) {
            toSave._id = projectData.projectId;
        }

        let result;
        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                result = await wixData.save(PROJECTS_COLLECTION, toSave);
                break;
            } catch (err) {
                const isRetryable = RETRYABLE_ERRORS.includes(err.code);
                if (!isRetryable || attempt === MAX_RETRIES) throw err;
                
                console.warn(`${VERSION_TAG} [${requestId}] Retry attempt ${attempt} due to ${err.code}`);
                await new Promise(res => setTimeout(res, 200 * attempt));
            }
        }

        console.log(`${VERSION_TAG} [${requestId}] Success. Project ${result._id} saved.`);

        return {
            ok: true,
            status: 200,
            data: result,
            requestId
        };

    } catch (err) {
        console.error(`${VERSION_TAG} [${requestId}] Upsert Failed: ${err.message}`);
        return {
            ok: false,
            status: 500,
            error: {
                type: 'UPSERT_ERROR',
                message: err.message,
                requestId
            }
        };
    }
});

export const getProjects = webMethod(Permissions.Anyone, async (options = {}) => {
    const requestId = generateRequestId();
    const { limit = 10, sort = 'title' } = options;

    try {
        const results = await wixData.query(PROJECTS_COLLECTION)
            .limit(limit)
            .ascending(sort)
            .find();

        return {
            ok: true,
            status: 200,
            data: results.items,
            totalCount: results.totalCount,
            requestId
        };
    } catch (err) {
        return {
            ok: false,
            status: 500,
            error: { type: 'DATABASE_ERROR', message: err.message, requestId }
        };
    }
});

export const healthCheck = webMethod(Permissions.Anyone, async () => {
    return {
        ok: true,
        status: 200,
        version: '1.5.0',
        timestamp: new Date().toISOString()
    };
});

// --- Helper Functions ---

function generateRequestId() {
    return Math.random().toString(36).substring(2, 9).toUpperCase();
}