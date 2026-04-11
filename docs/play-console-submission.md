# Play Console Submission Pack

This document is based on the current `SocietyOS` codebase and release configuration as of April 10, 2026.

## Current Android release

- App name: `SocietyOS`
- Package name: `com.mindsflux.residencyhub`
- Bundle for upload: `dist/aab/society-main-release.aab`
- Version name: `1.0.0`
- Version code: `1`
- Privacy policy URL: `https://api.mindsflux.com/privacy-policy`
- Account deletion URL: `https://api.mindsflux.com/account-deletion`

Before submitting, make sure the backend is deployed and both public URLs load successfully in a browser.

## Main store listing draft

### App details

- App name: `SocietyOS`
- App or game: `App`
- Category: `House & Home`
- Free or paid: `Free`
- Support email: use your live support mailbox, for example `support@mindsflux.com`

### Short description

`Society management for residents, admins, billing, visitors, and security.`

### Full description

`SocietyOS helps apartment and gated community teams run daily operations from one mobile workspace. Residents can manage profiles, visitor passes, maintenance payments, notices, documents, amenity bookings, meetings, and helpdesk issues. Admin and committee users can review occupancy, resident requests, billing, announcements, staff verification, security records, and society documents. Security teams can manage gate approvals, visitor check-ins, staff tracking, and entry visibility. The app is designed for multi-society access with one login and role-based workspaces for resident, admin, and security users.`

## App content answers

### Privacy Policy

- Answer: `Yes`
- URL: `https://api.mindsflux.com/privacy-policy`

### Ads

- Answer: `No`

Reasoning:
- No ad SDKs are present in `package.json`.
- The app does not show ad placements in the current codebase.

### App access

- Answer: `Some functionality is restricted`

Current blocker:
- The live app is OTP-only on sign-in.
- Google review guidance expects reusable review access and specifically calls out OTP or multi-factor flows as something that needs special handling.

Recommended reviewer setup before production submission:
- Create a dedicated reviewer account that is always valid.
- Add a review-only access method that does not depend on a real-time OTP arriving on a private phone during review.
- Keep that review access active until the app is approved.

Draft reviewer note for Play Console:

`The app requires sign-in before most society features can be reviewed. Current production login uses mobile OTP. Before submitting for review, configure a dedicated reviewer account and a reusable review login method that does not depend on real-time OTP delivery. Once that is ready, paste the exact review phone/account details and the steps here.`

### Target audience and content

Recommended answers:
- Target audience: `18 and over`
- Children policy: `No, the app is not directed to children`

Reasoning:
- The app is a residential operations tool for homeowners, tenants, committee/admin users, and society security staff.

### Content rating

Expected outcome:
- Likely a low-maturity utility rating

Use the questionnaire honestly, but based on the current codebase this does not appear to include gambling, sexual content, graphic violence, or other mature-content categories. The final rating is determined by the questionnaire responses in Play Console.

## Data Safety draft

### Top-level answers

- Does the app collect or share user data: `Yes`
- Is all user data encrypted in transit: `Yes`
- Does the app provide a way for users to request deletion of their data: `Yes`

Reasoning:
- The release app is configured for HTTPS API traffic.
- OTP delivery uses Twilio over HTTPS.
- The app now includes an in-app deletion request flow and a public deletion page.

### Recommended data declarations

Use the following as the conservative starting point for the Data safety form.

| Data type | Collected | Shared | Required | Purposes |
| --- | --- | --- | --- | --- |
| Name | Yes | No | Yes | App functionality, Account management |
| Phone number | Yes | No | Yes | App functionality, Account management, Fraud prevention, security, and compliance |
| Email address | Yes | No | Optional | App functionality, Account management |
| User IDs | Yes | No | Yes | App functionality, Account management |
| Address or residence details | Yes | No | Optional | App functionality |
| Photos | Yes | No | Optional | App functionality |
| Videos | No | No | No | Not collected in the current codebase |
| Files and docs | Yes | No | Optional | App functionality |
| Messages | Yes | No | Optional | App functionality |
| User-generated content | Yes | No | Optional | App functionality |
| Other financial info | Yes | No | Optional | App functionality |

### How these map to the current app

- Name, phone, email, and user IDs:
  Account creation, authentication, session management, resident/admin/security workspace access, society membership, leadership profiles, and account deletion requests.
- Address or residence details:
  Society address, unit linkage, occupancy, move-in date, and residence profile details.
- Photos:
  Resident profile photos, vehicle photos, payment screenshots, visitor or vehicle entry photos, and announcement images.
- Files and docs:
  Rent agreements and society document uploads.
- Messages:
  Society chat and direct chat content.
- User-generated content:
  Complaints, meeting notes, visitor requests, resident/business notes, and form submissions.
- Other financial info:
  UPI IDs, UPI payer or payee details, bank transfer setup for society billing, payment references, and proof uploads.

### Sharing answer note

Recommended answer:
- `No data shared with third parties`

Why this is the recommended answer:
- The codebase sends OTP-related data to Twilio for delivery, but Google's Data safety guidance says transfers to a service provider acting on the developer's behalf do not need to be declared as `sharing`.

Important assumption:
- This recommendation assumes Twilio is only acting as your service provider for OTP delivery and is not using the data for its own independent advertising or profiling purposes.

### Data not currently seen in the main app codebase

These appear to be `No` in the current release unless you add them later:

- Approximate location
- Precise location
- Contacts from the device address book
- Calendar
- Audio recordings
- Health and fitness
- Web browsing history
- Installed apps
- Advertising ID for ads or profiling

If you later add analytics, crash reporting, ad SDKs, location, or device-contact access, update the Data safety form before publishing that version.

## Submission order

1. Deploy the updated backend.
2. Verify `https://api.mindsflux.com/privacy-policy`.
3. Verify `https://api.mindsflux.com/account-deletion`.
4. Decide how Play reviewers will access the OTP-protected app without a fragile real-time OTP dependency.
5. Create the Play app with package `com.mindsflux.residencyhub`.
6. Upload `dist/aab/society-main-release.aab`.
7. Complete App content:
   Privacy Policy, Ads, App access, Target audience, Content rating, Data safety.
8. Add store listing assets:
   app icon, phone screenshots, feature graphic, and descriptions.
9. If your developer account requires testing before production, complete the required test track first.
10. Submit for review.

## Official references

- Create and set up your app:
  https://support.google.com/googleplay/android-developer/answer/9859152?hl=en
- Prepare your app for review:
  https://support.google.com/googleplay/android-developer/answer/9859455?hl=en
- Data safety form guidance:
  https://support.google.com/googleplay/android-developer/answer/10787469?hl=en
- User Data policy:
  https://support.google.com/googleplay/android-developer/answer/10144311?hl=en
- Account deletion requirements:
  https://support.google.com/googleplay/android-developer/answer/13327111?hl=en
- Target audience and content:
  https://support.google.com/googleplay/android-developer/answer/9867159?hl=en
