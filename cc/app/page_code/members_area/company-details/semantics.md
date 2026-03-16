# Company Details v1

Content Creator 2.0's **Company Details** creates a permanent business profile—logo, colors, products, audience, and industry.  
This central hub powers an autonomous content engine that continuously produces brand-aligned marketing content, keeping businesses visible online without constant setup or manual prompting.


## Page Semantics
company-details.1.0.0  

The “Company Details” (company-details.js) static display section.

```bash  
Section #ccIdentityHubDisplay
│         └── Text #ccPageTitle
│         └── Text #ccPageSubHeading
│         └── Text #ccPageDescription

│         └── Text #ccTitleCompany
│         └── Text #ccDisplayCompanyName
│         └── Text #ccDisplayCompanyWebsiteURL
│         └── Text #ccDisplayCompanyDescription

│         └── Text #ccCompanyEmailTitle
│         └── Text #ccCompanyEmailDescription
│         └── Text #ccDisplayCompanyEmail

│         └── Text #ccCompanyZipCodeTitle
│         └── Text #ccCompanyZipCodeDescription
│         └── Text #ccDisplayCompanyZipCode

│         └── Text #ccCompanyBusinessCategoryTitle
│         └── Text #ccCompanyBusinessCategoryDescription
│         └── Text #ccDisplayCompanyBusinessCategory


│         └── Text #ccCompanyBusinessSubCategoryTitle
│         └── Text #ccCompanyBusinessSubCategoryDescription
│         └── Text #ccDisplayCompanyBusinessSubCategory

│         └── Text #ccCompanyCustomerTypeTitle
│         └── Text #ccCompanyCustomerTypeDescription
│         └── Text #ccDisplayCompanyCustomerType

│         └── Text #ccSocialMediaPlatformTitle
│         └── Text #ccSocialMediaPlatformDescription
│         └── Text #ccDisplaySocialMediaPlatform
```

The “Company Details” (company-details.js) form for updating static section.

```bash  
Section #ccIdentityHubForm
│         └── TextInput #ccFormCompanyName
│         └── TextInput #ccFormCompanyEmail
│         └── TextInput #ccFormCompanyZipcode
│         └── TextInput #ccFormCompanyWebsite
│         └── TextBox #ccFormCompanyDescription
│         └── Dropdown #ccFormBusinessCategory
│         └── Dropdown #ccFormBusinessSubCategory
│         └── Dropdown #ccFormBusinessCustomerType
│         └── Dropdown #ccFormSocialMediaPlatform

│         └── Button #ccFormUpdateCompanyDetails
```