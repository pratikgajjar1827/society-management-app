import { ReactNode, createContext, useContext, useEffect, useState } from 'react';

import {
  assignChairmanResidence as assignChairmanResidenceRequest,
  captureResidentUpiPayment as captureResidentUpiPaymentRequest,
  createAnnouncement as createAnnouncementRequest,
  createAmenityBooking as createAmenityBookingRequest,
  createComplaintTicket as createComplaintTicketRequest,
  createEntryLogRecord as createEntryLogRecordRequest,
  createExpenseRecord as createExpenseRecordRequest,
  createSecurityGuard as createSecurityGuardRequest,
  createSocietyWorkspace as createSocietyWorkspaceRequest,
  createStaffVerification as createStaffVerificationRequest,
  deleteSocietyWorkspace as deleteSocietyWorkspaceRequest,
  enrollIntoSociety as enrollIntoSocietyRequest,
  fetchBootstrapData,
  getApiBaseUrl,
  localFallbackSnapshot,
  markAnnouncementRead as markAnnouncementReadRequest,
  requestOtp as requestOtpRequest,
  recordManualPayment as recordManualPaymentRequest,
  reviewAmenityBooking as reviewAmenityBookingRequest,
  reviewResidentPayment as reviewResidentPaymentRequest,
  reviewStaffVerification as reviewStaffVerificationRequest,
  reviewJoinRequest as reviewJoinRequestRequest,
  sendMaintenanceReminder as sendMaintenanceReminderRequest,
  submitResidentPayment as submitResidentPaymentRequest,
  updateResidenceProfile as updateResidenceProfileRequest,
  updateMaintenancePlanSettings as updateMaintenancePlanSettingsRequest,
  updateSocietyProfile as updateSocietyProfileRequest,
  updateMaintenanceBillingConfig as updateMaintenanceBillingConfigRequest,
  updateComplaintTicket as updateComplaintTicketRequest,
  verifyOtp as verifyOtpRequest,
  type AnnouncementCreateInput,
  type ResidenceProfileInput,
} from '../api/client';
import {
  AuthChannel,
  AuthChallenge,
  AnnouncementAudience,
  AnnouncementPriority,
  ComplaintCategory,
  EntryStatus,
  EntrySubjectType,
  ExpenseType,
  JoinRequestRole,
  MaintenanceFrequency,
  OnboardingState,
  PaymentMethod,
  RoleProfile,
  SeedData,
  SocietySetupDraft,
  StaffCategory,
  VerificationState,
} from '../types/domain';

type Screen =
  | 'auth'
  | 'portalChoice'
  | 'societyEnrollment'
  | 'workspace'
  | 'setup'
  | 'role'
  | 'dashboard';
type DataSource = 'remote' | 'fallback';

interface ExpenseRecordInput {
  expenseType: ExpenseType;
  title: string;
  amountInr: string;
  incurredOn: string;
  notes?: string;
}

interface ResidentBookingInput {
  amenityId: string;
  unitId?: string;
  date: string;
  startTime: string;
  endTime: string;
  guests: string;
}

interface ResidentPaymentInput {
  invoiceId: string;
  amountInr: string;
  method: PaymentMethod;
  paidAt: string;
  referenceNote?: string;
  proofImageDataUrl?: string;
}

interface ResidentUpiCaptureInput {
  invoiceId: string;
  amountInr: string;
  paidAt: string;
  referenceNote?: string;
}

interface ManualPaymentInput {
  invoiceId: string;
  amountInr: string;
  method: PaymentMethod;
  paidAt: string;
  referenceNote?: string;
}

interface MaintenanceReminderInput {
  invoiceIds: string[];
  unitIds?: string[];
  message?: string;
}

interface MaintenanceBillingConfigInput {
  upiId?: string;
  upiMobileNumber?: string;
  upiPayeeName?: string;
  upiQrCodeDataUrl?: string;
  upiQrPayload?: string;
}

interface MaintenancePlanSettingsInput {
  frequency: MaintenanceFrequency;
  dueDay: string;
  amountInr: string;
  receiptPrefix: string;
}

interface SocietyProfileInput {
  name: string;
  country: string;
  state: string;
  city: string;
  area: string;
  address: string;
  tagline?: string;
}

interface AnnouncementPublishInput {
  title: string;
  body: string;
  photoDataUrl?: string;
  audience: AnnouncementAudience;
  priority: AnnouncementPriority;
}

interface ComplaintTicketInput {
  unitId: string;
  category: ComplaintCategory;
  title: string;
  description: string;
}

interface ComplaintTicketUpdateInput {
  status: 'open' | 'inProgress' | 'resolved';
  assignedTo?: string;
  message?: string;
  photoDataUrl?: string;
}

interface GuardRecordInput {
  name: string;
  phone: string;
  shiftLabel: string;
  vendorName?: string;
  gate: string;
  shiftStart: string;
  shiftEnd: string;
}

interface StaffVerificationInput {
  name: string;
  phone: string;
  category: StaffCategory;
  verificationState: VerificationState;
  employerUnitCodes: string[];
  serviceLabel: string;
  visitsPerWeek: string;
}

interface EntryLogInput {
  subjectType: EntrySubjectType;
  subjectName: string;
  unitCode?: string;
  status: EntryStatus;
}

interface SocietyMutationResponse {
  currentUserId: string;
  chairmanAssigned: boolean;
  amenityLibrary: string[];
  defaultSetupDraft: SocietySetupDraft;
  onboarding: OnboardingState;
  data: SeedData;
  societyId: string;
}

interface SessionState {
  userId?: string;
  sessionToken?: string;
  authChannel?: AuthChannel;
  verifiedDestination?: string;
  accountRole?: 'superUser' | 'chairman' | 'owner' | 'tenant';
  selectedSocietyId?: string;
  selectedProfile?: RoleProfile;
}

interface AppState {
  screen: Screen;
  session: SessionState;
  data: SeedData;
  chairmanAssigned: boolean;
  amenityLibrary: string[];
  defaultSetupDraft: SocietySetupDraft;
  pendingChallenge?: AuthChallenge;
  onboarding?: OnboardingState;
  isHydrating: boolean;
  isSyncing: boolean;
  apiError?: string;
  noticeMessage?: string;
  dataSource: DataSource;
}

interface AppContextValue {
  state: AppState;
  actions: {
    requestOtp: (destination: string) => Promise<void>;
    verifyOtp: (code: string) => Promise<void>;
    resetAuthFlow: () => void;
    logout: () => void;
    goToPortalSelection: () => void;
    enrollIntoSociety: (
      societyId: string,
      unitIds: string[],
      residentType: JoinRequestRole,
      residenceProfile: ResidenceProfileInput,
    ) => Promise<void>;
    reviewJoinRequest: (joinRequestId: string, decision: 'approve' | 'reject') => Promise<void>;
    startSocietyEnrollment: () => void;
    selectSociety: (societyId: string) => void;
    startSetup: () => Promise<void>;
    cancelSetup: () => void;
    selectProfile: (profile: RoleProfile) => void;
    goToWorkspaces: () => void;
    goToRoleSelection: () => void;
    completeSetup: (draft: SocietySetupDraft) => Promise<void>;
    deleteSocietyWorkspace: (societyId: string) => Promise<boolean>;
    assignChairmanResidence: (
      societyId: string,
      unitIds: string[],
      residentType: 'owner' | 'tenant',
    ) => Promise<boolean>;
    createAmenityBooking: (societyId: string, input: ResidentBookingInput) => Promise<boolean>;
    reviewAmenityBooking: (
      societyId: string,
      bookingId: string,
      status: 'confirmed' | 'waitlisted',
    ) => Promise<boolean>;
    submitResidentPayment: (societyId: string, input: ResidentPaymentInput) => Promise<boolean>;
    captureResidentUpiPayment: (societyId: string, input: ResidentUpiCaptureInput) => Promise<boolean>;
    reviewResidentPayment: (
      societyId: string,
      paymentId: string,
      decision: 'approve' | 'reject',
    ) => Promise<boolean>;
    recordManualPayment: (societyId: string, input: ManualPaymentInput) => Promise<boolean>;
    createComplaintTicket: (societyId: string, input: ComplaintTicketInput) => Promise<boolean>;
    updateComplaintTicket: (
      societyId: string,
      complaintId: string,
      input: ComplaintTicketUpdateInput,
    ) => Promise<boolean>;
    createAnnouncement: (societyId: string, input: AnnouncementPublishInput) => Promise<boolean>;
    sendMaintenanceReminder: (societyId: string, input: MaintenanceReminderInput) => Promise<boolean>;
    markAnnouncementRead: (societyId: string, announcementId: string) => Promise<boolean>;
    updateSocietyProfile: (societyId: string, input: SocietyProfileInput) => Promise<boolean>;
    updateResidenceProfile: (societyId: string, input: ResidenceProfileInput) => Promise<boolean>;
    updateMaintenanceBillingConfig: (
      societyId: string,
      planId: string,
      input: MaintenanceBillingConfigInput,
    ) => Promise<boolean>;
    updateMaintenancePlanSettings: (
      societyId: string,
      planId: string,
      input: MaintenancePlanSettingsInput,
    ) => Promise<boolean>;
    createExpenseRecord: (societyId: string, input: ExpenseRecordInput) => Promise<boolean>;
    createSecurityGuard: (societyId: string, input: GuardRecordInput) => Promise<boolean>;
    createStaffVerification: (societyId: string, input: StaffVerificationInput) => Promise<boolean>;
    submitResidentStaffVerification: (
      societyId: string,
      input: Omit<StaffVerificationInput, 'verificationState'>,
    ) => Promise<boolean>;
    reviewStaffVerification: (
      societyId: string,
      staffId: string,
      verificationState: 'verified' | 'expired',
    ) => Promise<boolean>;
    createEntryLogRecord: (societyId: string, input: EntryLogInput) => Promise<boolean>;
  };
}

const initialState: AppState = {
  screen: 'auth',
  session: {},
  data: localFallbackSnapshot.data,
  chairmanAssigned: localFallbackSnapshot.chairmanAssigned,
  amenityLibrary: localFallbackSnapshot.amenityLibrary,
  defaultSetupDraft: localFallbackSnapshot.defaultSetupDraft,
  pendingChallenge: undefined,
  onboarding: undefined,
  isHydrating: true,
  isSyncing: false,
  apiError: undefined,
  noticeMessage: undefined,
  dataSource: 'fallback',
};

const AppContext = createContext<AppContextValue | undefined>(undefined);

  function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Unknown application error.';
}

function resolveScreen(onboarding?: OnboardingState): Screen {
  switch (onboarding?.nextStep) {
    case 'createSociety':
      return 'setup';
    case 'joinSociety':
      return 'societyEnrollment';
    case 'workspaceSelection':
      return 'workspace';
    case 'choosePortal':
    default:
      return 'societyEnrollment';
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(initialState);

  useEffect(() => {
    let active = true;

    async function hydrate() {
      try {
        const response = await fetchBootstrapData();

        if (!active) {
          return;
        }

        setState((currentState) => ({
          ...currentState,
          data: response.data,
          chairmanAssigned: response.chairmanAssigned,
          amenityLibrary: response.amenityLibrary,
          defaultSetupDraft: response.defaultSetupDraft,
          isHydrating: false,
          apiError: undefined,
          noticeMessage: undefined,
          dataSource: 'remote',
        }));
      } catch (error) {
        if (!active) {
          return;
        }

        setState((currentState) => ({
          ...currentState,
          isHydrating: false,
          dataSource: 'fallback',
          apiError: `Backend not reachable at ${getApiBaseUrl()}. Start \`npm run server\` to use SQLite-backed data and OTP authentication.`,
          noticeMessage: undefined,
        }));
      }
    }

    hydrate();

    return () => {
      active = false;
    };
  }, []);

  async function runSocietyMutation(
    societyId: string,
    execute: (sessionToken: string) => Promise<SocietyMutationResponse>,
    successMessage: string,
  ) {
    const sessionToken = state.session.sessionToken;

    if (!sessionToken) {
      setState((currentState) => ({
        ...currentState,
        apiError: 'Your session expired. Sign in again.',
        noticeMessage: undefined,
        screen: 'auth',
      }));
      return false;
    }

    if (!societyId) {
      setState((currentState) => ({
        ...currentState,
        apiError: 'Select a society workspace before making admin updates.',
        noticeMessage: undefined,
      }));
      return false;
    }

    setState((currentState) => ({
      ...currentState,
      isSyncing: true,
      apiError: undefined,
      noticeMessage: undefined,
    }));

    try {
      const response = await execute(sessionToken);

      setState((currentState) => ({
        ...currentState,
        data: response.data,
        chairmanAssigned: response.chairmanAssigned,
        amenityLibrary: response.amenityLibrary,
        defaultSetupDraft: response.defaultSetupDraft,
        onboarding: response.onboarding,
        isSyncing: false,
        apiError: undefined,
        noticeMessage: successMessage,
        dataSource: 'remote',
        session: {
          ...currentState.session,
          userId: response.currentUserId,
          selectedSocietyId: response.societyId,
        },
      }));

      return true;
    } catch (error) {
      setState((currentState) => ({
        ...currentState,
        isSyncing: false,
        apiError: getErrorMessage(error),
        noticeMessage: undefined,
      }));
      return false;
    }
  }

  const actions: AppContextValue['actions'] = {
    requestOtp: async (destination) => {
      setState((currentState) => ({
        ...currentState,
        isSyncing: true,
        apiError: undefined,
        noticeMessage: undefined,
        pendingChallenge: undefined,
      }));

      try {
        const challenge = await requestOtpRequest('auto', 'sms', destination);

        setState((currentState) => ({
          ...currentState,
          isSyncing: false,
          pendingChallenge: challenge,
          apiError: undefined,
          noticeMessage: undefined,
          session: {
            ...currentState.session,
            authChannel: challenge.channel,
            verifiedDestination: undefined,
          },
        }));
      } catch (error) {
        setState((currentState) => ({
          ...currentState,
          isSyncing: false,
          apiError: getErrorMessage(error),
          noticeMessage: undefined,
        }));
      }
    },
    verifyOtp: async (code) => {
      const challengeId = state.pendingChallenge?.challengeId;

      if (!challengeId) {
        setState((currentState) => ({
          ...currentState,
          apiError: 'Request an OTP first, then enter the verification code.',
        }));
        return;
      }

      setState((currentState) => ({
        ...currentState,
        isSyncing: true,
        apiError: undefined,
        noticeMessage: undefined,
      }));

      try {
        const response = await verifyOtpRequest('auto', challengeId, code);

        setState((currentState) => ({
          ...currentState,
          data: response.data,
          chairmanAssigned: response.chairmanAssigned,
          amenityLibrary: response.amenityLibrary,
          defaultSetupDraft: response.defaultSetupDraft,
          pendingChallenge: undefined,
          onboarding: response.onboarding,
          screen: resolveScreen(response.onboarding),
          isSyncing: false,
          apiError: undefined,
          noticeMessage: undefined,
          dataSource: 'remote',
          session: {
            userId: response.currentUserId,
            sessionToken: response.sessionToken,
            authChannel: response.verifiedChannel,
            verifiedDestination: response.verifiedDestination,
            accountRole: response.onboarding.preferredRole ?? undefined,
            selectedSocietyId: undefined,
            selectedProfile: undefined,
          },
        }));
      } catch (error) {
        setState((currentState) => ({
          ...currentState,
          isSyncing: false,
          apiError: getErrorMessage(error),
          noticeMessage: undefined,
        }));
      }
    },
    resetAuthFlow: () =>
      setState((currentState) => ({
        ...currentState,
        screen: 'auth',
        pendingChallenge: undefined,
        apiError: undefined,
        noticeMessage: undefined,
        isSyncing: false,
        onboarding: undefined,
        session: {},
      })),
    logout: () =>
      setState((currentState) => ({
        ...currentState,
        screen: 'auth',
        session: {},
        onboarding: undefined,
        pendingChallenge: undefined,
        isSyncing: false,
        apiError: undefined,
        noticeMessage: undefined,
      })),
    goToPortalSelection: () =>
      setState((currentState) => ({
        ...currentState,
        screen: 'portalChoice',
        apiError: undefined,
        noticeMessage: undefined,
        session: {
          ...currentState.session,
          selectedSocietyId: undefined,
          selectedProfile: undefined,
        },
      })),
    enrollIntoSociety: async (societyId, unitIds, residentType, residenceProfile) => {
      const sessionToken = state.session.sessionToken;

      if (!sessionToken) {
        setState((currentState) => ({
          ...currentState,
          apiError: 'Your session expired. Sign in again.',
          screen: 'auth',
        }));
        return;
      }

      if (!societyId) {
        setState((currentState) => ({
          ...currentState,
          apiError: 'Select the society workspace before continuing.',
        }));
        return;
      }

      if (!Array.isArray(unitIds) || unitIds.length === 0) {
        setState((currentState) => ({
          ...currentState,
          apiError: 'Select one or more unit numbers, offices, or spaces before continuing.',
          noticeMessage: undefined,
        }));
        return;
      }

      if (!residentType) {
        setState((currentState) => ({
          ...currentState,
          apiError: 'Choose whether you are joining as an owner or tenant.',
        }));
        return;
      }

      if (!residenceProfile.fullName.trim() || !residenceProfile.moveInDate || !residenceProfile.dataProtectionConsent) {
        setState((currentState) => ({
          ...currentState,
          apiError: 'Fill the basic residence profile and confirm the privacy notice before sending the request.',
          noticeMessage: undefined,
        }));
        return;
      }

      setState((currentState) => ({
        ...currentState,
        isSyncing: true,
        apiError: undefined,
        noticeMessage: undefined,
      }));

      try {
        const response = await enrollIntoSocietyRequest(
          sessionToken,
          societyId,
          unitIds,
          residentType,
          residenceProfile,
        );

        setState((currentState) => ({
          ...currentState,
          data: response.data,
          chairmanAssigned: response.chairmanAssigned,
          amenityLibrary: response.amenityLibrary,
          defaultSetupDraft: response.defaultSetupDraft,
          onboarding: response.onboarding,
          screen: resolveScreen(response.onboarding),
          isSyncing: false,
          apiError: undefined,
          noticeMessage:
            'Your access request has been sent to the chairman for approval. You will be able to enter the workspace after confirmation.',
          session: {
            ...currentState.session,
            accountRole: response.preferredRole,
            selectedSocietyId: undefined,
            selectedProfile: undefined,
          },
        }));
      } catch (error) {
        setState((currentState) => ({
          ...currentState,
          isSyncing: false,
          apiError: getErrorMessage(error),
          noticeMessage: undefined,
        }));
      }
    },
    updateResidenceProfile: async (societyId, input) => {
      const sessionToken = state.session.sessionToken;

      if (!sessionToken) {
        setState((currentState) => ({
          ...currentState,
          apiError: 'Your session expired. Sign in again.',
          noticeMessage: undefined,
          screen: 'auth',
        }));
        return false;
      }

      setState((currentState) => ({
        ...currentState,
        isSyncing: true,
        apiError: undefined,
        noticeMessage: undefined,
      }));

      try {
        const response = await updateResidenceProfileRequest(sessionToken, societyId, input);

        setState((currentState) => ({
          ...currentState,
          data: response.data,
          chairmanAssigned: response.chairmanAssigned,
          amenityLibrary: response.amenityLibrary,
          defaultSetupDraft: response.defaultSetupDraft,
          onboarding: response.onboarding,
          isSyncing: false,
          apiError: undefined,
          noticeMessage: 'Residence profile updated successfully.',
        }));

        return true;
      } catch (error) {
        setState((currentState) => ({
          ...currentState,
          isSyncing: false,
          apiError: getErrorMessage(error),
          noticeMessage: undefined,
        }));
        return false;
      }
    },
    reviewJoinRequest: async (joinRequestId, decision) => {
      const sessionToken = state.session.sessionToken;

      if (!sessionToken) {
        setState((currentState) => ({
          ...currentState,
          apiError: 'Your session expired. Sign in again.',
          noticeMessage: undefined,
          screen: 'auth',
        }));
        return;
      }

      setState((currentState) => ({
        ...currentState,
        isSyncing: true,
        apiError: undefined,
        noticeMessage: undefined,
      }));

      try {
        const response = await reviewJoinRequestRequest(sessionToken, joinRequestId, decision);

        setState((currentState) => ({
          ...currentState,
          data: response.data,
          chairmanAssigned: response.chairmanAssigned,
          amenityLibrary: response.amenityLibrary,
          defaultSetupDraft: response.defaultSetupDraft,
          onboarding: response.onboarding,
          isSyncing: false,
          apiError: undefined,
          noticeMessage:
            decision === 'approve'
              ? 'Join request approved. The requested units are now linked to that member.'
              : 'Join request rejected.',
        }));
      } catch (error) {
        setState((currentState) => ({
          ...currentState,
          isSyncing: false,
          apiError: getErrorMessage(error),
          noticeMessage: undefined,
        }));
      }
    },
    startSocietyEnrollment: () =>
      setState((currentState) => ({
        ...currentState,
        screen: 'societyEnrollment',
        apiError: undefined,
        noticeMessage: undefined,
        session: {
          ...currentState.session,
          selectedSocietyId: undefined,
          selectedProfile: undefined,
        },
      })),
    selectSociety: (societyId) =>
      setState((currentState) => ({
        ...currentState,
        screen: currentState.session.accountRole === 'superUser' ? 'dashboard' : 'role',
        noticeMessage: undefined,
        session: {
          ...currentState.session,
          selectedSocietyId: societyId,
          selectedProfile:
            currentState.session.accountRole === 'superUser' ? 'admin' : undefined,
        },
      })),
    startSetup: async () => {
      if (!state.session.sessionToken) {
        setState((currentState) => ({
          ...currentState,
          apiError: 'Your session expired. Sign in again.',
          screen: 'auth',
        }));
        return;
      }

      if (state.session.accountRole !== 'superUser') {
        setState((currentState) => ({
          ...currentState,
          apiError: 'Only the super user account can create a new society workspace.',
          noticeMessage: undefined,
        }));
        return;
      }

      setState((currentState) => ({
        ...currentState,
        screen: 'setup',
        apiError: undefined,
        noticeMessage: undefined,
        session: {
          ...currentState.session,
          selectedSocietyId: undefined,
          selectedProfile: undefined,
        },
      }));
    },
    cancelSetup: () =>
      setState((currentState) => ({
        ...currentState,
        screen: currentState.onboarding?.membershipsCount ? 'workspace' : 'societyEnrollment',
        apiError: undefined,
        noticeMessage: undefined,
      })),
    selectProfile: (profile) =>
      setState((currentState) => ({
        ...currentState,
        screen: 'dashboard',
        noticeMessage: undefined,
        session: {
          ...currentState.session,
          selectedProfile: profile,
        },
      })),
    goToWorkspaces: () =>
      setState((currentState) => ({
        ...currentState,
        screen: currentState.onboarding?.membershipsCount
          ? 'workspace'
          : currentState.session.sessionToken
            ? resolveScreen(currentState.onboarding)
            : 'auth',
        noticeMessage: undefined,
        session: {
          ...currentState.session,
          selectedSocietyId: undefined,
          selectedProfile: undefined,
        },
      })),
    goToRoleSelection: () =>
      setState((currentState) => ({
        ...currentState,
        screen: currentState.session.accountRole === 'superUser' ? 'workspace' : 'role',
        noticeMessage: undefined,
        session: {
          ...currentState.session,
          selectedProfile:
            currentState.session.accountRole === 'superUser' ? undefined : currentState.session.selectedProfile,
        },
      })),
    completeSetup: async (draft) => {
      const sessionToken = state.session.sessionToken;

      if (!sessionToken) {
        setState((currentState) => ({
          ...currentState,
          apiError: 'Your session expired. Sign in again.',
          screen: 'auth',
        }));
        return;
      }

      setState((currentState) => ({
        ...currentState,
        isSyncing: true,
        apiError: undefined,
        noticeMessage: undefined,
      }));

      try {
        const response = await createSocietyWorkspaceRequest(sessionToken, draft);

        setState((currentState) => ({
          ...currentState,
          data: response.data,
          chairmanAssigned: response.chairmanAssigned,
          amenityLibrary: response.amenityLibrary,
          defaultSetupDraft: response.defaultSetupDraft,
          onboarding: response.onboarding,
          screen: 'role',
          isSyncing: false,
          dataSource: 'remote',
          noticeMessage: undefined,
          session: {
            ...currentState.session,
            userId: response.currentUserId,
            accountRole: response.onboarding.preferredRole ?? currentState.session.accountRole,
            selectedSocietyId: response.societyId,
            selectedProfile: undefined,
          },
        }));
      } catch (error) {
        setState((currentState) => ({
          ...currentState,
          isSyncing: false,
          apiError: getErrorMessage(error),
          noticeMessage: undefined,
        }));
      }
    },
    deleteSocietyWorkspace: async (societyId) => {
      const sessionToken = state.session.sessionToken;

      if (!sessionToken) {
        setState((currentState) => ({
          ...currentState,
          apiError: 'Your session expired. Sign in again.',
          screen: 'auth',
        }));
        return false;
      }

      if (state.session.accountRole !== 'superUser') {
        setState((currentState) => ({
          ...currentState,
          apiError: 'Only the super user account can delete a society workspace.',
          noticeMessage: undefined,
        }));
        return false;
      }

      if (!societyId) {
        setState((currentState) => ({
          ...currentState,
          apiError: 'Choose a society workspace before deleting it.',
          noticeMessage: undefined,
        }));
        return false;
      }

      setState((currentState) => ({
        ...currentState,
        isSyncing: true,
        apiError: undefined,
        noticeMessage: undefined,
      }));

      try {
        const response = await deleteSocietyWorkspaceRequest(sessionToken, societyId);
        const isDeletedSocietySelected = state.session.selectedSocietyId === societyId;

        setState((currentState) => ({
          ...currentState,
          data: response.data,
          chairmanAssigned: response.chairmanAssigned,
          amenityLibrary: response.amenityLibrary,
          defaultSetupDraft: response.defaultSetupDraft,
          onboarding: response.onboarding,
          screen: 'workspace',
          isSyncing: false,
          apiError: undefined,
          noticeMessage: 'Society workspace deleted successfully.',
          dataSource: 'remote',
          session: {
            ...currentState.session,
            userId: response.currentUserId,
            selectedSocietyId: isDeletedSocietySelected
              ? undefined
              : currentState.session.selectedSocietyId,
            selectedProfile: isDeletedSocietySelected
              ? undefined
              : currentState.session.selectedProfile,
          },
        }));

        return true;
      } catch (error) {
        setState((currentState) => ({
          ...currentState,
          isSyncing: false,
          apiError: getErrorMessage(error),
          noticeMessage: undefined,
        }));

        return false;
      }
    },
    assignChairmanResidence: async (societyId, unitIds, residentType) =>
      runSocietyMutation(
        societyId,
        (sessionToken) => assignChairmanResidenceRequest(sessionToken, societyId, unitIds, residentType),
        'Chairman property selection updated.',
      ),
    createAmenityBooking: async (societyId, input) =>
      runSocietyMutation(
        societyId,
        (sessionToken) => createAmenityBookingRequest(sessionToken, societyId, input),
        'Amenity booking request submitted.',
      ),
    reviewAmenityBooking: async (societyId, bookingId, status) =>
      runSocietyMutation(
        societyId,
        (sessionToken) => reviewAmenityBookingRequest(sessionToken, bookingId, status),
        status === 'confirmed'
          ? 'Amenity booking confirmed.'
          : 'Amenity booking moved to the waitlist.',
      ),
    submitResidentPayment: async (societyId, input) =>
      runSocietyMutation(
        societyId,
        (sessionToken) => submitResidentPaymentRequest(sessionToken, societyId, input),
        'Payment update shared with the admin billing desk for verification.',
      ),
    captureResidentUpiPayment: async (societyId, input) =>
      runSocietyMutation(
        societyId,
        (sessionToken) => captureResidentUpiPaymentRequest(sessionToken, societyId, input),
        'UPI payment recorded and the invoice is now marked paid.',
      ),
    reviewResidentPayment: async (societyId, paymentId, decision) =>
      runSocietyMutation(
        societyId,
        (sessionToken) => reviewResidentPaymentRequest(sessionToken, paymentId, decision),
        decision === 'approve'
          ? 'Resident payment marked captured and the maintenance receipt is ready.'
          : 'Resident payment submission rejected.',
      ),
    recordManualPayment: async (societyId, input) =>
      runSocietyMutation(
        societyId,
        (sessionToken) => recordManualPaymentRequest(sessionToken, societyId, input),
        'Manual payment recorded and marked paid in billing.',
      ),
    createComplaintTicket: async (societyId, input) =>
      runSocietyMutation(
        societyId,
        (sessionToken) => createComplaintTicketRequest(sessionToken, societyId, input),
        'Helpdesk ticket raised successfully.',
      ),
    createAnnouncement: async (societyId, input) =>
      {
        const sessionToken = state.session.sessionToken;

        if (!sessionToken) {
          setState((currentState) => ({
            ...currentState,
            apiError: 'Your session expired. Sign in again.',
            noticeMessage: undefined,
            screen: 'auth',
          }));
          return false;
        }

        if (!societyId) {
          setState((currentState) => ({
            ...currentState,
            apiError: 'Select a society workspace before publishing announcements.',
            noticeMessage: undefined,
          }));
          return false;
        }

        setState((currentState) => ({
          ...currentState,
          isSyncing: true,
          apiError: undefined,
          noticeMessage: undefined,
        }));

        try {
          const response = await createAnnouncementRequest(
            sessionToken,
            societyId,
            input as AnnouncementCreateInput,
          );

          setState((currentState) => ({
            ...currentState,
            data: response.data,
            chairmanAssigned: response.chairmanAssigned,
            amenityLibrary: response.amenityLibrary,
            defaultSetupDraft: response.defaultSetupDraft,
            onboarding: response.onboarding,
            isSyncing: false,
            apiError: undefined,
            noticeMessage: 'Announcement published to the selected audience.',
            dataSource: 'remote',
            session: {
              ...currentState.session,
              userId: response.currentUserId,
              selectedSocietyId: response.societyId,
            },
          }));

          return true;
        } catch (error) {
          const message = getErrorMessage(error);

          if (message === 'Route not found.') {
            setState((currentState) => ({
              ...currentState,
              isSyncing: false,
              apiError:
                'Announcements could not be sent because the backend is still running an older route map. Restart the backend and send again.',
              noticeMessage: undefined,
            }));

            return false;
          }

          setState((currentState) => ({
            ...currentState,
            isSyncing: false,
            apiError: message,
            noticeMessage: undefined,
          }));

          return false;
        }
      },
    updateComplaintTicket: async (societyId, complaintId, input) =>
      runSocietyMutation(
        societyId,
        (sessionToken) => updateComplaintTicketRequest(sessionToken, complaintId, input),
        input.message?.trim() || input.photoDataUrl
          ? 'Helpdesk update posted.'
          : input.status === 'resolved'
            ? 'Helpdesk ticket marked resolved.'
            : input.status === 'inProgress'
              ? 'Helpdesk ticket moved to in progress.'
              : 'Helpdesk ticket reopened.',
      ),
    sendMaintenanceReminder: async (societyId, input) =>
      runSocietyMutation(
        societyId,
        (sessionToken) => sendMaintenanceReminderRequest(sessionToken, societyId, input),
        'Maintenance reminder sent to the selected unpaid residents.',
      ),
    markAnnouncementRead: async (societyId, announcementId) => {
      const sessionToken = state.session.sessionToken;

      if (!sessionToken) {
        setState((currentState) => ({
          ...currentState,
          apiError: 'Your session expired. Sign in again.',
          noticeMessage: undefined,
          screen: 'auth',
        }));
        return false;
      }

      setState((currentState) => ({
        ...currentState,
        isSyncing: true,
        apiError: undefined,
      }));

      try {
        const response = await markAnnouncementReadRequest(sessionToken, announcementId);

        setState((currentState) => ({
          ...currentState,
          data: response.data,
          chairmanAssigned: response.chairmanAssigned,
          amenityLibrary: response.amenityLibrary,
          defaultSetupDraft: response.defaultSetupDraft,
          onboarding: response.onboarding,
          isSyncing: false,
          apiError: undefined,
          noticeMessage: undefined,
          dataSource: 'remote',
          session: {
            ...currentState.session,
            userId: response.currentUserId,
            selectedSocietyId: response.societyId,
          },
        }));

        return true;
      } catch (error) {
        setState((currentState) => ({
          ...currentState,
          isSyncing: false,
          apiError: getErrorMessage(error),
          noticeMessage: undefined,
        }));
        return false;
      }
    },
    updateSocietyProfile: async (societyId, input) =>
      runSocietyMutation(
        societyId,
        (sessionToken) => updateSocietyProfileRequest(sessionToken, societyId, input),
        'Society profile updated.',
      ),
    updateMaintenanceBillingConfig: async (societyId, planId, input) =>
      runSocietyMutation(
        societyId,
        (sessionToken) => updateMaintenanceBillingConfigRequest(sessionToken, planId, input),
        'UPI billing settings updated.',
      ),
    updateMaintenancePlanSettings: async (societyId, planId, input) =>
      runSocietyMutation(
        societyId,
        (sessionToken) => updateMaintenancePlanSettingsRequest(sessionToken, planId, input),
        'Maintenance plan updated for future billing cycles.',
      ),
    createExpenseRecord: async (societyId, input) =>
      runSocietyMutation(
        societyId,
        (sessionToken) => createExpenseRecordRequest(sessionToken, societyId, input),
        'Expense record saved in billing.',
      ),
    createSecurityGuard: async (societyId, input) =>
      runSocietyMutation(
        societyId,
        (sessionToken) => createSecurityGuardRequest(sessionToken, societyId, input),
        'Guard roster updated.',
      ),
    createStaffVerification: async (societyId, input) =>
      runSocietyMutation(
        societyId,
        (sessionToken) => createStaffVerificationRequest(sessionToken, societyId, input),
        'Domestic staff verification record added.',
      ),
    submitResidentStaffVerification: async (societyId, input) =>
      runSocietyMutation(
        societyId,
        (sessionToken) =>
          createStaffVerificationRequest(sessionToken, societyId, {
            ...input,
            verificationState: 'pending',
          }),
        'Domestic staff request sent to the chairman for approval.',
      ),
    reviewStaffVerification: async (societyId, staffId, verificationState) =>
      runSocietyMutation(
        societyId,
        (sessionToken) => reviewStaffVerificationRequest(sessionToken, staffId, verificationState),
        verificationState === 'verified'
          ? 'Domestic staff request approved.'
          : 'Domestic staff request marked expired.',
      ),
    createEntryLogRecord: async (societyId, input) =>
      runSocietyMutation(
        societyId,
        (sessionToken) => createEntryLogRecordRequest(sessionToken, societyId, input),
        'Entry log captured.',
      ),
  };

  return <AppContext.Provider value={{ state, actions }}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }

  return context;
}
