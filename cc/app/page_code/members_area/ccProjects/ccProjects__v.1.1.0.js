/**
 * CC PROJECT MANAGEMENT PAGE
 * @version 1.1.0
 * @updated 2026-03-25
 */

import wixLocation from 'wix-location';
import { getProjects } from 'backend/projects.web';

const VERSION_TAG = '[projects-v1.1.0]';
const PAGE_SIZE = 10;
const MSG_LOAD_ERROR = 'We encountered an issue loading your projects. Please try refreshing.';

let _projectsCache = [];

$w.onReady(async function () {
    console.log(`${VERSION_TAG} Page Start`);
    
    bootUI();
    wireHandlers();
    await hydrateProjects();
});

/**
 * 4.1 UI Initialization
 */
function bootUI() {
    safeHide('#projectsTable');
    safeHide('#emptyStateContainer');
    safeHide('#ccGeneralError');
    // Ensure the loading indicator is visible during fetch
    const loader = $w('#ccLoadingIndicator');
    if (loader && typeof loader.show === 'function') loader.show();
}

/**
 * 4.1 Event Handlers
 */
function wireHandlers() {
    $w('#btnNewProject').onClick(() => wixLocation.to('/new-project-wizard'));

    $w('#projectsTable').onRowSelect((event) => {
        const projectId = event.rowData._id;
        wixLocation.to(`/projects/edit/${projectId}`);
    });
}

/**
 * 4.6 Data Hydration
 */
async function hydrateProjects() {
    try {
        const result = await getProjects({ limit: PAGE_SIZE });

        if (result.ok) {
            _projectsCache = result.data;
            if (_projectsCache.length > 0) {
                renderProjectsTable(_projectsCache);
            } else {
                showEmptyState();
            }
        } else {
            throw new Error(result.error.message);
        }
    } catch (err) {
        console.error(`${VERSION_TAG} Hydration failed:`, err);
        showError(MSG_LOAD_ERROR);
        showEmptyState();
    } finally {
        safeHide('#ccLoadingIndicator');
    }
}

/**
 * Renders data to table
 */
function renderProjectsTable(data) {
    const table = $w('#projectsTable');
    
    table.columns = [
        { id: 'colName', dataPath: 'title', label: 'Project Name', type: 'string' }
    ];
    
    table.rows = data;
    safeShow('#projectsTable');
    safeHide('#emptyStateContainer');
}

function showEmptyState() {
    safeHide('#projectsTable');
    safeShow('#emptyStateContainer');
}

/**
 * 7. Error Handling
 */
function showError(message) {
    const errorEl = $w('#ccGeneralError');
    if (errorEl && typeof errorEl.show === 'function') {
        errorEl.text = message;
        errorEl.show();
    }
}

/**
 * 4.3 Safe UI Helpers (Prevents TypeError: e.hide is not a function)
 */
function safeShow(selector) {
    const el = $w(selector);
    if (el && typeof el.show === 'function') {
        el.show();
    } else {
        console.warn(`${VERSION_TAG} safeShow: ${selector} not found or unsupported.`);
    }
}

function safeHide(selector) {
    const el = $w(selector);
    if (el && typeof el.hide === 'function') {
        el.hide();
    } else {
        console.warn(`${VERSION_TAG} safeHide: ${selector} not found or unsupported.`);
    }
}