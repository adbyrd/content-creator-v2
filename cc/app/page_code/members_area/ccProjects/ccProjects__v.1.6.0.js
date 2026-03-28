/**
 * PROJECT MANAGEMENT PAGE
 * Handles the main dashboard view and project creation triggers.
 * @version 1.6.0
 */

import wixWindow from 'wix-window';
import { getProjects } from 'backend/projects.web';

const VERSION_TAG = '[ccProjects-v1.6.0]';
const MSG_LOAD_ERROR = "We couldn't load your projects. Please refresh the page.";
const MSG_SAVE_SUCCESS = "Success! Your new project has been created.";

let _projectCache = [];

$w.onReady(async () => {
    console.log(`${VERSION_TAG} Page Initialization Started`);
    
    bootUI();
    wireHandlers();
    await refreshProjectList();
});

function bootUI() {
    $w('#ccSuccessToaster').hide();
    $w('#ccLoadingIndicator').show();
    $w('#ccErrorMsg').hide();
}

function wireHandlers() {
    $w('#btnNewProject').onClick(async () => {
        const result = await wixWindow.openLightbox("New Project");
        
        if (result && result.success) {
            handlePostSaveSuccess();
        }
    });
}

async function refreshProjectList() {
    $w('#ccLoadingIndicator').show();
    
    try {
        const response = await getProjects({ limit: 50, sort: 'title' });
        
        if (response.ok) {
            _projectCache = response.data;
            // renderProjects(_projectCache);
        } else {
            throw new Error(response.error.message);
        }
    } catch (err) {
        console.error(`${VERSION_TAG} Load Failed:`, err);
        showError(MSG_LOAD_ERROR);
    } finally {
        $w('#ccLoadingIndicator').hide();
    }
}

/*
function renderProjects(data) {
    const repeater = $w('#rptProjects');
    if (!repeater) return;

    repeater.data = data;

}
*/

async function handlePostSaveSuccess() {
    showSuccessToaster(MSG_SAVE_SUCCESS);
    await refreshProjectList();
}

// --- UI Feedback Helpers ---

function showSuccessToaster(message) {
    const toaster = $w('#ccSuccessToaster');
    const messageEl = $w('#ccSuccessMsg');

    if (messageEl) messageEl.text = message;
    
    toaster.show('fade', { duration: 300 });
    
    setTimeout(() => {
        if (toaster.isVisible) toaster.hide('fade');
    }, 5000);
}

function showError(message) {
    const errorEl = $w('#ccErrorMsg');
    if (errorEl) {
        errorEl.text = message;
        errorEl.show();
    }
}

export function debugPageState() {
    console.log(`${VERSION_TAG} Current Cache:`, _projectCache);
}