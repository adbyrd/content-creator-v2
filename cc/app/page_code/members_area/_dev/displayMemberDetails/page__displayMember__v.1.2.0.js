/**
 * DEV MODE
 * Displays both standard and custom member data
 * v.1.2.0
 */

import wixLocation from 'wix-location';
import wixData from 'wix-data';
import { authentication, currentMember } from 'wix-members-frontend';
import { getSubscriberPlans } from 'backend/pricingplans.web';

// Constants
const ERROR_MEMBERSHIP = 'Unable to verify membership. Please try again later.';
const ERROR_MEMBER_DETAILS = 'Failed to load member details.';
const ERROR_CUSTOM_DATA = 'Failed to load custom member data.';
const DEFAULT_PROFILE_PHOTO = 'default-profile.png';
const DEFAULT_COVER_PHOTO = 'default-cover.jpg';

$w.onReady(async function () {
    // 1. Check if user is logged in using modern authentication API
    if (!authentication.loggedIn()) {
        wixLocation.to('/login');
        return;
    }

    try {
        // 2. Verify paid membership
        // NOTE: No ID passed; backend now handles member context automatically
        const plans = await getSubscriberPlans();
        
        if (!plans || plans.length === 0) {
            wixLocation.to('/upgrade');
            return;
        }

        // 3. Load Data in Parallel for better performance
        const member = await currentMember.getMember();
        if (member) {
            renderMemberDetails(member);
            await loadFullData(member._id);
        }

    } catch (error) {
        console.error('Initialization Error:', error);
        $w('#errorMessage').text = ERROR_MEMBERSHIP;
    }
});

/**
* Renders standard member information
*/
function renderMemberDetails(member) {
    try {
        $w('#firstName').text = member.contactDetails?.firstName || '';
        $w('#lastName').text = member.contactDetails?.lastName || '';
        $w('#nickname').text = member.profile?.nickname || member.loginEmail || '';

        const profilePhotoUrl = member.profile?.photo?.url;
        $w('#profilePhoto').src = profilePhotoUrl || DEFAULT_PROFILE_PHOTO;
    } catch (error) {
        console.error('Error rendering details:', error);
        $w('#errorMessage').text = ERROR_MEMBER_DETAILS;
    }
}

/**
* Loads custom fields from the FullData collection
*/
async function loadFullData(memberId) {
    try {
        const result = await wixData.query('FullData')
            .eq('memberId', memberId)
            .find();

        if (result.items.length > 0) {
            const data = result.items[0];
            $w('#company').text = data.customfields_contact_company || '';
            $w('#websiteUrl').text = data.custom_websiteUrl || '';
            $w('#websiteUrl').link = data.custom_websiteUrl || '';
            $w('#companyDescription').text = data.custom_companyDescription || '';

            let coverUrl = DEFAULT_COVER_PHOTO;
            if (data.coverPhoto) {
                coverUrl = typeof data.coverPhoto === 'object' ? data.coverPhoto.url : data.coverPhoto;
            }
            $w('#coverPhoto').src = coverUrl;
        } else {
            resetCustomFields();
        }
    } catch (error) {
        console.error('Error loading FullData:', error);
        $w('#errorMessage').text = ERROR_CUSTOM_DATA;
    }
}

function resetCustomFields() {
    $w('#company').text = '';
    $w('#websiteUrl').text = '';
    $w('#websiteUrl').link = '';
    $w('#companyDescription').text = '';
    $w('#coverPhoto').src = DEFAULT_COVER_PHOTO;
}
