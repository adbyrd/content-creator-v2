/**
 * COMPANY DETAILS 
 * v.1.0.0
 * 
 * Creates a permanent business profile—logo, colors, products, audience, and industry.
 * Content Creator 2.0 
 */

import { currentMember } from 'wix-users';
import { triggeredToast } from 'wix-window'; // for feedback (optional)

$w.onReady(function () {
  // Hide success message initially
  $w('#successMessage').hide();

  // Handle form submission
  $w('#submitButton').onClick(async () => {
    // Collect values from inputs
    const companyName = $w('#companyNameInput').value;
    const email = $w('#emailInput').value;
    const zipCode = $w('#zipCodeInput').value;
    const websiteUrl = $w('#websiteInput').value;
    const primaryCategory = $w('#categoryDropdown').value;
    const primarySubCategory = $w('#subCategoryDropdown').value;
    const companyDescription = $w('#descriptionTextArea').value;
    const customerType = $w('#customerTypeDropdown').value;
    const preferredPlatform = $w('#platformDropdown').value;

    // Validate that required fields are filled (optional)
    if (!companyName || !email) {
      triggeredToast('Please fill in all required fields');
      return;
    }

    try {
      // Update the current member's profile with custom fields
      await currentMember.updateMember({
        // Standard profile fields (if you want to update email, be careful)
        // Usually email is managed via login, so you might skip it or update separately.
        // For custom fields, use the field keys defined in the dashboard.
        profile: {
          custom: {
            companyName: companyName,
            companyEmail: email,
            zipCode: zipCode,
            websiteUrl: websiteUrl,
            primaryCategory: primaryCategory,
            primarySubCategory: primarySubCategory,
            companyDescription: companyDescription,
            customerType: customerType,
            preferredPlatform: preferredPlatform,
          }
        }
      });

      // Show success message
      $w('#successMessage').show();
      
      // Optionally clear the form or redirect
      // $w('#companyNameInput').value = '';
      // etc.

    } catch (error) {
      console.error('Error updating member profile:', error);
      triggeredToast('Failed to save data. Please try again.');
    }
  });
});
