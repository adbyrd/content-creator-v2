/**
 * IMAGE GENERATOR - 'PARAMETRIC'
 * Page Code
 * version 1.7.0
 */

import { exportImage, checkWebhookStatus } from 'backend/parametricService.web';

$w.onReady(function () {
  console.log("[cc-v1.0.0] - Page ready");

  // Check webhook status on load and log to browser
  checkWebhookStatus()
    .then(status => {
      console.log("[cc-v1.0.0] - Webhook status check:", status);
    })
    .catch(err => {
      console.error("[cc-v1.0.0] - Webhook status check failed:", err);
    });

  // Hide dropdown initially
  hideFileMenu();

  // Helper to safely attach events only if element exists
  function safeOnClick(selector, handler) {
    const $el = $(selector);
    if ($el.length) {
      $el.onClick(handler);
    } else {
      console.warn(`[cc-v1.0.0] - Element not found: ${selector}`);
    }
  }

  function hideFileMenu() {
    const $menu = $('#ccFileMenu');
    if ($menu.length) $menu.hide();
  }

  // Toggle dropdown on File click
  safeOnClick('#ccMenuFile', () => {
    $('#ccFileMenu').toggle();
    console.log("[cc-v1.0.0] - File menu toggled");
  });

  // Close dropdown when leaving it
  safeOnClick('#ccFileMenu', () => {
    // mouseleave event is attached to the menu itself
    $('#ccFileMenu').onMouseLeave(() => {
      hideFileMenu();
      console.log("[cc-v1.0.0] - File menu hidden (mouse leave)");
    });
  });

  // Close dropdown when other main menus are clicked (Edit, View, Help)
  safeOnClick('#ccMenuEdit, #ccMenuView, #ccMenuHelp', () => {
    hideFileMenu();
    console.log("[cc-v1.0.0] - File menu hidden (other main menu clicked)");
  });

  // Handle clicks on any menu option (they should hide the menu)
  const menuOptions = [
    '#ccFileNewImage',
    '#ccFileNewVideo',
    '#ccFileExportImage',
    '#ccFileExportVideo',
    '#ccFileOpen'
  ];

  menuOptions.forEach(selector => {
    safeOnClick(selector, () => {
      hideFileMenu();
      console.log(`[cc-v1.0.0] - File menu hidden (option clicked: ${selector})`);
    });
  });

  // Special handling for Export Image – also call backend
  safeOnClick('#ccFileExportImage', () => {
    console.log("[cc-v1.0.0] - Export Image button clicked, calling backend...");
    exportImage()
      .then(result => {
        console.log("[cc-v1.0.0] - Backend exportImage succeeded:", result);
        // Optionally show user feedback
      })
      .catch(error => {
        console.error("[cc-v1.0.0] - Backend exportImage failed:", error);
      });
  });

  // Close dropdown when clicking anywhere else on the page
  safeOnClick('#ccParametric', (event) => {
    const target = event.target;
    // Use the Wix $w() to check if click was inside menu or on file button
    const isClickInsideMenu = target.closest ? target.closest('#ccFileMenu') : false;
    const isClickOnFileButton = target.closest ? target.closest('#ccMenuFile') : false;
    if (!isClickInsideMenu && !isClickOnFileButton) {
      hideFileMenu();
      console.log("[cc-v1.0.0] - File menu hidden (click outside)");
    }
  });
});