/**
 * MEMBER DATA SERVICE
 * Handles CRUD operations for the 'ccMembers' collection.
 * Includes a merge-on-save pattern to prevent data erasure.
 * @version 2.2.2
 * @updated 2026-03-25
 */

import { Permissions, webMethod } from 'wix-web-module';
import wixData from 'wix-data';
import { currentMember } from 'wix-members-backend';

// Constants per CC Standards [cite: 24]
const MEMBERS_COLLECTION = 'ccMembers';
const ERR_AUTH = 'UNAUTHORIZED_ACCESS';
const ERR_NOT_FOUND = 'PROFILE_NOT_FOUND';
const ERR_DB = 'DATABASE_FAILURE';

/**
 * Retrieves the business profile for the currently logged-in member.
 * Implements structured response pattern for frontend error handling [cite: 121-126].
 */
export const getMemberBusinessProfile = webMethod(Permissions.Anyone, async () => {
    const requestId = Date.now().toString(); // Internal correlation ID 
    console.log(`[cc-v2.2.2][${requestId}] Initiating profile retrieval...`);

    try {
        // 1. Authentication Check
        const member = await currentMember.getMember();
        if (!member) {
            console.warn(`[cc-v2.2.2][${requestId}] Retrieval blocked: No member session.`);
            return { 
                ok: false, 
                status: 401, 
                error: { type: ERR_AUTH, message: "User session expired or not found." } 
            };
        }

        // 2. Data Query
        const result = await wixData.query(MEMBERS_COLLECTION)
            .eq('memberId', member._id)
            .find({ suppressAuth: true });

        if (result.items.length > 0) {
            console.log(`[cc-v2.2.2][${requestId}] Profile found for member: ${member._id}`);
            return { 
                ok: true, 
                status: 200, 
                data: result.items[0] 
            };
        }

        // Use Case: Missing profile triggers persistent system error state
        console.warn(`[cc-v2.2.2][${requestId}] System state error: Profile record missing for ${member._id}`);
        return { 
            ok: false, 
            status: 404, 
            error: { type: ERR_NOT_FOUND, message: "Your profile record could not be located. Please contact support." } 
        };

    } catch (error) {
        console.error(`[cc-v2.2.2][${requestId}] Critical Database Error:`, error);
        return { 
            ok: false, 
            status: 500, 
            error: { type: ERR_DB, message: "System is currently unavailable. Please try again later." } 
        };
    }
});

/**
 * Saves or updates a member's business profile using a Merge Pattern.
 * Prevents partial updates from erasing existing fields.
 */
export const saveMemberBusinessProfile = webMethod(Permissions.Anyone, async (data) => {
    const requestId = Date.now().toString();
    console.log(`[cc-v2.2.2][${requestId}] Persistence request received.`);

    try {
        // 1. Validation
        if (!data || typeof data !== 'object') {
            return { ok: false, status: 400, error: { message: "Invalid payload provided." } };
        }

        const member = await currentMember.getMember();
        if (!member) {
            return { ok: false, status: 401, error: { type: ERR_AUTH, message: "Unauthorized save attempt." } };
        }

        // 2. Fetch existing record for merge [cite: 167]
        const queryResult = await wixData.query(MEMBERS_COLLECTION)
            .eq('memberId', member._id)
            .find({ suppressAuth: true });

        let recordToSave = {};

        if (queryResult.items.length > 0) {
            // MERGE PATTERN: Overwrite only provided fields
            const existingRecord = queryResult.items[0];
            recordToSave = { 
                ...existingRecord, 
                ...data,
                memberId: member._id // Enforce identity lock
            };
            console.log(`[cc-v2.2.2][${requestId}] Merging existing record for ${member._id}`);
        } else {
            // INITIAL CREATION
            recordToSave = { 
                ...data, 
                memberId: member._id 
            };
            console.log(`[cc-v2.2.2][${requestId}] Creating initial record for ${member._id}`);
        }

        // 3. Metadata and Persistence
        recordToSave.lastUpdated = new Date();
        const savedRecord = await wixData.save(MEMBERS_COLLECTION, recordToSave, { suppressAuth: true });
        
        return { 
            ok: true, 
            status: 200, 
            data: savedRecord 
        };

    } catch (error) {
        console.error(`[cc-v2.2.2][${requestId}] Persistence Failure:`, error);
        return { 
            ok: false, 
            status: 500, 
            error: { type: ERR_DB, message: "Failed to update profile. Please check your connection." } 
        };
    }
});