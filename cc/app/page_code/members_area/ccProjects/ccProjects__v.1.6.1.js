/**
 * PROJECT MANAGEMENT PAGE
 * Handles the main dashboard view, project count, and creation triggers.
 * @version 1.6.1
 */

import wixWindow from 'wix-window';
import { getProjects } from 'backend/projects.web';

const VERSION_TAG = '[ccProjects-v1.6.0]';
const MSG_LOAD_ERROR = "Something went wrong while loading your projects. Please refresh the page.";
const MSG_SAVE_SUCCESS = "Your Project Has Been Created Successfully";

let _projectCache = []; 

$w.onReady(async () => {
    console.log(`${VERSION_TAG} Initializing Projects Page...`);
    
    bootUI();
    wireHandlers();
    await refreshProjectData();
});

function bootUI() {
    $w('#ccSuccessToaster').hide();
    $w('#ccErrorMsg').hide();
    $w('#ccLoadingIndicator').show();
}

function wireHandlers() {
    $w('#btnNewProject').onClick(async () => {
        const result = await wixWindow.openLightbox("New Project");
        
        if (result && result.success) {
            handlePostSaveSuccess();
        }
    });
}

async function refreshProjectData() {
    $w('#ccLoadingIndicator').show();
    
    try {
        const response = await getProjects({ limit: 50 });
        
        if (response.ok) {
            _projectCache = response.data;
            
            updateProjectCounter(_projectCache.length);
            
            // renderProjects(_projectCache);
        } else {
            throw new Error(response.error.message);
        }
    } catch (err) {
        console.error(`${VERSION_TAG} Data Load Failed:`, err);
        showSystemError(MSG_LOAD_ERROR);
    } finally {
        $w('#ccLoadingIndicator').hide();
    }
}

function updateProjectCounter(count) {
    const countText = `You Currently Have ${count} Projects`;
    safeSetText('#ccProjectCount', countText);
}

async function handlePostSaveSuccess() {
    showSuccess(MSG_SAVE_SUCCESS);
    await refreshProjectData();
}

/**
 * UI FEEDBACK HELPERS
 * -----------------------------------------------------------------------
 */

function showSuccess(message) {
    const toaster = $w('#ccSuccessToaster');
    safeSetText('#ccSuccessMsg', message);
    
    toaster.show('fade', { duration: 300 });
    
    setTimeout(() => {
        if (toaster.isVisible) toaster.hide('fade');
    }, 5000);
}

function showSystemError(message) {
    const errorEl = $w('#ccErrorMsg');
    if (errorEl) {
        errorEl.text = message;
        errorEl.show();
    }
}

function safeSetText(selector, value) {
    const el = $w(selector);
    if (el) el.text = value;
}

/*
function renderProjects(data) {
    const repeater = $w('#rptProjects');
    if (repeater) {
        repeater.data = data;
    }
}
*/