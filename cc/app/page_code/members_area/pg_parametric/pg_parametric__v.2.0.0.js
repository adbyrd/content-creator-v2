/**
 * IMAGE GENERATOR - 'PARAMETRIC'
 * Page Code
 * version 2.0.0
 */

import { exportImage, checkWebhookStatus } from 'backend/parametricService.web';

$w.onReady(function () {
  console.log("[cc-v1.0.0] - Page ready");

  // 1. Log webhook status on page load
  if (typeof checkWebhookStatus === 'function') {
    checkWebhookStatus()
      .then(status => {
        console.log("[cc-v1.0.0] - Webhook status check:", status);
      })
      .catch(err => {
        console.error("[cc-v1.0.0] - Webhook status check failed:", err);
      });
  } else {
    console.error("[cc-v1.0.0] - checkWebhookStatus is not available. Make sure the backend service is updated and published.");
  }

  // 2. Handle export button click
  const $exportBtn = $w('#ccFileExportImage');
  if ($exportBtn.length) {
    $exportBtn.onClick(() => {
      console.log("[cc-v1.0.0] - Export Image button clicked, calling backend...");
      exportImage()
        .then(result => {
          console.log("[cc-v1.0.0] - Backend exportImage succeeded:", result);
          // Optionally show user feedback here
        })
        .catch(error => {
          console.error("[cc-v1.0.0] - Backend exportImage failed:", error);
        });
    });
  } else {
    console.warn("[cc-v1.0.0] - Export button #ccFileExportImage not found on page.");
  }
});