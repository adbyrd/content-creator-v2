/**
 * COMPANY DETAILS 
 * v.1.2.7 (STABLE) – Updated to populate display fields
 * 
 * Creates a permanent business profile—logo, colors, products, audience, and industry.
 * Content Creator 2.0 
 */

import { currentMember, authentication } from 'wix-members-frontend';
import wixData from 'wix-data';
import wixLocation from 'wix-location-frontend';
import { updateMemberProfile } from 'backend/ccMembers.web';

// -------------------- CONSTANTS --------------------
const VERSION = '[company-details v3.1.1]';
const COMPANY_COLLECTION = 'CompanyProfiles';
const MSG_SAVE_SUCCESS = 'Company details saved successfully.';
const MSG_SAVE_ERROR = 'Failed to save details. Please try again.';
const MSG_LOAD_ERROR = 'Could not load your company details.';
const MSG_LOGIN_REQUIRED = 'You must be logged in to manage company details.';

// Mapping from data keys to display element IDs (static text)
const DISPLAY_MAP = {
    companyName: '#ccDisplayCompanyName',
    websiteUrl: '#ccDisplayCompanyWebsiteURL',
    companyDescription: '#ccDisplayCompanyDescription',
    companyEmail: '#ccDisplayCompanyEmail',
    zipCode: '#ccDisplayCompanyZipCode',
    primaryCategory: '#ccDisplayCompanyBusinessCategory',
    primarySubCategory: '#ccDisplayCompanyBusinessSubCategory',
    customerType: '#ccDisplayCompanyCustomerType',
    preferredPlatform: '#ccDisplaySocialMediaPlatform'
};

// -------------------- MODULE STATE --------------------
let _companyDetails = null;
let _isLoading = false;
let _currentSubmissionId = null;

// -------------------- SAFE UI HELPERS --------------------
/**
 * Safely retrieve a Wix element; returns null if not found.
 */
function safeGetElement(selector) {
    const el = $w(selector);
    return el && el.length ? el : null;
}

/**
 * Safely set the value of an input-like element.
 */
function safeSetValue(selector, value) {
    const el = safeGetElement(selector);
    if (el) {
        el.value = value || '';
    } else {
        console.warn(`Input element not found: ${selector}`);
    }
}

/**
 * Safely get the value of an input-like element.
 */
function safeGetValue(selector) {
    const el = safeGetElement(selector);
    return el ? el.value : '';
}

/**
 * Safely set the text of a text element (e.g., text, heading).
 */
function safeSetText(selector, text) {
    const el = safeGetElement(selector);
    if (el) {
        el.text = text || '';
    } else {
        console.warn(`Text element not found: ${selector}`);
    }
}

/**
 * Display a temporary toast message.
 * Assumes a text element with id #toastMessage exists on the page.
 */
function showToast(message, type = 'success') {
    const toast = $w('#toastMessage');
    if (toast && toast.length) {
        toast.text = message;
        toast.show('fade', { duration: 200 });
        setTimeout(() => toast.hide('fade', { duration: 500 }), 4000);
    } else {
        console.log(`[Toast ${type}]: ${message}`);
    }
}

/**
 * Show an error message next to a field.
 */
function showFieldError(fieldSelector, errorMessage) {
    const errorSelector = fieldSelector.replace('Input', 'Error')
                                       .replace('Dropdown', 'Error')
                                       .replace('TextArea', 'Error');
    const errorEl = safeGetElement(errorSelector);
    if (errorEl) {
        errorEl.text = errorMessage;
        errorEl.show();
    }
}

/**
 * Hide all known field error elements.
 */
function hideAllFieldErrors() {
    const errorSelectors = [
        '#companyNameError', '#emailError', '#zipCodeError',
        '#websiteError', '#categoryError', '#subCategoryError',
        '#descriptionError', '#customerTypeError', '#platformError'
    ];
    errorSelectors.forEach(selector => {
        const el = $w(selector);
        if (el && el.length) el.hide();
    });
}

// -------------------- INITIALIZATION --------------------
$w.onReady(async function () {
    console.log(`${VERSION} Page loaded.`);

    const isLoggedIn = authentication.loggedIn();
    if (!isLoggedIn) {
        showToast(MSG_LOGIN_REQUIRED, 'error');
        const btn = $w('#submitButton');
        if (btn) btn.disable();
        return;
    }

    bootUI();
    await loadCompanyDetails();
    setupEventHandlers();
    hydrateAttributionFromQuery();
});

function bootUI() {
    hideAllFieldErrors();
    const loader = $w('#loadingIndicator');
    if (loader) loader.hide();
}

function setupEventHandlers() {
    const btn = $w('#submitButton');
    if (btn) btn.onClick(() => handleSubmit());
}

// -------------------- DATA LOADING --------------------
async function loadCompanyDetails() {
    if (_isLoading) return;
    _isLoading = true;
    const loader = $w('#loadingIndicator');
    if (loader) loader.show();

    try {
        const member = await currentMember.getMember();
        if (!member) return;

        const custom = member.contactDetails?.customFields || {};

        _companyDetails = {
            companyName: custom['companyName'] || '',
            companyEmail: custom['companyEmail'] || '',
            zipCode: custom['zipCode'] || '',
            websiteUrl: custom['websiteUrl'] || '',
            primaryCategory: custom['primaryCategory'] || '',
            primarySubCategory: custom['primarySubCategory'] || '',
            companyDescription: custom['companyDescription'] || '',
            customerType: custom['customerType'] || '',
            preferredPlatform: custom['preferredPlatform'] || ''
        };

        populateForm(_companyDetails);
        populateDisplayFields(_companyDetails); // <-- NEW: update static display
    } catch (error) {
        console.error(`${VERSION} Load error:`, error);
        showToast(MSG_LOAD_ERROR, 'error');
    } finally {
        _isLoading = false;
        const loader = $w('#loadingIndicator');
        if (loader) loader.hide();
    }
}

function populateForm(data) {
    safeSetValue('#companyNameInput', data.companyName);
    safeSetValue('#emailInput', data.companyEmail);
    safeSetValue('#zipCodeInput', data.zipCode);
    safeSetValue('#websiteInput', data.websiteUrl);
    safeSetValue('#categoryDropdown', data.primaryCategory);
    safeSetValue('#subCategoryDropdown', data.primarySubCategory);
    safeSetValue('#descriptionTextArea', data.companyDescription);
    safeSetValue('#customerTypeDropdown', data.customerType);
    safeSetValue('#platformDropdown', data.preferredPlatform);
}

/**
 * Populate the static display fields (view mode) with the given data.
 */
function populateDisplayFields(data) {
    Object.entries(DISPLAY_MAP).forEach(([key, selector]) => {
        safeSetText(selector, data[key] || '');
    });
}

// -------------------- VALIDATION --------------------
function validateAllFields() {
    hideAllFieldErrors();
    let isValid = true;

    const companyName = safeGetValue('#companyNameInput');
    const email = safeGetValue('#emailInput');

    if (!companyName || companyName.trim() === '') {
        showFieldError('#companyNameInput', 'Company name is required.');
        isValid = false;
    }

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
        showFieldError('#emailInput', 'Valid email is required.');
        isValid = false;
    }

    // Additional validations can be added here

    return isValid;
}

// -------------------- SUBMISSION --------------------
async function handleSubmit() {
    if (_isLoading) return;
    _isLoading = true;
    
    const btn = $w('#submitButton');
    if (btn) btn.disable();

    if (!validateAllFields()) {
        _isLoading = false;
        if (btn) btn.enable();
        return;
    }

    const payload = {
        companyName: safeGetValue('#companyNameInput'),
        companyEmail: safeGetValue('#emailInput'),
        zipCode: safeGetValue('#zipCodeInput'),
        websiteUrl: safeGetValue('#websiteInput'),
        primaryCategory: safeGetValue('#categoryDropdown'),
        primarySubCategory: safeGetValue('#subCategoryDropdown'),
        companyDescription: safeGetValue('#descriptionTextArea'),
        customerType: safeGetValue('#customerTypeDropdown'),
        preferredPlatform: safeGetValue('#platformDropdown')
    };

    try {
        const member = await currentMember.getMember();
        if (!member) throw new Error("No member logged in.");

        await updateMemberProfile(member._id, payload);

        _currentSubmissionId = Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
        await saveToCollection(payload, _currentSubmissionId);

        showToast(MSG_SAVE_SUCCESS, 'success');
        _companyDetails = payload;
        populateDisplayFields(payload); // <-- NEW: update display after save
    } catch (error) {
        console.error(`${VERSION} Save error:`, error);
        showToast(MSG_SAVE_ERROR, 'error');
    } finally {
        _isLoading = false;
        if (btn) btn.enable();
    }
}

/**
 * Save a copy of the data to the CompanyProfiles collection.
 * Updates an existing record for this member, or inserts a new one.
 */
async function saveToCollection(data, submissionId) {
    try {
        const member = await currentMember.getMember();
        const memberId = member._id;

        const existing = await wixData.query(COMPANY_COLLECTION)
            .eq('memberId', memberId)
            .find();

        const item = {
            ...data,
            submissionId,
            memberId,
            lastUpdated: new Date()
        };

        if (existing.items.length > 0) {
            item._id = existing.items[0]._id;
            await wixData.update(COMPANY_COLLECTION, item);
        } else {
            await wixData.insert(COMPANY_COLLECTION, item);
        }
    } catch (error) {
        console.error("Collection backup failed:", error);
    }
}

function hydrateAttributionFromQuery() {
    const query = wixLocation.query;
    if (query.utm_source) {
        console.log(`${VERSION} Attribution:`, query.utm_source);
    }
}