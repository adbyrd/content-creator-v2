/**
 * PROJECT MANAGEMENT PAGE
 * Handles project dashboard, counter updates, and creation flow.
 * @version 1.7.0
 */

import wixWindow from 'wix-window';
import { currentMember } from 'wix-members-frontend';
import { getProjects } from 'backend/projects.web';
import { showSuccess, showError } from 'public/pages/masterPage.js';

const VERSION_TAG = '[ccProjects-v1.7.0]';
const MSG_LOAD_ERROR = "Something went wrong while loading your projects. Please refresh the page.";
const MSG_SAVE_SUCCESS = "Your Project Has Been Created Successfully";
const MSG_AUTH_ERROR = "Please log in to view your projects.";

let _projectCache = [];

$w.onReady(async () => {
    console.log(`${VERSION_TAG} Page Initialization Started`);
    
    bootPageUI();
    wireHandlers();
    
    try {
        const member = await currentMember.getMember();
        if (!member) {
            showError(MSG_AUTH_ERROR);
            return;
        }
        
        await refreshProjectData(member.loginEmail);
    } catch (err) {
        console.error(`${VERSION_TAG} Auth Check Failed:`, err);
        showError(MSG_LOAD_ERROR);
    }
});

function bootPageUI() {
    safeShow('#ccLoadingIndicator');
    
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

async function refreshProjectData(memberEmail) {
    safeShow('#ccLoadingIndicator');
    
    try {
        const response = await getProjects({ 
            memberId: memberEmail,
            limit: 50 
        });
        
        if (response && response.ok) {
            _projectCache = response.data;
            updateProjectCounter(_projectCache.length);
            
        } else {
            throw new Error(response?.error?.message || "Query failed");
        }
    } catch (err) {
        console.error(`${VERSION_TAG} Data Load Failed:`, err);
        showError(MSG_LOAD_ERROR); 
    } finally {
        safeHide('#ccLoadingIndicator');
    }
}

function updateProjectCounter(count) {
    const countText = `You Currently Have ${count} Projects`;
    safeSetText('#ccProjectCount', countText);
}

async function handlePostSaveSuccess() {
    showSuccess(MSG_SAVE_SUCCESS);
    
    const member = await currentMember.getMember();
    if (member) {
        await refreshProjectData(member.loginEmail);
    }
}

/**
 * --- UTILS (Safe UI Manipulation) --- 
 */

function safeSetText(selector, value) {
    const el = $w(selector);
    if (el) {
        el.text = value || "";
    } else {
        console.warn(`${VERSION_TAG} Selector ${selector} not found on page.`);
    }
}

function safeShow(selector) {
    const el = $w(selector);
    if (el && el.show) el.show();
}

function safeHide(selector) {
    const el = $w(selector);
    if (el && el.hide) el.hide();
}