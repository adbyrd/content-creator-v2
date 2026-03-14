/**
 * GLOBAL LOGIN REDIRECT
 * This code listens for the login event and redirects users based on their roles.
 * Admin users are redirected to the My Account page, while non-admin users are redirected to the Projects page.
 * If there's an error during the process, users are redirected to a default page.
 * Place this code in the masterPage.js file to ensure it runs on all pages of the site.
 * 
 * version: 1.0.0
 */

import { authentication } from 'wix-members-frontend';
import wixLocation from 'wix-location';
import { currentMember } from 'wix-members-frontend';

$w.onReady(function () {
    // This listener runs globally if placed in masterPage.js
    authentication.onLogin(async (member) => {
        try {
            // Get roles for the logged-in member
            const roles = await currentMember.getRoles();
            const isAdmin = roles.some(role => role.name === 'Admin');

            if (isAdmin) {
                wixLocation.to('/members-area/my/my-account');
            } else {
                wixLocation.to('/projects');
            }
        } catch (error) {
            console.error("Login redirect error:", error);
            wixLocation.to('/default-page');
        }
    });
});
