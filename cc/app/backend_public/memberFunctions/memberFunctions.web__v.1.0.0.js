/**
 * MEMBER CHECK FUNCTIONS
 * @version 0.0.0
 * @updated 2026-03-24
 */


import wixData from 'wix-data';

/**
 * Checks if a member exists by email.
 * @param {string} email
 * @returns {Promise<boolean>}
 */
export async function checkMemberExists(email) {
    try {
        const results = await wixData.query("Members/PrivateMembersData")
            .eq("loginEmail", email)
            .find({ "suppressAuth": true }); // Required to query this collection

        return results.items.length > 0;
    } catch (error) {
        console.error("Error checking member:", error);
        return false; 
    }
}
