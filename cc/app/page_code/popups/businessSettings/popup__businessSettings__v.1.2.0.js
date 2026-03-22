/**
 * LIGHTBOX: Business Settings Popup
 * @version 1.2.0
 */

import wixWindowFrontend from 'wix-window-frontend';
import { getTaxonomy } from 'backend/categoryService.web';
import { saveMemberBusinessProfile } from 'backend/ccMembers.web';

// Standardized Customer Base Options
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

let _taxonomyCache = null;

$w.onReady(async function () {
    console.log('[cc-popup-v1.2.0] Initializing Business Settings...');
    
    // 1. Get existing data passed from the Profile Page
    const context = wixWindowFrontend.lightbox.getContext();
    
    // 2. Setup UI & Load Data
    bootUI(context);
    await loadTaxonomyData(context);

    // 3. Event Handlers
    $w('#ccBusinessCategory').onChange((e) => {
        updateSubCategoryDropdown(e.target.value);
    });

    $w('#btnCancel').onClick(() => {
        wixWindowFrontend.lightbox.close(false);
    });

    $w('#btnSave').onClick(async () => {
        await handleSave();
    });
});

/**
 * Initializes the dropdowns and pre-fills values from context
 */
function bootUI(context) {
    $w('#ccCustomerBase').options = CUSTOMER_BASE_OPTIONS;
    
    if (context?.customerType) {
        $w('#ccCustomerBase').value = context.customerType;
    }
}

/**
 * Fetches the taxonomy from the backend and populates Primary Category
 */
async function loadTaxonomyData(context) {
    try {
        _taxonomyCache = await getTaxonomy();
        
        if (_taxonomyCache) {
            $w('#ccBusinessCategory').options = [
                { label: 'Select a category...', value: '', disabled: true }, 
                ..._taxonomyCache.parentOptions
            ];

            // If existing data exists, set values and trigger sub-category load
            if (context?.businessCategory) {
                $w('#ccBusinessCategory').value = context.businessCategory;
                updateSubCategoryDropdown(context.businessCategory, context.businessSubCategory);
            }
        }
    } catch (err) {
        console.error('[cc-popup-v1.2.0] Taxonomy load failed:', err);
    }
}

/**
 * Filters the Sub-Category dropdown based on Primary Category selection
 */
function updateSubCategoryDropdown(parentSlug, existingSubValue = '') {
    if (!_taxonomyCache || !parentSlug) return;

    const children = _taxonomyCache.childrenByParent[parentSlug] || [];
    
    $w('#ccBusinessSubCategory').options = [
        { label: 'Select a sub-category...', value: '', disabled: true }, 
        ...children
    ];
    
    $w('#ccBusinessSubCategory').enable();

    if (existingSubValue) {
        $w('#ccBusinessSubCategory').value = existingSubValue;
    } else {
        $w('#ccBusinessSubCategory').value = '';
    }
}

/**
 * Validates and persists the data
 */
async function handleSave() {
    if (!validateForm()) return;

    $w('#btnSave').disable();
    $w('#btnSave').label = "Saving...";

    const payload = {
        businessCategory: $w('#ccBusinessCategory').value,
        businessSubCategory: $w('#ccBusinessSubCategory').value,
        customerType: $w('#ccCustomerBase').value
    };

    try {
        // Backend handles the merge with Company Details automatically
        await saveMemberBusinessProfile(payload);
        console.log('[cc-popup-v1.2.0] Business settings saved successfully.');
        wixWindowFrontend.lightbox.close(true); 
    } catch (error) {
        console.error('[cc-popup-v1.2.0] Save failed:', error);
        $w('#btnSave').enable();
        $w('#btnSave').label = "Save Settings";
        // Optionally trigger a toast or error message here
    }
}

function validateForm() {
    let isValid = true;
    const fields = ['#ccBusinessCategory', '#ccBusinessSubCategory', '#ccCustomerBase'];
    
    fields.forEach(selector => {
        if (!$w(selector).valid) {
            isValid = false;
            // Visual feedback for invalid fields (Wix validation UI)
        }
    });
    
    return isValid;
}