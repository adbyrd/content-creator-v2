/**
 * DEV MODE
 * Displays both standard and custom member data
 * v.1.0.1
 */

import wixUsers from 'wix-users';
import wixData from 'wix-data';
import wixLocation from 'wix-location';
import { currentMember } from 'wix-members';
import { getSubscriberPlans } from 'backend/pricingplans';

// Constants for user-facing messages
const ERROR_MEMBERSHIP = 'Unable to verify membership. Please try again later.';
const ERROR_MEMBER_DETAILS = 'Failed to load member details.';
const ERROR_CUSTOM_DATA = 'Failed to load custom member data.';

// Fallback images (replace with your actual asset names)
const DEFAULT_PROFILE_PHOTO = 'default-profile.png';
const DEFAULT_COVER_PHOTO = 'default-cover.jpg';

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
        $w('#errorMessage').text = ERROR_MEMBERSHIP;
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

        // Profile photo – `photo` is an object with `url` property
        const profilePhotoUrl = member.profile?.photo?.url;
        $w('#profilePhoto').src = profilePhotoUrl || DEFAULT_PROFILE_PHOTO;

        // Note: Cover photo is handled in loadFullData (custom field)
    } catch (error) {
        console.error('Error loading member details:', error);
        $w('#errorMessage').text = ERROR_MEMBER_DETAILS;
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

            // Website URL – displayed as a clickable link (text element supports .link)
            const website = data.custom_websiteUrl || '';
            $w('#websiteUrl').text = website;
            $w('#websiteUrl').link = website;  // Valid for text elements in Velo

            // Company description
            $w('#companyDescription').text = data.custom_companyDescription || '';

            // Cover photo – assumes stored as an image URL or object with url
            let coverUrl = DEFAULT_COVER_PHOTO;
            if (data.coverPhoto) {
                // If coverPhoto is an image object, use its url; otherwise treat as string
                coverUrl = typeof data.coverPhoto === 'object' ? data.coverPhoto.url : data.coverPhoto;
            }
            $w('#coverPhoto').src = coverUrl;
        } else {
            // No custom record yet – display empty fields
            $w('#company').text = '';
            $w('#websiteUrl').text = '';
            $w('#websiteUrl').link = '';
            $w('#companyDescription').text = '';
            $w('#coverPhoto').src = DEFAULT_COVER_PHOTO;
        }
    } catch (error) {
        console.error('Error loading FullData:', error);
        $w('#errorMessage').text = ERROR_CUSTOM_DATA;
    }
}