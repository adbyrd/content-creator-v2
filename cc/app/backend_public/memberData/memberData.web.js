/**
 * MEMBER DATA SERVICE
 * Handles CRUD operations for member-specific business profiles.
 * @version 1.0.0
 */

import { Permissions, webMethod } from 'wix-web-module';
import wixData from 'wix-data';
import { currentMember } from 'wix-members-backend';

const MEMBERS_COLLECTION = 'ccMembers';

/**
 * Fetches the current member's business profile.
 * @returns {Promise<Object|null>}
 */
export const getMemberBusinessProfile = webMethod(Permissions.Anyone, async () => {
    try {
        const member = await currentMember.getMember();
        if (!member) {
            console.warn('[cc-memberData-v1.0.0] getMemberBusinessProfile: No member logged in');
            return null;
        }
        
        const result = await wixData.query(MEMBERS_COLLECTION)
            .eq('memberId', member._id)
            .find({ suppressAuth: true });
            
        return result.items.length > 0 ? result.items[0] : null;
    } catch (error) {
        console.error('[cc-memberData-v1.0.0] Error fetching profile:', error);
        throw new Error('Failed to retrieve member business profile.');
    }
});

/**
 * Saves or updates the member's business profile.
 * @param {Object} data - The business data to save.
 */
export const saveMemberBusinessProfile = webMethod(Permissions.Anyone, async (data) => {
    try {
        const member = await currentMember.getMember();
        if (!member) throw new Error('Unauthorized: User must be logged in to save settings.');
        
        // Prepare data for upsert
        const record = {
            ...data,
            memberId: member._id,
            lastUpdated: new Date()
        };
        
        // Check for existing record to ensure 1:1 update
        const existing = await wixData.query(MEMBERS_COLLECTION)
            .eq('memberId', member._id)
            .find({ suppressAuth: true });
            
        if (existing.items.length > 0) {
            record._id = existing.items[0]._id;
        }
        
        const saved = await wixData.save(MEMBERS_COLLECTION, record, { suppressAuth: true });
        console.log('[cc-memberData-v1.0.0] Profile saved successfully for member:', member._id);
        return saved;
    } catch (error) {
        console.error('[cc-memberData-v1.0.0] Error saving profile:', error);
        throw new Error('Database error: Unable to save settings.');
    }
});