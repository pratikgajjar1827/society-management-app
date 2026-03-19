# Product Foundation

## Recommended layout strategy

Use one identity system, not three separate login systems.

Recommended user flow:

1. Login with phone OTP or email.
2. Choose society workspace.
3. Choose active profile in that society.
4. Open role-specific home and navigation.

This is the cleanest way to support:

- owner plus committee combinations
- tenant to owner transitions
- one person across multiple societies
- apartments and bungalows in the same platform

## Role-based layout

Resident layout:

- Home
- Notices
- Bookings
- Helpdesk
- Profile

Admin layout:

- Admin Home
- Residents and Units
- Billing
- Amenities
- Security and Staff
- Announcements
- Audit

## Chairman onboarding wizard

The first chairman signup should create a usable society workspace fast.

Recommended steps:

1. Society identity:
   name, address, structure type, timezone
2. Unit model:
   total units, optional towers or blocks, occupancy placeholders
3. Amenities:
   booking model, capacity, approval workflow, blackout rules
4. Maintenance:
   cycle, due date, plan amount, late fee rule, receipt prefix
5. Rules and operations:
   emergency contacts, by-laws, acknowledgements, staff policy

## Foundational entities

- SocietyWorkspace
- Building
- Unit
- User
- Membership
- UnitOccupancy
- Announcement
- RuleDocument
- Amenity
- AmenityScheduleRule
- AmenityBooking
- MaintenancePlan
- Invoice
- Payment
- Receipt
- ComplaintTicket
- StaffProfile
- StaffAssignment
- SecurityGuardProfile
- SecurityShift
- EntryLog

## Priority roadmap

MVP:

- auth
- society setup
- user invitations
- resident notices
- maintenance billing
- complaint tracking
- amenity booking
- staff registry

Phase 2:

- payment gateway integration
- push notifications
- visitor management
- gate pass workflows
- financial exports
- committee approvals

Phase 3:

- advanced ledgers
- vendor work orders
- accounting integrations
- AI-assisted notice drafting
- predictive maintenance analytics

## Non-functional requirements

- strict tenant isolation by `society_id`
- role-based permissions at API and UI layers
- immutable audit events for critical actions
- encrypted personally identifiable information
- attachment scanning and retention policy
- delivery tracking for notifications
- background sync and retry strategy
- analytics separated from transactional data
