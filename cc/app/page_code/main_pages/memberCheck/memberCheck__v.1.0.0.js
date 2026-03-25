/**
 * MEMBER CHECK
 * @version 1.0.0
 * @updated 2026-03-24
 */

import wixLocation from 'wix-location';
import { checkMemberExists } from 'backend/memberFunctions.web';

$w.onReady(function () {
    $w("#ccMemberCheck").onClick(async () => {
        const email = $w("#ccMemberEmail").value;

        // Basic validation
        if (!email || !$w("#ccMemberEmail").valid) {
            $w("#ccMemberEmail").updateValidityIndication();
            return;
        }

        // UI: Show preloader and disable button to prevent double-clicks
        $w("#ccPreCheck").expand(); 
        $w("#ccMemberCheck").disable();

        try {
            const exists = await checkMemberExists(email);

            if (exists) {
                // Member exists, send to Login/Profile
                // Wix will automatically trigger the auth prompt if /profile is protected
                wixLocation.to("/profile");
            } else {
                // New user, send to Pricing
                wixLocation.to("/pricing-plans");
            }
        } catch (err) {
            console.error("Flow Error:", err);
            // Fallback: Send to pricing if check fails
            wixLocation.to("/pricing-plans");
        }
    });
});