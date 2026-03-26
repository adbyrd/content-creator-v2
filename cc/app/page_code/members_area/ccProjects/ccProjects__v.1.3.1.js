/**
 * PROJECT MANAGEMENT PAGE
 * @version 1.3.0
 * @updated 2026-03-26
 */

import wixLocation from 'wix-location';
import { getProjects } from 'backend/projects.web';

const VERSION_TAG = '[ccProjects-v1.3.0]';
const PAGE_SIZE = 10;
const MSG_LOAD_ERROR = 'We encountered an issue loading your projects. Please try refreshing.';

let _projectsCache = [];

$w.onReady(async function () {
    console.log(`${VERSION_TAG} Page Initialization Started`);
    
    bootUI();
    wireHandlers();
    await hydrateProjects();
});

function bootUI() {
    safeHide('#projectsTable');
    safeHide('#emptyStateContainer');
    safeHide('#ccGeneralError');
    
    // Standard 4.6: Show loading indicator
    const loader = $w('#ccLoadingIndicator');
    if (loader && typeof loader.show === 'function') {
        loader.show();
    }
}

/**
 * Standard 4.1: Initialization - Set up event handlers.
 */
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

/**
 * Standard 4.6: Data Hydration.
 * Fetches data from the backend and handles the UI transition.
 */
async function hydrateProjects() {
    try {
        console.log(`${VERSION_TAG} Hydrating project data...`);
        
        const result = await getProjects({ 
            limit: PAGE_SIZE,
            sort: 'title' 
        });

        if (result.ok) {
            _projectsCache = result.data;
            
            if (_projectsCache.length > 0) {
                renderProjectsTable(_projectsCache);
            } else {
                console.info(`${VERSION_TAG} No projects found for this user.`);
                showEmptyState();
            }
        } else {
            throw new Error(result.error?.message || 'Data retrieval failed');
        }

    } catch (err) {
        console.error(`${VERSION_TAG} Hydration Error:`, err.message);
        showError(MSG_LOAD_ERROR); 
        showEmptyState();
    } finally {
        safeHide('#ccLoadingIndicator');
    }
}

/**
 * Standard 4.3: Safe UI Manipulation - Rendering logic.
 */
function renderProjectsTable(data) {
    const table = $w('#projectsTable');

    table.columns = [
        { 
            id: 'colName', 
            dataPath: 'title',
            label: 'Project Name', 
            type: 'string' 
        },
        { 
            id: 'colCreated', 
            dataPath: '_createdDate', 
            label: 'Date Created', 
            type: 'date' 
        }
    ];
    
    table.rows = data;
    
    safeShow('#projectsTable');
    safeHide('#emptyStateContainer');
}

/**
 * Logic to show empty state when no records belong to the user.
 */
function showEmptyState() {
    safeHide('#projectsTable');
    safeShow('#emptyStateContainer');
}

/**
 * Standard 7: Centralized Error Messaging.
 */
function showError(message) {
    const errorEl = $w('#ccGeneralError');
    if (errorEl && typeof errorEl.show === 'function') {
        errorEl.text = message;
        errorEl.show();
    }
}

// --- Standard 4.3: Safe UI Helpers (Defensive Programming) ---

/**
 * Safely shows an element after verifying it exists and supports the method.
 * @param {string} selector - The element ID.
 */
function safeShow(selector) {
    const el = $w(selector);
    if (el && typeof el.show === 'function') {
        el.show();
    } else {
        console.warn(`${VERSION_TAG} safeShow: ${selector} missing or unsupported.`);
    }
}

/**
 * Safely hides an element after verifying it exists and supports the method.
 * @param {string} selector - The element ID.
 */
function safeHide(selector) {
    const el = $w(selector);
    if (el && typeof el.hide === 'function') {
        el.hide();
    } else {
        console.warn(`${VERSION_TAG} safeHide: ${selector} missing or unsupported.`);
    }
}