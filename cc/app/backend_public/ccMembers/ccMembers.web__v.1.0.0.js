// members.jsw (Backend)
import { members } from 'wix-members-v2';

export async function updateMemberProfile(memberId, payload) {
    try {
        // Use the V2 updateMember method which supports custom fields
        const updatedMember = await members.updateMember(memberId, {
            contactDetails: {
                customFields: payload
            }
        });
        return { success: true, member: updatedMember };
    } catch (error) {
        console.error("Backend update failed:", error);
        return { success: false, error: error.message };
    }
}
