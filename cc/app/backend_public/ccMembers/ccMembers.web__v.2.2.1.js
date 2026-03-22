/**
 * MEMBER DATA SERVICE
 * Handles CRUD operations for the 'ccMembers' collection.
 * Includes a merge-on-save pattern to prevent data erasure between popups.
 * * @version 1.2.0
 * @updated 2026-03-21
 */

import { Permissions, webMethod } from 'wix-web-module';
import wixData from 'wix-data';
import { currentMember } from 'wix-members-backend';

const MEMBERS_COLLECTION = 'ccMembers';

/**
 * Retrieves the business profile for the currently logged-in member.
 * @returns {Promise<Object|null>} The member's business record or null if not found.
 */
export const getMemberBusinessProfile = webMethod(Permissions.Anyone, async () => {
    try {
        const member = await currentMember.getMember();
        if (!member) {
            console.warn('[cc-memberData-v1.2.0] getMemberBusinessProfile: No member session found.');
            return null;
        }

        const result = await wixData.query(MEMBERS_COLLECTION)
            .eq('memberId', member._id)
            .find({ suppressAuth: true });

        if (result.items.length > 0) {
            return result.items[0];
        }

        console.info(`[cc-memberData-v1.2.0] No record found for member: ${member._id}`);
        return null;

    } catch (error) {
        console.error('[cc-memberData-v1.2.0] getMemberBusinessProfile Error:', error);
        throw new Error('Database retrieval failed. Please try again later.');
    }
});

/**
 * Saves or updates a member's business profile using a Merge Pattern.
 * This prevents partial updates from erasing existing fields (Issue 001).
 * * @param {Object} data - The partial or full dataset to be saved.
 * @returns {Promise<Object>} The saved record.
 */
export const saveMemberBusinessProfile = webMethod(Permissions.Anyone, async (data) => {
    try {
        // 1. Authentication Check
        const member = await currentMember.getMember();
        if (!member) {
            throw new Error('Unauthorized: You must be logged in to save profile data.');
        }

        // 2. Look for existing record to perform a merge
        const queryResult = await wixData.query(MEMBERS_COLLECTION)
            .eq('memberId', member._id)
            .find({ suppressAuth: true });

        let recordToSave = {};

        if (queryResult.items.length > 0) {
            // MERGE LOGIC: 
            // We spread the existing record first, then overwrite with the new incoming data.
            // This ensures fields not present in 'data' (like company details when saving categories) are kept.
            const existingRecord = queryResult.items[0];
            recordToSave = { 
                ...existingRecord, 
                ...data,
                memberId: member._id // Ensure Member ID remains locked
            };
            console.log(`[cc-memberData-v1.2.0] Updating existing record for member: ${member._id}`);
        } else {
            // NEW RECORD LOGIC:
            recordToSave = { 
                ...data, 
                memberId: member._id 
            };
            console.log(`[cc-memberData-v1.2.0] Creating new record for member: ${member._id}`);
        }

        // 3. Metadata updates
        recordToSave.lastUpdated = new Date();

        // 4. Persistence
        const savedRecord = await wixData.save(MEMBERS_COLLECTION, recordToSave, { suppressAuth: true });
        
        return savedRecord;

    } catch (error) {
        console.error('[cc-memberData-v1.2.0] saveMemberBusinessProfile Error:', error);
        // Throwing a generic error to the frontend for security, while logging specifics above
        throw new Error('Failed to save business profile. Please verify your connection.');
    }
});