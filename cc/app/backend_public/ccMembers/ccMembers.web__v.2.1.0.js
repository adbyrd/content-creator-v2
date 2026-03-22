/**
 * MEMBER DATA SERVICE
 * Handles CRUD for 'ccMembers' collection.
 * @version 2.1.0
 */

import { Permissions, webMethod } from 'wix-web-module';
import wixData from 'wix-data';
import { currentMember } from 'wix-members-backend';

const MEMBERS_COLLECTION = 'ccMembers';

/**
 * Retrieves the current member's business profile record.
 */
export const getMemberBusinessProfile = webMethod(Permissions.Anyone, async () => {
    try {
        const member = await currentMember.getMember();
        if (!member) return null;
        
        const result = await wixData.query(MEMBERS_COLLECTION)
            .eq('memberId', member._id)
            .find({ suppressAuth: true });
            
        return result.items.length > 0 ? result.items[0] : null;
    } catch (error) {
        console.error('[cc-memberData-v1.1.0] getMemberBusinessProfile Error:', error);
        throw new Error('Database retrieval failed.');
    }
});

/**
 * Saves/Updates the member business profile.
 * Upsert logic based on memberId.
 */
export const saveMemberBusinessProfile = webMethod(Permissions.Anyone, async (data) => {
    try {
        const member = await currentMember.getMember();
        if (!member) throw new Error('Unauthorized');
        
        const existing = await wixData.query(MEMBERS_COLLECTION)
            .eq('memberId', member._id)
            .find({ suppressAuth: true });

        const record = {
            ...data,
            memberId: member._id,
            lastUpdated: new Date()
        };

        if (existing.items.length > 0) {
            record._id = existing.items[0]._id;
        }

        return await wixData.save(MEMBERS_COLLECTION, record, { suppressAuth: true });
    } catch (error) {
        console.error('[cc-memberData-v1.1.0] saveMemberBusinessProfile Error:', error);
        throw new Error('Database save failed.');
    }
});