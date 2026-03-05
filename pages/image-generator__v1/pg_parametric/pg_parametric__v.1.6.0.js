/**
 * IMAGE GENERATOR - 'PARAMETRIC'
 * Page Code
 * version 1.6.0
 */

import { exportImage } from 'backend/parametricService.web';

$w.onReady(function () {
  console.log("[cc-v1.0.0] - Page ready");

  // Hide dropdown initially
  $w('#ccFileMenu').hide();
  console.log("[cc-v1.0.0] - File menu hidden initially");

  // Toggle dropdown on File click
  $w('#ccMenuFile').onClick(() => {
    if ($w('#ccFileMenu').hidden) {
      $w('#ccFileMenu').show();
      console.log("[cc-v1.0.0] - File menu shown");
    } else {
      $w('#ccFileMenu').hide();
      console.log("[cc-v1.0.0] - File menu hidden");
    }
  });

  // Close dropdown when leaving it (mouse out)
  $w('#ccFileMenu').onMouseOut(() => {
    $w('#ccFileMenu').hide();
    console.log("[cc-v1.0.0] - File menu hidden (mouse out)");
  });

  // Close dropdown when other main menus are clicked (Edit, View, Help)
  $w('#ccMenuEdit, #ccMenuView, #ccMenuHelp').onClick(() => {
    $w('#ccFileMenu').hide();
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
    $w(selector).onClick(() => {
      $w('#ccFileMenu').hide();
      console.log(`[cc-v1.0.0] - File menu hidden (option clicked: ${selector})`);
    });
  });

  // Special handling for Export Image – also call backend
  $w('#ccFileExportImage').onClick(() => {
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
  // Use the page container (#ccParametric)
  $w('#ccParametric').onClick((event) => {
    // event.target is the actual DOM element clicked
    const target = event.target;
    // Check if click is inside the menu or on the file button
    const isInsideMenu = target.closest('#ccFileMenu');
    const isFileButton = target.closest('#ccMenuFile');

    if (!isInsideMenu && !isFileButton) {
      $w('#ccFileMenu').hide();
      console.log("[cc-v1.0.0] - File menu hidden (click outside)");
    }
  });
});