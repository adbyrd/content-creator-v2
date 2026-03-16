import { currentMember, authentication } from 'wix-members-frontend';
import wixData from 'wix-data';
import wixLocation from 'wix-location-frontend';

// -------------------- CONSTANTS --------------------
const VERSION = '[company-details v3.0.0]';
const COMPANY_COLLECTION = 'CompanyProfiles';
const MSG_SAVE_SUCCESS = 'Company details saved successfully.';
const MSG_SAVE_ERROR = 'Failed to save details. Please try again.';
const MSG_LOAD_ERROR = 'Could not load your company details.';
const MSG_LOGIN_REQUIRED = 'You must be logged in to manage company details.';

// -------------------- MODULE STATE --------------------
let _companyDetails = null;
let _isLoading = false;
let _currentSubmissionId = null;

// -------------------- SAFE UI HELPERS --------------------
function safeGetElement(selector) {
    const el = $w(selector);
    return el ? el : null;
}

function safeSetValue(selector, value) {
    const el = safeGetElement(selector);
    if (el) el.value = value || '';
}

// Ensure you have a text element named #toastMessage on your page
function showToast(message, type = 'success') {
    const toast = $w('#toastMessage');
    if (toast) {
        toast.text = message;
        toast.show('fade', { duration: 200 });
        setTimeout(() => toast.hide('fade', { duration: 500 }), 4000);
    } else {
        console.log(`[Toast ${type}]: ${message}`);
    }
}

function showFieldError(fieldSelector, errorMessage) {
    const errorElementSelector = fieldSelector.replace('Input', 'Error').replace('Dropdown', 'Error').replace('TextArea', 'Error');
    const errorEl = safeGetElement(errorElementSelector);
    if (errorEl) {
        errorEl.text = errorMessage;
        errorEl.show();
    }
}

function hideAllFieldErrors() {
    const errorSelectors = [
        '#companyNameError', '#emailError', '#zipCodeError',
        '#websiteError', '#categoryError', '#subCategoryError',
        '#descriptionError', '#customerTypeError', '#platformError'
    ];
    errorSelectors.forEach(selector => {
        const el = $w(selector);
        if (el) el.hide();
    });
}

// -------------------- INITIALIZATION --------------------
$w.onReady(async function () {
    console.log(`${VERSION} Page loaded.`);
    
    // FIX #1: Use authentication.loggedIn() instead of currentMember.loggedIn
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
        
        // FIX #2: Use bracket notation to avoid "Property does not exist on type 'object'"
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

// -------------------- VALIDATION --------------------
function validateAllFields() {
    hideAllFieldErrors();
    let isValid = true;

    const companyName = $w('#companyNameInput').value;
    const email = $w('#emailInput').value;

    if (!companyName || companyName.trim() === '') {
        showFieldError('#companyNameInput', 'Company name is required.');
        isValid = false;
    }

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
        showFieldError('#emailInput', 'Valid email is required.');
        isValid = false;
    }

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
        companyName: $w('#companyNameInput').value,
        companyEmail: $w('#emailInput').value,
        zipCode: $w('#zipCodeInput').value,
        websiteUrl: $w('#websiteInput').value,
        primaryCategory: $w('#categoryDropdown').value,
        primarySubCategory: $w('#subCategoryDropdown').value,
        companyDescription: $w('#descriptionTextArea').value,
        customerType: $w('#customerTypeDropdown').value,
        preferredPlatform: $w('#platformDropdown').value
    };

    _currentSubmissionId = Math.random().toString(36).substring(2, 15) + Date.now().toString(36);

    try {
        // FIX #3: Use updateMember() with the correct nested contactDetails structure
        await currentMember.updateMember({
            contactDetails: {
                customFields: payload
            }
        });

        // Backup to collection
        await saveToCollection(payload, _currentSubmissionId);

        showToast(MSG_SAVE_SUCCESS, 'success');
        _companyDetails = payload;
    } catch (error) {
        console.error(`${VERSION} Save error:`, error);
        showToast(MSG_SAVE_ERROR, 'error');
    } finally {
        _isLoading = false;
        if (btn) btn.enable();
    }
}

async function saveToCollection(data, submissionId) {
    try {
        const member = await currentMember.getMember();
        const item = {
            ...data,
            submissionId,
            memberId: member._id,
            lastUpdated: new Date()
        };
        await wixData.insert(COMPANY_COLLECTION, item);
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
