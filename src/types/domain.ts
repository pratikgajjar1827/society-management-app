export type SocietyStructure = 'apartment' | 'bungalow';
export type AuthChannel = 'sms' | 'email';
export type AccountRole = 'chairman' | 'owner' | 'tenant';
export type OnboardingNextStep =
  | 'chooseRole'
  | 'chairmanSetup'
  | 'societyEnrollment'
  | 'workspaceSelection';

export type MembershipRole =
  | 'chairman'
  | 'committee'
  | 'owner'
  | 'tenant'
  | 'family'
  | 'authorizedOccupant';

export type RoleProfile = 'resident' | 'admin';

export type AnnouncementAudience = 'all' | 'residents' | 'committee' | 'owners' | 'tenants';
export type AnnouncementPriority = 'critical' | 'high' | 'normal';
export type AmenityBookingType = 'exclusive' | 'capacity' | 'info';
export type ApprovalMode = 'auto' | 'committee';
export type MaintenanceFrequency = 'monthly' | 'quarterly';
export type InvoiceStatus = 'paid' | 'pending' | 'overdue';
export type PaymentMethod = 'upi' | 'netbanking' | 'cash';
export type ComplaintStatus = 'open' | 'inProgress' | 'resolved';
export type ComplaintCategory = 'plumbing' | 'security' | 'billing' | 'cleaning' | 'general';
export type StaffCategory = 'domesticHelp' | 'driver' | 'cook' | 'vendor';
export type VerificationState = 'pending' | 'verified' | 'expired';
export type EntrySubjectType = 'staff' | 'visitor' | 'delivery';
export type EntryStatus = 'inside' | 'exited';

export interface SocietyWorkspace {
  id: string;
  name: string;
  address: string;
  structure: SocietyStructure;
  timezone: string;
  totalUnits: number;
  maintenanceDayOfMonth: number;
  maintenanceAmount: number;
  tagline: string;
  createdAt: string;
}

export interface Building {
  id: string;
  societyId: string;
  name: string;
  sortOrder: number;
}

export interface Unit {
  id: string;
  societyId: string;
  buildingId?: string;
  code: string;
  areaSqft: number;
  occupancyStatus: 'vacant' | 'occupied';
  unitType: 'flat' | 'plot';
}

export interface UserProfile {
  id: string;
  name: string;
  phone: string;
  email: string;
  avatarInitials: string;
}

export interface AuthChallenge {
  challengeId: string;
  channel: AuthChannel;
  destination: string;
  provider: 'twilio' | 'development';
  expiresAt: string;
  developmentCode?: string;
}

export interface OnboardingState {
  preferredRole: AccountRole | null;
  membershipsCount: number;
  nextStep: OnboardingNextStep;
}

export interface Membership {
  id: string;
  userId: string;
  societyId: string;
  roles: MembershipRole[];
  unitIds: string[];
  isPrimary: boolean;
}

export interface UnitOccupancy {
  id: string;
  societyId: string;
  unitId: string;
  userId: string;
  category: 'owner' | 'tenant' | 'family' | 'authorizedOccupant';
  startDate: string;
  endDate?: string;
}

export interface Announcement {
  id: string;
  societyId: string;
  title: string;
  body: string;
  audience: AnnouncementAudience;
  createdAt: string;
  priority: AnnouncementPriority;
  readByUserIds: string[];
}

export interface RuleDocument {
  id: string;
  societyId: string;
  title: string;
  version: string;
  summary?: string;
  publishedAt: string;
  acknowledgementRequired: boolean;
  acknowledgedByUserIds: string[];
}

export interface Amenity {
  id: string;
  societyId: string;
  name: string;
  bookingType: AmenityBookingType;
  approvalMode: ApprovalMode;
  capacity?: number;
  priceInr?: number;
}

export interface AmenityScheduleRule {
  id: string;
  amenityId: string;
  dayGroup: 'weekdays' | 'weekends' | 'allDays';
  slotLabel: string;
  startTime: string;
  endTime: string;
  capacity: number;
  blackoutDates: string[];
}

export interface AmenityBooking {
  id: string;
  amenityId: string;
  societyId: string;
  userId: string;
  unitId?: string;
  date: string;
  startTime: string;
  endTime: string;
  status: 'confirmed' | 'pending' | 'waitlisted';
  guests: number;
}

export interface MaintenancePlan {
  id: string;
  societyId: string;
  frequency: MaintenanceFrequency;
  dueDay: number;
  amountInr: number;
  lateFeeInr: number;
  calculationMethod: 'fixed' | 'areaSlab';
  receiptPrefix: string;
}

export interface Invoice {
  id: string;
  societyId: string;
  unitId: string;
  planId: string;
  periodLabel: string;
  dueDate: string;
  amountInr: number;
  status: InvoiceStatus;
}

export interface Payment {
  id: string;
  societyId: string;
  invoiceId: string;
  amountInr: number;
  method: PaymentMethod;
  paidAt: string;
  status: 'captured' | 'pending';
}

export interface Receipt {
  id: string;
  societyId: string;
  paymentId: string;
  number: string;
  issuedAt: string;
}

export interface ComplaintTicket {
  id: string;
  societyId: string;
  unitId: string;
  createdByUserId: string;
  category: ComplaintCategory;
  title: string;
  status: ComplaintStatus;
  createdAt: string;
  assignedTo?: string;
}

export interface StaffProfile {
  id: string;
  societyId: string;
  name: string;
  phone: string;
  category: StaffCategory;
  verificationState: VerificationState;
  employerUnitIds: string[];
}

export interface StaffAssignment {
  id: string;
  staffId: string;
  societyId: string;
  unitId: string;
  serviceLabel: string;
  visitsPerWeek: number;
  active: boolean;
}

export interface SecurityGuardProfile {
  id: string;
  societyId: string;
  name: string;
  phone: string;
  shiftLabel: string;
  vendorName?: string;
}

export interface SecurityShift {
  id: string;
  guardId: string;
  societyId: string;
  start: string;
  end: string;
  gate: string;
}

export interface EntryLog {
  id: string;
  societyId: string;
  subjectType: EntrySubjectType;
  subjectName: string;
  unitId?: string;
  enteredAt: string;
  status: EntryStatus;
}

export interface SocietySetupDraft {
  societyName: string;
  address: string;
  structure: SocietyStructure;
  totalUnits: string;
  maintenanceDay: string;
  maintenanceAmount: string;
  selectedAmenities: string[];
  rulesSummary: string;
}

export interface SeedData {
  users: UserProfile[];
  societies: SocietyWorkspace[];
  buildings: Building[];
  units: Unit[];
  memberships: Membership[];
  occupancy: UnitOccupancy[];
  announcements: Announcement[];
  rules: RuleDocument[];
  amenities: Amenity[];
  amenityScheduleRules: AmenityScheduleRule[];
  bookings: AmenityBooking[];
  maintenancePlans: MaintenancePlan[];
  invoices: Invoice[];
  payments: Payment[];
  receipts: Receipt[];
  complaints: ComplaintTicket[];
  staffProfiles: StaffProfile[];
  staffAssignments: StaffAssignment[];
  securityGuards: SecurityGuardProfile[];
  securityShifts: SecurityShift[];
  entryLogs: EntryLog[];
}
