// members.web.js (Backend)
import { members } from 'wix-members-backend'; // Most stable for web modules

export async function updateMemberProfile(memberId, payload) {
    try {
        // In the backend, we use the memberId and the update object
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
