/**
 * PROJECT MANAGEMENT PAGE
 * Handles project dashboard, counter updates, and creation flow.
 * @version 1.6.2
 */

import wixWindow from 'wix-window';
import { getProjects } from 'backend/projects.web';
import { showSuccess, showError } from 'public/pages/masterPage.js';

const VERSION_TAG = '[ccProjects-v1.6.2]';
const MSG_LOAD_ERROR = "Something went wrong while loading your projects. Please refresh the page.";
const MSG_SAVE_SUCCESS = "Your Project Has Been Created Successfully";

let _projectCache = []; 

$w.onReady(async () => {
    console.log(`${VERSION_TAG} Page Initialization Started`);
    
    bootPageUI();
    wireHandlers();
    await refreshProjectData();
});


function bootPageUI() {
    $w('#ccLoadingIndicator').show();
    
    const localErr = $w('#ccLocalPageError'); 
    if (localErr) localErr.hide();
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
        showError(MSG_LOAD_ERROR); 
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
 * UTILS (Internal Defensive Checks)
 * -----------------------------------------------------------------------
 */

function safeSetText(selector, value) {
    const el = $w(selector);
    if (el) {
        el.text = value;
    } else {
        console.warn(`${VERSION_TAG} Element ${selector} not found on this page.`);
    }
}