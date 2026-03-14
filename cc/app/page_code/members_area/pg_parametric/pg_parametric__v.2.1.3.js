/**
 * 'PARAMETRIC' IMAGE GENERATOR v.2
 * CONTENT CREATOR V2 - adbyrd.com/cc
 * WIX PAGE CODE
 * version 2.1.3
 */

import { testBackendServices } from 'backend/backendLoadTest.web';
import { exportImage, checkWebhookStatus} from 'backend/parametricServicev2.web';


$w.onReady(async function () {
  
  console.log("[Page] Running backend service test...");
  try {
    const status = await testBackendServices();
    console.log("[Page] Backend test result:", status);
  } catch (err) {
    console.error("[Page] Backend test failed:", err);
  }
  console.log("[cc-v1.0.0] - Page ready");

  // Log what we got from the backend
  console.log("[cc-v1.0.0] - Backend functions:", { exportImage, checkWebhookStatus });

  if (typeof checkWebhookStatus !== 'function') {
    console.error("[cc-v1.0.0] - ERROR: checkWebhookStatus is not a function. Backend file may not be saved or published correctly.");
    return;
  }
  if (typeof exportImage !== 'function') {
    console.error("[cc-v1.0.0] - ERROR: exportImage is not a function. Backend file may not be saved or published correctly.");
    return;
  }

  // 1. Log webhook status on page load
  checkWebhookStatus()
    .then(status => {
      console.log("[cc-v1.0.0] - Webhook status check:", status);
    })
    .catch(err => {
      console.error("[cc-v1.0.0] - Webhook status check failed:", err);
    });

  // 2. Handle export button click
  const exportButton = $w('#ccFileExportImage');
  if (exportButton) {
    exportButton.onClick(() => {
      console.log("[cc-v1.0.0] - Export Image button clicked, calling backend...");
      exportImage()
        .then(result => {
          console.log("[cc-v1.0.0] - Backend exportImage succeeded:", result);
        })
        .catch(error => {
          console.error("[cc-v1.0.0] - Backend exportImage failed:", error);
        });
    });
  } else {
    console.warn("[cc-v1.0.0] - Export button #ccFileExportImage not found on page.");
  }
});