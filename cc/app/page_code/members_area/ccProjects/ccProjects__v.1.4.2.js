/**
 * PROJECT MANAGEMENT PAGE
 * @version 1.4.1
 * @updated 2026-03-26
 */

import wixLocation from 'wix-location';
import { currentMember } from 'wix-members-frontend';
import { getProjects } from 'backend/projects.web';

const VERSION_TAG = '[ccProjects-v1.4.1]';
const PAGE_SIZE = 10;
const MSG_LOAD_ERROR = 'We encountered an issue loading your projects. Please try refreshing.';

let _projectsCache = [];

$w.onReady(async function () {
    console.log(`${VERSION_TAG} Page Initialization Started`);
    
    bootUI();
    wireHandlers();

    try {
        const member = await currentMember.getMember();
        
        if (member) {
            console.log(`${VERSION_TAG} Member authenticated: ${member._id}`);
            await hydrateProjects(member._id);
        } else {
            console.warn(`${VERSION_TAG} No active session. Redirecting to login.`);
            wixLocation.to('/login'); 
        }
    } catch (err) {
        console.error(`${VERSION_TAG} Auth Check Failed:`, err.message);
        showError("Authentication error. Please log in again.");
    }
});

function bootUI() {
    safeHide('#projectsTable');
    safeHide('#emptyStateContainer');
    safeHide('#ccGeneralError');
    
    const loader = $w('#ccLoadingIndicator');
    if (loader && typeof loader.show === 'function') {
        loader.show();
    }
}

function wireHandlers() {
    $w('#btnNewProject').onClick(() => {
        console.log(`${VERSION_TAG} Action: New Project clicked`);
        wixLocation.to('/new-project-wizard');
    });

    $w('#projectsTable').onRowSelect((event) => {
        const projectId = event.rowData._id;
        console.log(`${VERSION_TAG} Action: Row selected [${projectId}]`);
        wixLocation.to(`/projects/edit/${projectId}`);
    });
}

async function hydrateProjects(memberId) {
    console.log(`${VERSION_TAG} Hydrating project data for Owner: ${memberId}`);
    
    try {
        const result = await getProjects({ 
            limit: PAGE_SIZE,
            ownerId: memberId 
        });

        if (result && result.ok) {
            _projectsCache = result.data;
            
            if (_projectsCache.length > 0) {
                renderProjectsTable(_projectsCache);
            } else {
                showEmptyState();
            }
        } else {
            throw new Error(result?.error?.message || 'Data retrieval failed');
        }
    } catch (err) {
        console.error(`${VERSION_TAG} Hydration Error:`, err.message);
        showError(MSG_LOAD_ERROR);
        showEmptyState();
    } finally {
        safeHide('#ccLoadingIndicator');
    }
}

function renderProjectsTable(data) {
    const table = $w('#projectsTable');
    
    table.columns = [
        { id: 'colName', dataPath: 'title', label: 'Project Name', type: 'string' },
        { id: 'colCreated', dataPath: '_createdDate', label: 'Created', type: 'date' }
    ];
    
    table.rows = data;
    safeShow('#projectsTable');
    safeHide('#emptyStateContainer');
}

function showEmptyState() {
    safeHide('#projectsTable');
    safeShow('#emptyStateContainer');
}

function showError(message) {
    const errorEl = $w('#ccGeneralError');
    if (errorEl && typeof errorEl.show === 'function') {
        errorEl.text = message;
        errorEl.show();
    }
}

// --- Safe UI Helpers (Standardized Defensive Programming) ---

function safeShow(selector) {
    const el = $w(selector);
    if (el && typeof el.show === 'function') {
        el.show();
    } else {
        console.warn(`${VERSION_TAG} safeShow: ${selector} missing or unsupported.`);
    }
}

function safeHide(selector) {
    const el = $w(selector);
    if (el && typeof el.hide === 'function') {
        el.hide();
    } else {
        console.warn(`${VERSION_TAG} safeHide: ${selector} missing or unsupported.`);
    }
}

// --- Debug Exports ---

export function debugState() {
    console.log(`${VERSION_TAG} Current Cache:`, _projectsCache);
    return _projectsCache;
}