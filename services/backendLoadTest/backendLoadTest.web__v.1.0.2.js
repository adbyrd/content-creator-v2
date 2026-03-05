/**
 * 'PARAMETRIC' IMAGE GENERATOR v.2 (adbyrd.com/cc)
 * [ BACKEND SERVICE ] 'SERVICE LOAD' TESTER
 * version 1.0.2
 */

import { Permissions, webMethod } from "wix-web-module";
import { getSecret } from 'wix-secrets-backend';
import { fetch } from 'wix-fetch';

// Top-level log – appears in Velo Monitoring when the file is loaded
console.log("[backendLoadTest] Module loaded");

/**
 * Simple multiplication – demonstrates basic backend function.
 */
export const multiply = webMethod(
  Permissions.Anyone,
  (factor1, factor2) => {
    console.log(`[backendLoadTest] multiply called with ${factor1}, ${factor2}`);
    return factor1 * factor2;
  }
);

/**
 * Tests backend service availability, secret retrieval, and webhook connectivity.
 * Returns a detailed status object.
 */
export const testBackendServices = webMethod(
  Permissions.Anyone,
  async () => {
    console.log("[backendLoadTest] testBackendServices called");
    const result = {
      moduleLoaded: true,
      secrets: {},
      webhook: null,
      error: null,
      timestamp: new Date().toISOString()
    };

    // Test secret retrieval
    try {
      const webhookUrl = await getSecret('CC_WEBHOOK_EXPORT_IMAGE');
      const clientId = await getSecret('CLIENT_ID');
      const clientSecret = await getSecret('CLIENT_SECRET');
      const projectId = await getSecret('PROJECT_ID');

      result.secrets = {
        CC_WEBHOOK_EXPORT_IMAGE: webhookUrl ? 'present' : 'missing',
        CLIENT_ID: clientId ? 'present' : 'missing',
        CLIENT_SECRET: clientSecret ? 'present' : 'missing',
        PROJECT_ID: projectId ? 'present' : 'missing'
      };

      // If webhook URL exists, test connectivity with a minimal ping
      if (webhookUrl) {
        try {
          const testPayload = [{ test: true, action: 'status_check' }];
          const response = await fetch(webhookUrl, {
            method: 'post',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testPayload)
          });
          result.webhook = {
            status: response.status,
            ok: response.ok
          };
          if (!response.ok) {
            const errorText = await response.text();
            result.webhook.error = errorText.substring(0, 200);
          }
        } catch (fetchError) {
          result.webhook = {
            error: fetchError.message
          };
        }
      } else {
        result.webhook = { error: 'Webhook URL secret missing' };
      }
    } catch (secretError) {
      result.error = `Secret retrieval failed: ${secretError.message}`;
    }

    console.log("[backendLoadTest] test result:", result);
    return result;
  }
);