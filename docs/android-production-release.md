# Android Production Release Setup

This project is a native Android Expo app. For real production updates, do not ship debug-signed APKs.

## 1. Finalize the app identity

Before publishing to Google Play, set your permanent Android package name.

Current package values live in:

- `app.config.js`
- `android/app/build.gradle`

Recommended format:

```text
com.yourcompany.societyos
```

Do this before the first Play Store upload. Changing it later creates a new app identity.

## 2. Generate a release keystore

Run this from the project root on Windows:

```powershell
keytool -genkeypair -v -storetype PKCS12 -keystore android/app/societyos-upload-key.keystore -alias societyosupload -keyalg RSA -keysize 2048 -validity 10000
```

Keep the keystore file and passwords backed up securely. Do not commit them to git.

The repo ignores `*.keystore` files.

## 3. Configure signing credentials locally or in CI

Create a file based on `android/keystore.properties.example` or set the same values as environment variables.

Example local file:

```properties
MYAPP_UPLOAD_STORE_FILE=societyos-upload-key.keystore
MYAPP_UPLOAD_KEY_ALIAS=societyosupload
MYAPP_UPLOAD_STORE_PASSWORD=your_store_password
MYAPP_UPLOAD_KEY_PASSWORD=your_key_password
```

Supported sources:

- `android/gradle.properties`
- user-level Gradle properties
- CI environment variables

The release build now fails on purpose if signing is not configured.

## 4. Manage Android versioning correctly

Version values are stored in `android/gradle.properties`:

```properties
android.versionCode=1
android.versionName=1.0.0
```

Rules:

- Increase `android.versionCode` on every Play Store update.
- Update `android.versionName` for the user-facing release label.

Example:

```properties
android.versionCode=2
android.versionName=1.0.1
```

## 5. Use HTTPS in production

Release builds now set `usesCleartextTraffic=false` through the native manifest. Debug builds still allow HTTP for local development.

If you regenerate native config from Expo settings, `app.config.js` also defaults to HTTPS-only unless you explicitly set:

```powershell
$env:ALLOW_CLEARTEXT_TRAFFIC="true"
```

Only use that for local testing.

## 6. Point the mobile app to the production API

The app already falls back to a production API base URL in `src/api/client.ts` when `EXPO_PUBLIC_API_URL` is missing in non-dev builds.

Before release, verify that:

- the production API URL is correct
- the API serves HTTPS
- backend secrets are not embedded in the mobile app

## 7. Build artifacts

For Play Store upload, build an Android App Bundle:

```powershell
Set-Location "d:\Society Management Project\society-management-app\android"
.\gradlew.bat bundleRelease
```

Output:

```text
android/app/build/outputs/bundle/release/app-release.aab
```

For direct device testing, build a signed APK:

```powershell
Set-Location "d:\Society Management Project\society-management-app\android"
.\gradlew.bat assembleRelease
```

Output:

```text
android/app/build/outputs/apk/release/app-release.apk
```

## 8. Recommended release flow

Use this sequence for every production update:

1. Update `android.versionCode` and `android.versionName`.
2. Build `bundleRelease`.
3. Install a release APK on a physical phone and smoke test login, workspace selection, notices, payments, and profile flows.
4. Upload the AAB to Google Play internal testing.
5. Test upgrade behavior over an older installed production build.
6. Promote to closed testing, then production.
7. Use staged rollout for risky releases.

## 9. Security recommendations

Before a real production launch:

1. Rotate any exposed Twilio keys, API keys, and creator access keys.
2. Keep signing passwords only in secure local secrets or CI secrets.
3. Confirm the app never depends on HTTP APIs in release mode.
4. Verify PostgreSQL production settings on the backend and disable SQLite fallback with `REQUIRE_POSTGRES=true`.

## 10. Optional next step: OTA updates

If you later want JavaScript-only hot updates without a full Play Store submission, add Expo EAS Update. That should come after Play Store signing and release versioning are stable.