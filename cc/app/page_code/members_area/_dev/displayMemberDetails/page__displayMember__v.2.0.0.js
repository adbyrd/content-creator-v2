/**
 * DISPLAY MEMBER DATA
 * Displays both standard and custom member data
 * v.2.0.0
 */

import { currentMember } from 'wix-members-frontend';

$w.onReady(async function () {
    try {
        const member = await currentMember.getMember({ fieldsets: ['FULL'] });

        if (member) {
            displayMemberData(member);
        } else {
            console.warn("User is not logged in.");
            // Optional: $w('#errorMessage').show();
        }
    } catch (err) {
        console.error("Error fetching member data:", err);
    }
});

/**
 * Logic to map data with placeholders for missing values
 */
function displayMemberData(member) {
    const { contactDetails, profile } = member;
    const customFields = contactDetails.customFields || {};

    // Helper function to handle empty/null values
    const getVal = (val, label) => (val && val !== "") ? val : `There is no ${label} on file.`;

    // --- Basic Info ---
    $w('#ccFirstName').text = getVal(contactDetails.firstName, "first name");
    $w('#ccLastName').text = getVal(contactDetails.lastName, "last name");
    $w('#ccNickname').text = getVal(profile.nickname, "nickname");
    $w('#ccSlug').text = getVal(profile.slug, "profile slug");
    $w('#ccLoginEmail').text = getVal(member.loginEmail, "login email");
    $w('#ccStatus').text = getVal(member.status, "account status");

    // --- Contact / Phone ---
    const phone = (contactDetails.phones && contactDetails.phones.length > 0) 
        ? contactDetails.phones[0] 
        : null;
    $w('#ccMainPhone').text = getVal(phone, "phone number");

    // --- Custom Fields (FullData) ---
    // Extracting values from the specific Wix Custom Field Object
    const websiteData = customFields['custom_website-url-qfaybsowbhcaceafwphqxbe']?.value;
    const descriptionData = customFields['custom_company-description-ymeosslafzwyfus']?.value;
    const companyData = customFields['customfields_contact_company']?.value;

    $w('#ccWebsiteUrl').text = getVal(websiteData, "website URL");
    $w('#ccCompanyDescription').text = getVal(descriptionData, "company description");
    $w('#ccCompany').text = getVal(companyData, "company name");

    // --- Image Handling ---
    // Note: Images use .src, so we handle placeholders with a default URL if needed
    const placeholderImg = "https://static.wixstatic.com/media/ae928a_07a0f622d9924c528659556114e91851~mv2.png"; // Standard Wix Placeholder
    
    $w('#ccProfilePhoto').src = profile.profilePhoto?.url || placeholderImg;
    $w('#ccCoverPhoto').src = profile.coverPhoto?.url || placeholderImg;
}