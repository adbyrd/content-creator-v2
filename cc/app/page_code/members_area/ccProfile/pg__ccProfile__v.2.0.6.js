/**
 * DISPLAY MEMBER DATA & BUSINESS SETTINGS
 * Version 2.0.6 (Refactored)
 * Logic for Category, Sub Category, and Customer Type integration.
 */

import { currentMember } from 'wix-members-frontend';
import wixLocation from 'wix-location';
import { getTaxonomy } from 'backend/categoryService.web';
import { getMemberBusinessProfile, saveMemberBusinessProfile } from 'backend/memberData.web';

// --- Constants & Options ---
const CUSTOMER_BASE_OPTIONS = [
    { label: 'Select your customer base...', value: '', disabled: true },
    { label: 'B2C (Business-to-Consumer)', value: 'b2c-business-to-consumer' },
    { label: 'B2B (Business-to-Business)', value: 'b2b-business-to-business' },
    { label: 'B2B2C (Business-to-Business-to-Consumer)', value: 'b2b2c-business-to-business-to-consumer' },
    { label: 'B2G / Government', value: 'b2g-government' },
    { label: 'Non-Profit / NGO / Charities', value: 'non-profit-ngo-charities' },
    { label: 'Internal / Employees', value: 'internal-employees' },
    { label: 'Mixed / Hybrid (B2B & B2C)', value: 'mixed-hybrid-b2b-b2c' }
];

const MSG_LOAD_ERROR = "An unexpected error occurred while loading your profile.";
const DEFAULT_AVATAR = "https://static.wixstatic.com/media/155164_1f5df41ae90741139acb1148f2b4f864~mv2.png";

let _taxonomyCache = null;

$w.onReady(async function () {
    console.log('[cc-v2.0.6] Initializing Refactored Profile Page...');
    
    try {
        bootUI();
        const member = await currentMember.getMember({ fieldsets: ['FULL'] });
        if (!member) return wixLocation.to('/login');

        // Parallel Hydration
        await Promise.all([
            hydrateStandardMemberData(member),
            initBusinessCategorySection()
        ]);

    } catch (error) {
        console.error('[cc-v2.0.6] Initialization Error:', error);
        showError(MSG_LOAD_ERROR);
    }
});

/**
 * Handles the Business Category, Sub Category, and Customer Type logic
 */
async function initBusinessCategorySection() {
    // 1. Setup UI elements
    $w('#ccCustomerBase').options = CUSTOMER_BASE_OPTIONS;

    // 2. Load Taxonomy (Categories/Subcategories)
    const taxonomy = await getTaxonomy();
    if (taxonomy && taxonomy.parentOptions) {
        _taxonomyCache = taxonomy;
        $w('#ccBusinessCategory').options = [{ label: 'Select a category...', value: '', disabled: true }, ...taxonomy.parentOptions];
    }

    // 3. Load Saved Business Profile
    const profile = await getMemberBusinessProfile();
    if (profile) {
        // Hydrate Form
        $w('#ccBusinessCategory').value = profile.businessCategory;
        updateSubCategoryDropdown(profile.businessCategory);
        $w('#ccBusinessSubCategory').value = profile.businessSubCategory;
        $w('#ccCustomerBase').value = profile.customerType;

        // Hydrate Static Display
        $w('#txtDisplayCategory').text = humanizeSlug(profile.businessCategory);
        $w('#txtDisplaySubCategory').text = humanizeSlug(profile.businessSubCategory);
        $w('#txtDisplayCustomerType').text = humanizeSlug(profile.customerType);
    }

    wireEventHandlers();
}

function wireEventHandlers() {
    // Cascading dropdown logic
    $w('#ccBusinessCategory').onChange((event) => {
        updateSubCategoryDropdown(event.target.value);
    });

    // Save Logic
    $w('#btnSaveBusinessSettings').onClick(async () => {
        if (validateBusinessForm()) {
            $w('#ccSubmitStack').show(); // Show loading overlay
            
            const dataToSave = {
                businessCategory: $w('#ccBusinessCategory').value,
                businessSubCategory: $w('#ccBusinessSubCategory').value,
                customerType: $w('#ccCustomerBase').value
            };

            try {
                await saveMemberBusinessProfile(dataToSave);
                // Reload page to display static values as requested
                wixLocation.to(wixLocation.url); 
            } catch (err) {
                $w('#ccSubmitStack').hide();
                showError("Could not save settings. Please try again.");
            }
        }
    });
}

function updateSubCategoryDropdown(parentSlug) {
    if (!_taxonomyCache || !parentSlug) return;
    const children = _taxonomyCache.childrenByParent[parentSlug] || [];
    $w('#ccBusinessSubCategory').options = [{ label: 'Select a sub-category...', value: '', disabled: true }, ...children];
    $w('#ccBusinessSubCategory').enable();
}

function validateBusinessForm() {
    const isCategoryValid = $w('#ccBusinessCategory').valid;
    const isSubCategoryValid = $w('#ccBusinessSubCategory').valid;
    const isCustomerValid = $w('#ccCustomerBase').valid;

    if (!isCategoryValid || !isSubCategoryValid || !isCustomerValid) {
        showError("Please fill out all required fields.");
        return false;
    }
    return true;
}

/**
 * Helper to make slugs look like professional titles
 */
function humanizeSlug(slug) {
    if (!slug) return "Not set";
    return slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

// --- Standard UI Helpers ---
function bootUI() {
    $w('#ccBusinessSubCategory').disable();
    if ($w('#ccSubmitStack')) $w('#ccSubmitStack').hide();
}

async function hydrateStandardMemberData(member) {
    const profile = member.contactDetails;
    $w('#ccCompany').text = profile.company || "Company not set";
    $w('#ccProfilePhoto').src = member.profile?.profilePhoto?.url || DEFAULT_AVATAR;
}

function showError(msg) {
    $w('#ccGeneralError').text = msg;
    $w('#ccGeneralError').show();
}