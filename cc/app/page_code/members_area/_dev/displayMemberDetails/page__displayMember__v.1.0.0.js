/**
 * DEV MODE
 * Displays both standard and custom member data
 * v.1.0.0
 */

import wixUsers from 'wix-users';
import wixData from 'wix-data';
import wixLocation from 'wix-location';
import { currentMember } from 'wix-members';
import { getSubscriberPlans } from 'backend/pricingplans'; // Ensure this backend function exists

$w.onReady(async function () {
    // 1. Check if user is logged in
    const user = wixUsers.currentUser;
    if (!user.loggedIn) {
        wixLocation.to('/login');
        return;
    }

    // 2. Verify paid membership (using Pricing Plans)
    try {
        const plans = await getSubscriberPlans(user.id);
        if (!plans || plans.length === 0) {
            // Not a paid member – redirect to upgrade page
            wixLocation.to('/upgrade');
            return;
        }
    } catch (error) {
        console.error('Error checking paid status:', error);
        // Optionally show an error message on the page
        $w('#errorMessage').text = 'Unable to verify membership. Please try again later.';
        return;
    }

    // 3. Load member details from the Members API
    await loadMemberDetails();

    // 4. Load custom data from the FullData collection
    await loadFullData(user.id);
});

/**
 * Loads standard member information (name, nickname, profile photo)
 * from the current member's profile.
 */
async function loadMemberDetails() {
    try {
        const member = await currentMember.getMember();

        // Populate text fields
        $w('#firstName').text = member.contactDetails?.firstName || '';
        $w('#lastName').text = member.contactDetails?.lastName || '';
        $w('#nickname').text = member.profile?.nickname || member.loginEmail || '';

        // Profile photo
        if (member.profile?.photo) {
            $w('#profilePhoto').src = member.profile.photo; // direct image URL
        } else {
            $w('#profilePhoto').src = 'default-profile.png'; // fallback image
        }

        // Note: Cover photo is handled in loadFullData (custom field)
    } catch (error) {
        console.error('Error loading member details:', error);
        $w('#errorMessage').text = 'Failed to load member details.';
    }
}

/**
 * Loads custom fields from the FullData collection for the given member ID.
 * @param {string} memberId - The Wix member ID.
 */
async function loadFullData(memberId) {
    try {
        const result = await wixData.query('FullData')
            .eq('memberId', memberId)
            .find();

        if (result.items.length > 0) {
            const data = result.items[0];

            // Company (from custom fields)
            $w('#company').text = data.customfields_contact_company || '';

            // Website URL – displayed as a clickable link
            const website = data.custom_websiteUrl || '';
            $w('#websiteUrl').text = website;
            $w('#websiteUrl').link = website; // assumes element is a link

            // Company description
            $w('#companyDescription').text = data.custom_companyDescription || '';

            // Cover photo (if stored in FullData as an image field)
            if (data.coverPhoto) {
                $w('#coverPhoto').src = data.coverPhoto; // image URL
            } else {
                $w('#coverPhoto').src = 'default-cover.jpg'; // fallback
            }
        } else {
            // No custom record yet – display empty fields
            $w('#company').text = '';
            $w('#websiteUrl').text = '';
            $w('#websiteUrl').link = '';
            $w('#companyDescription').text = '';
            $w('#coverPhoto').src = 'default-cover.jpg';
        }
    } catch (error) {
        console.error('Error loading FullData:', error);
        $w('#errorMessage').text = 'Failed to load custom member data.';
    }
}