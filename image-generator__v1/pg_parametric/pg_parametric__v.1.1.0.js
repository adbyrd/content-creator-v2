/**
 * IMAGE GENERATOR - 'PARAMETRIC'
 * version 1.1.0
 * 
 * Updates:
 * - Fixed dropdown toggle using explicit show/hide
 * - Webhook URL now fetched from Secrets Manager
 * - Added error handling for secret retrieval
 */

import { fetch } from 'wix-fetch';
import wixSecrets from 'wix-secrets-backend'; // Note: use backend module if in backend; otherwise frontend secrets (wix-secrets)

$w.onReady(function () {
  // State to track dropdown visibility
  let isFileMenuVisible = false;

  // Hide dropdown initially
  $w('#ccFileMenu').hide();

  // Toggle dropdown on File click using explicit show/hide
  $w('#ccMenuFile').onClick(() => {
    if (isFileMenuVisible) {
      $w('#ccFileMenu').hide();
    } else {
      $w('#ccFileMenu').show();
    }
    isFileMenuVisible = !isFileMenuVisible;
  });

  // Close dropdown when mouse leaves the menu area
  $w('#ccFileMenu').onMouseLeave(() => {
    $w('#ccFileMenu').hide();
    isFileMenuVisible = false;
  });

  // Close dropdown when other main menu buttons are clicked
  $w('#ccEditFile, #ccViewFile, #ccHelpFile').onClick(() => {
    $w('#ccFileMenu').hide();
    isFileMenuVisible = false;
  });

  // Handle Export Image click – retrieve webhook URL from Secrets Manager
  $w('#ccFileExportImage').onClick(async () => {
    try {
      // Fetch the webhook URL from Wix Secrets Manager
      const webhookUrl = await wixSecrets.getSecret('CC_WEBHOK_EXPORT_IMAGE');

      const payload = {
        action: 'export_image',
        timestamp: new Date().toISOString(),
        // You can add more dynamic data here (e.g., current image parameters)
      };

      const response = await fetch(webhookUrl, {
        method: 'post',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        console.log('Webhook sent successfully');
        // Optional: show a success message to the user
        // $w('#statusMessage').text = 'Export started!';
      } else {
        console.error('Webhook error', response.status);
        // Optional: show error message
      }
    } catch (error) {
      console.error('Failed to call webhook or retrieve secret', error);
      // Optional: notify user
    }
  });
});