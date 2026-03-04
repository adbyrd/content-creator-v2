/**
 * IMAGE GENERATOR - 'PARAMETRIC'
 * version 1.4.0
 * 
 * Updates:
 * Handles UI interactions and delegates webhook call to backend service.
 */

import { exportImage } from 'backend/parametricService.web';

$w.onReady(function () {
  let isFileMenuVisible = false;

  // Initially hide the dropdown
  $w('#ccFileMenu').hide();

  // Toggle dropdown on File click
  $w('#ccMenuFile').onClick(() => {
    if (isFileMenuVisible) {
      $w('#ccFileMenu').hide();
    } else {
      $w('#ccFileMenu').show();
    }
    isFileMenuVisible = !isFileMenuVisible;
  });

  // Close dropdown when mouse leaves the menu area
  // @ts-ignore – onMouseLeave is valid at runtime despite type definition
  $w('#ccFileMenu').onMouseLeave(() => {
    $w('#ccFileMenu').hide();
    isFileMenuVisible = false;
  });

  // Close dropdown when other main menu buttons are clicked
  $w('#ccEditFile, #ccViewFile, #ccHelpFile').onClick(() => {
    $w('#ccFileMenu').hide();
    isFileMenuVisible = false;
  });

  // Handle Export Image click – call backend service
  $w('#ccFileExportImage').onClick(async () => {
    try {
      // Build the payload (add any dynamic data you need)
      const payload = {
        action: 'export_image',
        timestamp: new Date().toISOString(),
        // Example: include current image parameters from your UI
        // imageSettings: getCurrentImageSettings()
      };

      // Call backend function
      const result = await exportImage(payload);

      if (result.success) {
        console.log('Webhook sent successfully', result);
        // Optional user feedback (e.g., show a success toast)
        // wixWindowFrontend.showToast({ message: 'Export started!' });
      } else {
        console.error('Webhook failed', result.error);
        // Optional user feedback
      }
    } catch (error) {
      console.error('Failed to call backend service', error);
    }
  });
});