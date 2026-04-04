export type SocietyStructureOption = 'apartment' | 'bungalow' | 'commercial';
export type SocietyStructure = SocietyStructureOption | 'mixed';
export type CommercialSpaceType = 'shed' | 'office';
export type ApartmentSubtype = 'block';
export type AuthChannel = 'sms' | 'email';
export type AuthIntent = 'signUp' | 'signIn' | 'auto';
export type AccountRole = 'superUser' | 'chairman' | 'owner' | 'tenant';
export type OnboardingNextStep =
  | 'choosePortal'
  | 'createSociety'
  | 'joinSociety'
  | 'workspaceSelection';
export type JoinRequestStatus = 'pending' | 'approved' | 'rejected';
export type JoinRequestRole = 'owner' | 'tenant' | 'committee' | 'chairman';

export type MembershipRole =
  | 'chairman'
  | 'committee'
  | 'owner'
  | 'tenant'
  | 'family'
  | 'authorizedOccupant'
  | 'security';

export type RoleProfile = 'resident' | 'admin' | 'security';

export type AnnouncementAudience = 'all' | 'residents' | 'committee' | 'owners' | 'tenants';
export type AnnouncementPriority = 'critical' | 'high' | 'normal';
export type AmenityBookingType = 'exclusive' | 'capacity' | 'info';
export type AmenityReservationScope = 'timeSlot' | 'fullDay';
export type ApprovalMode = 'auto' | 'committee';
export type MaintenanceFrequency = 'monthly' | 'quarterly';
export type InvoiceStatus = 'paid' | 'pending' | 'overdue';
export type PaymentMethod = 'upi' | 'netbanking' | 'cash';
export type PaymentStatus = 'captured' | 'pending' | 'rejected';
export type ExpenseType = 'maintenance' | 'adhoc';
export type ComplaintStatus = 'open' | 'inProgress' | 'resolved';
export type ComplaintCategory = 'plumbing' | 'security' | 'billing' | 'cleaning' | 'general';
export type StaffCategory = 'domesticHelp' | 'driver' | 'cook' | 'vendor';
export type VerificationState = 'pending' | 'verified' | 'expired';
export type EntrySubjectType = 'staff' | 'visitor' | 'delivery';
export type EntryStatus = 'inside' | 'exited';
export type VehicleType = 'car' | 'bike' | 'scooter';
export type VisitorCategory = 'guest' | 'family' | 'service' | 'delivery';
export type VisitorPassStatus = 'scheduled' | 'checkedIn' | 'completed' | 'cancelled';
export type SecurityGuestRequestStatus =
  | 'pendingApproval'
  | 'approved'
  | 'denied'
  | 'checkedIn'
  | 'completed'
  | 'cancelled';
export type SecurityGuestLogAction =
  | 'created'
  | 'approved'
  | 'denied'
  | 'checkedIn'
  | 'checkedOut'
  | 'cancelled'
  | 'message'
  | 'ringRequested';
export type ChatThreadType = 'society' | 'direct';
export type ImportantContactCategory =
  | 'management'
  | 'security'
  | 'maintenance'
  | 'emergency'
  | 'amenity';
export type SocietyDocumentCategory =
  | 'liftLicense'
  | 'commonLightBill'
  | 'waterBill'
  | 'fireSafety'
  | 'insurance'
  | 'auditReport'
  | 'other';
export type SocietyDocumentDownloadRequestStatus = 'pending' | 'approved' | 'rejected';

export type SocietyMeetingType = 'society' | 'committee' | 'emergency';
export type SocietyMeetingStatus = 'scheduled' | 'completed' | 'cancelled';
export type AgendaVotingStatus = 'notRequired' | 'pending' | 'open' | 'closed';
export type AgendaResolution = 'passed' | 'rejected' | 'deferred';

export interface OfficeFloorPlanEntry {
  blockName?: string;
  floorLabel: string;
  officeNumbers: string;
}

export interface ApartmentBlockPlanEntry {
  blockName: string;
  towerCount: string;
  floorsPerTower: string;
  homesPerFloor: string;
}

export interface ShedBlockPlanEntry {
  blockName: string;
  shedCount: string;
}

export interface SocietyWorkspace {
  id: string;
  name: string;
  country: string;
  state: string;
  city: string;
  area: string;
  address: string;
  structure: SocietyStructure;
  enabledStructures?: SocietyStructureOption[] | null;
  commercialSpaceType?: CommercialSpaceType | null;
  enabledCommercialSpaceTypes?: CommercialSpaceType[] | null;
  apartmentSubtype?: ApartmentSubtype | null;
  apartmentBlockPlan?: ApartmentBlockPlanEntry[] | null;
  apartmentStartingFloorNumber?: number | null;
  apartmentUnitCount?: number | null;
  bungalowUnitCount?: number | null;
  shedUnitCount?: number | null;
  shedBlockPlan?: ShedBlockPlanEntry[] | null;
  officeFloorPlan?: OfficeFloorPlanEntry[] | null;
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
  unitType: 'flat' | 'plot' | 'shed' | 'office';
}

export interface UserProfile {
  id: string;
  name: string;
  phone: string;
  email: string;
  avatarInitials: string;
}

export interface UserAccountProfile {
  userId: string;
  preferredRole: AccountRole | null;
  createdAt: string;
  updatedAt: string;
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
  pendingJoinRequestsCount: number;
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

export interface VehicleRegistration {
  id: string;
  societyId: string;
  userId: string;
  unitId: string;
  registrationNumber: string;
  vehicleType: VehicleType;
  color?: string;
  parkingSlot?: string;
  photoDataUrl?: string;
}

export interface ImportantContact {
  id: string;
  societyId: string;
  category: ImportantContactCategory;
  name: string;
  roleLabel: string;
  phone: string;
  availability?: string;
  notes?: string;
}

export interface LeadershipProfile {
  id: string;
  societyId: string;
  userId: string;
  roleLabel: string;
  displayName: string;
  phone: string;
  email?: string;
  availability?: string;
  bio?: string;
  photoDataUrl?: string;
  updatedAt: string;
}

export interface Announcement {
  id: string;
  societyId: string;
  title: string;
  body: string;
  photoDataUrl?: string | null;
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

export interface SocietyDocument {
  id: string;
  societyId: string;
  category: SocietyDocumentCategory;
  title: string;
  fileName: string;
  fileDataUrl: string;
  summary?: string;
  issuedOn?: string;
  validUntil?: string;
  uploadedByUserId: string;
  uploadedAt: string;
}

export interface SocietyDocumentDownloadRequest {
  id: string;
  societyId: string;
  documentId: string;
  requesterUserId: string;
  status: SocietyDocumentDownloadRequestStatus;
  requestNote?: string;
  requestedAt: string;
  reviewedAt?: string;
  reviewedByUserId?: string;
  reviewNote?: string;
  accessExpiresAt?: string;
}

export interface Amenity {
  id: string;
  societyId: string;
  name: string;
  bookingType: AmenityBookingType;
  reservationScope: AmenityReservationScope;
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
  upiId?: string | null;
  upiMobileNumber?: string | null;
  upiPayeeName?: string | null;
  upiQrCodeDataUrl?: string | null;
  upiQrPayload?: string | null;
  bankAccountName?: string | null;
  bankAccountNumber?: string | null;
  bankIfscCode?: string | null;
  bankName?: string | null;
  bankBranchName?: string | null;
}

export interface ExpenseRecord {
  id: string;
  societyId: string;
  expenseType: ExpenseType;
  title: string;
  amountInr: number;
  incurredOn: string;
  notes?: string;
  createdByUserId: string;
  createdAt: string;
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
  status: PaymentStatus;
  submittedByUserId?: string;
  referenceNote?: string;
  proofImageDataUrl?: string | null;
  reviewedByUserId?: string;
  reviewedAt?: string;
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
  description?: string;
  status: ComplaintStatus;
  createdAt: string;
  assignedTo?: string;
}

export interface ComplaintUpdate {
  id: string;
  complaintId: string;
  societyId: string;
  createdByUserId: string;
  status: ComplaintStatus;
  assignedTo?: string;
  message?: string;
  photoDataUrl?: string;
  createdAt: string;
}

export interface PaymentReminder {
  id: string;
  societyId: string;
  invoiceIds: string[];
  unitIds: string[];
  message: string;
  sentByUserId: string;
  sentAt: string;
}

export interface StaffProfile {
  id: string;
  societyId: string;
  name: string;
  phone: string;
  category: StaffCategory;
  verificationState: VerificationState;
  employerUnitIds: string[];
  requestedByUserId?: string;
  requestedAt?: string;
  reviewedByUserId?: string;
  reviewedAt?: string;
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

export interface VisitorPass {
  id: string;
  societyId: string;
  unitId: string;
  createdByUserId: string;
  visitorName: string;
  phone?: string;
  category: VisitorCategory;
  purpose: string;
  guestCount: number;
  expectedAt: string;
  validUntil: string;
  vehicleNumber?: string;
  notes?: string;
  passCode: string;
  status: VisitorPassStatus;
  createdAt: string;
  checkedInAt?: string;
  checkedOutAt?: string;
  updatedAt: string;
}

export interface SecurityGuestRequest {
  id: string;
  societyId: string;
  unitId: string;
  residentUserId: string;
  createdByUserId: string;
  visitorPassId?: string;
  guestName: string;
  phone?: string;
  category: VisitorCategory;
  purpose: string;
  guestCount: number;
  vehicleNumber?: string;
  guestPhotoDataUrl?: string;
  guestPhotoCapturedAt?: string;
  vehiclePhotoDataUrl?: string;
  vehiclePhotoCapturedAt?: string;
  gateNotes?: string;
  status: SecurityGuestRequestStatus;
  createdAt: string;
  respondedAt?: string;
  respondedByUserId?: string;
  checkedInAt?: string;
  checkedOutAt?: string;
  updatedAt: string;
}

export interface SecurityGuestLog {
  id: string;
  societyId: string;
  requestId: string;
  actorUserId?: string;
  actorRole: RoleProfile | 'system';
  action: SecurityGuestLogAction;
  note?: string;
  createdAt: string;
}

export interface ChatThread {
  id: string;
  societyId: string;
  type: ChatThreadType;
  title?: string;
  createdByUserId?: string;
  participantUserIds: string[];
  directKey?: string;
  createdAt: string;
  lastMessageAt?: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  threadId: string;
  societyId: string;
  senderUserId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface JoinRequest {
  id: string;
  societyId: string;
  userId: string;
  residentType: JoinRequestRole;
  unitIds: string[];
  status: JoinRequestStatus;
  createdAt: string;
  reviewedAt?: string;
  reviewedByUserId?: string;
  reviewNote?: string;
}

export interface ResidenceProfile {
  id: string;
  societyId: string;
  userId: string;
  residentType: JoinRequestRole;
  fullName: string;
  phone: string;
  photoDataUrl?: string;
  email?: string;
  businessName?: string;
  businessDetails?: string;
  alternatePhone?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  secondaryEmergencyContactName?: string;
  secondaryEmergencyContactPhone?: string;
  moveInDate: string;
  dataProtectionConsentAt: string;
  rentAgreementFileName?: string;
  rentAgreementDataUrl?: string;
  rentAgreementUploadedAt?: string;
  updatedAt: string;
}

export interface SocietySetupDraft {
  societyName: string;
  country: string;
  state: string;
  city: string;
  area: string;
  address: string;
  structure: SocietyStructure;
  enabledStructures: SocietyStructureOption[];
  commercialSpaceType: CommercialSpaceType;
  enabledCommercialSpaceTypes: CommercialSpaceType[];
  apartmentSubtype: ApartmentSubtype;
  apartmentBlockPlan: ApartmentBlockPlanEntry[];
  apartmentStartingFloorNumber: string;
  apartmentUnitCount: string;
  bungalowUnitCount: string;
  shedUnitCount: string;
  shedBlockPlan: ShedBlockPlanEntry[];
  officeFloorPlan: OfficeFloorPlanEntry[];
  totalUnits: string;
  maintenanceDay: string;
  maintenanceAmount: string;
  selectedAmenities: string[];
  rulesSummary: string;
}

export interface SocietyMeeting {
  id: string;
  societyId: string;
  title: string;
  meetingType: SocietyMeetingType;
  scheduledAt: string;
  venue: string;
  status: SocietyMeetingStatus;
  minutesDocumentDataUrl?: string | null;
  summary?: string;
  createdByUserId: string;
  createdAt: string;
}

export interface MeetingAgendaItem {
  id: string;
  meetingId: string;
  societyId: string;
  title: string;
  description?: string;
  requiresVoting: boolean;
  votingStatus: AgendaVotingStatus;
  votingDeadline?: string;
  resolution?: AgendaResolution;
  sortOrder: number;
}

export interface MeetingVote {
  id: string;
  agendaItemId: string;
  meetingId: string;
  societyId: string;
  userId: string;
  vote: 'yes' | 'no' | 'abstain';
  castAt: string;
}

export interface MeetingAttendeeSign {
  id: string;
  meetingId: string;
  societyId: string;
  userId: string;
  signatureText: string;
  signedAt: string;
}

export interface SeedData {
  users: UserProfile[];
  userProfiles: UserAccountProfile[];
  societies: SocietyWorkspace[];
  buildings: Building[];
  units: Unit[];
  memberships: Membership[];
  joinRequests: JoinRequest[];
  occupancy: UnitOccupancy[];
  vehicleRegistrations: VehicleRegistration[];
  importantContacts: ImportantContact[];
  leadershipProfiles: LeadershipProfile[];
  announcements: Announcement[];
  rules: RuleDocument[];
  societyDocuments: SocietyDocument[];
  societyDocumentDownloadRequests: SocietyDocumentDownloadRequest[];
  amenities: Amenity[];
  amenityScheduleRules: AmenityScheduleRule[];
  bookings: AmenityBooking[];
  maintenancePlans: MaintenancePlan[];
  expenseRecords: ExpenseRecord[];
  invoices: Invoice[];
  payments: Payment[];
  paymentReminders: PaymentReminder[];
  receipts: Receipt[];
  complaints: ComplaintTicket[];
  complaintUpdates: ComplaintUpdate[];
  residenceProfiles: ResidenceProfile[];
  staffProfiles: StaffProfile[];
  staffAssignments: StaffAssignment[];
  securityGuards: SecurityGuardProfile[];
  securityShifts: SecurityShift[];
  entryLogs: EntryLog[];
  visitorPasses: VisitorPass[];
  securityGuestRequests: SecurityGuestRequest[];
  securityGuestLogs: SecurityGuestLog[];
  chatThreads: ChatThread[];
  chatMessages: ChatMessage[];
  societyMeetings: SocietyMeeting[];
  meetingAgendaItems: MeetingAgendaItem[];
  meetingVotes: MeetingVote[];
  meetingAttendeeSigns: MeetingAttendeeSign[];
}
