# SocietyOS

Production-oriented Expo + React Native starter for residential apartment and bungalow community management.

This starter is built around one core product decision:

- Keep a single login identity.
- Attach society memberships to that identity.
- Let the user switch society workspace and active profile inside the app.

That model scales much better than separate chairman, tenant, and owner login systems.

## What is implemented

- Single entry auth screen with phone OTP or email path
- Local Node + SQLite backend with REST endpoints
- Database schema for societies, memberships, units, billing, amenities, rules, staff, security, and complaints
- Multi-society workspace selection
- Chairman-first society setup wizard
- Profile selection inside a society
- Resident dashboard shell:
  Home, Notices, Bookings, Helpdesk, Profile
- Admin dashboard shell:
  Admin Home, Residents, Billing, Amenities, Security, Announcements, Audit
- Foundational domain entities for:
  societies, buildings, units, memberships, occupancy, announcements, rules, amenities, bookings, maintenance, invoices, payments, receipts, complaints, staff, security, and entry logs
- Seeded demo data showing a single user across multiple societies and roles

## Run locally

```bash
npm run server
```

In a second terminal:

```bash
npm run start
```

Type-checking:

```bash
npm run typecheck
```

Reset the local database back to the demo snapshot:

```bash
npm run db:reset
```

## Local backend

The app now reads its working data from a local SQLite database stored at:

- `backend-data/societyos.db`

The backend starts on:

- `http://localhost:4000` for web / iOS simulator
- `http://10.0.2.2:4000` for Android emulator

If you test on a physical phone, start Expo with your laptop IP:

```bash
set EXPO_PUBLIC_API_URL=http://YOUR-LAN-IP:4000
npm run start
```

Example:

```bash
set EXPO_PUBLIC_API_URL=http://192.168.1.76:4000
npm run start
```

Available local endpoints:

- `GET /health`
- `GET /api/bootstrap`
- `POST /api/societies`
- `POST /api/dev/reset`

## Product architecture recommendation

The recommended flow is:

1. Login with phone OTP or email.
2. Select society workspace if the user belongs to multiple societies.
3. If no workspace exists for the user, offer chairman onboarding to create one.
4. Select the active profile inside that society.
5. Show role-based navigation and permissions.

This supports real-world edge cases:

- An owner can also be on the committee.
- A tenant can later become an owner.
- A user can own units in more than one society.
- Apartment and bungalow communities can both use the same system.

## Suggested production next steps

- Backend tenancy and RBAC:
  Prefer a tenant-aware backend with explicit `society_id` scoping on every business record.
- Invitation and approval flows:
  Invite owners, tenants, family members, staff, and committee members with approval states.
- Payments:
  Add UPI, card, netbanking, and automated reconciliation.
- Notifications:
  Push, SMS, email, and in-app delivery with templates and read receipts.
- Audit and compliance:
  Immutable audit logs, export history, and actor metadata.
- Security and privacy:
  Encrypt PII, add consent surfaces, and make KYC optional and policy-driven.
- Offline support:
  Especially important for guard desks, staff entry, and mobile-first society ops.

## Project structure

- `App.tsx`
- `server/`
- `src/components/ui.tsx`
- `src/data/`
- `src/screens/`
- `src/state/AppContext.tsx`
- `src/theme/tokens.ts`
- `src/types/domain.ts`
- `src/utils/selectors.ts`
- `docs/product-foundation.md`
