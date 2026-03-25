import { ReactNode, createContext, useContext, useEffect, useState } from 'react';

import {
  clearPersistedApiBaseUrl,
  assignChairmanResidence as assignChairmanResidenceRequest,
  captureResidentUpiPayment as captureResidentUpiPaymentRequest,
  createAnnouncement as createAnnouncementRequest,
  createAmenityBooking as createAmenityBookingRequest,
  createComplaintTicket as createComplaintTicketRequest,
  createEntryLogRecord as createEntryLogRecordRequest,
  createExpenseRecord as createExpenseRecordRequest,
  createSecurityGuard as createSecurityGuardRequest,
  createSecurityGuestRequest as createSecurityGuestRequestRequest,
  createSocietyWorkspace as createSocietyWorkspaceRequest,
  createStaffVerification as createStaffVerificationRequest,
  createVisitorPass as createVisitorPassRequest,
  deleteSocietyWorkspace as deleteSocietyWorkspaceRequest,
  enrollIntoSociety as enrollIntoSocietyRequest,
  fetchBootstrapData,
  fetchSessionSnapshot as fetchSessionSnapshotRequest,
  getApiBaseUrl,
  getDefaultApiBaseUrl,
  localFallbackSnapshot,
  loadPersistedApiBaseUrl,
  markAnnouncementRead as markAnnouncementReadRequest,
  persistApiBaseUrl,
  requestOtp as requestOtpRequest,
  recordManualPayment as recordManualPaymentRequest,
  reviewAmenityBooking as reviewAmenityBookingRequest,
  reviewResidentPayment as reviewResidentPaymentRequest,
  reviewSecurityGuestRequest as reviewSecurityGuestRequestRequest,
  reviewStaffVerification as reviewStaffVerificationRequest,
  reviewJoinRequest as reviewJoinRequestRequest,
  sendDirectChatMessage as sendDirectChatMessageRequest,
  sendMaintenanceReminder as sendMaintenanceReminderRequest,
  sendSocietyChatMessage as sendSocietyChatMessageRequest,
  sendSecurityGuestMessage as sendSecurityGuestMessageRequest,
  submitResidentPayment as submitResidentPaymentRequest,
  ringSecurityGuestRequest as ringSecurityGuestRequestRequest,
  updateResidenceProfile as updateResidenceProfileRequest,
  updateMaintenancePlanSettings as updateMaintenancePlanSettingsRequest,
  updateSocietyProfile as updateSocietyProfileRequest,
  updateMaintenanceBillingConfig as updateMaintenanceBillingConfigRequest,
  updateComplaintTicket as updateComplaintTicketRequest,
  updateSecurityGuestRequestStatus as updateSecurityGuestRequestStatusRequest,
  updateVisitorPassStatus as updateVisitorPassStatusRequest,
  verifyOtp as verifyOtpRequest,
  type AnnouncementCreateInput,
  type ResidenceProfileInput,
  type SecurityGuestRequestCreateInput,
  type VisitorPassCreateInput,
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
  SecurityGuestRequestStatus,
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

interface SecurityGuestDecisionInput {
  decision: 'approve' | 'deny';
  note?: string;
}

interface SecurityGuestStatusInput {
  status: SecurityGuestRequestStatus;
  note?: string;
}

interface SecurityGuestMessageInput {
  message: string;
}

interface SecurityGuestRingInput {
  note?: string;
}

interface SocietyChatMessageInput {
  message: string;
}

interface VisitorPassStatusInput {
  status: 'scheduled' | 'checkedIn' | 'completed' | 'cancelled';
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
  apiBaseUrl: string;
  hasCustomApiBaseUrl: boolean;
  apiError?: string;
  noticeMessage?: string;
  dataSource: DataSource;
}

interface AppContextValue {
  state: AppState;
  actions: {
    requestOtp: (destination: string) => Promise<void>;
    loginWithDevelopmentOtp: (destination: string) => Promise<void>;
    verifyOtp: (code: string) => Promise<void>;
    retryBackendConnection: () => Promise<boolean>;
    saveApiBaseUrl: (value: string) => Promise<boolean>;
    resetApiBaseUrl: () => Promise<boolean>;
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
    createSecurityGuestRequest: (
      societyId: string,
      input: SecurityGuestRequestCreateInput,
    ) => Promise<boolean>;
    reviewSecurityGuestRequest: (
      societyId: string,
      requestId: string,
      input: SecurityGuestDecisionInput,
    ) => Promise<boolean>;
    updateSecurityGuestRequestStatus: (
      societyId: string,
      requestId: string,
      input: SecurityGuestStatusInput,
    ) => Promise<boolean>;
    sendSecurityGuestMessage: (
      societyId: string,
      requestId: string,
      input: SecurityGuestMessageInput,
    ) => Promise<boolean>;
    ringSecurityGuestRequest: (
      societyId: string,
      requestId: string,
      input?: SecurityGuestRingInput,
    ) => Promise<boolean>;
    sendSocietyChatMessage: (
      societyId: string,
      input: SocietyChatMessageInput,
    ) => Promise<boolean>;
    sendDirectChatMessage: (
      societyId: string,
      recipientUserId: string,
      input: SocietyChatMessageInput,
    ) => Promise<boolean>;
    createVisitorPass: (societyId: string, input: VisitorPassCreateInput) => Promise<boolean>;
    updateVisitorPassStatus: (
      societyId: string,
      visitorPassId: string,
      input: VisitorPassStatusInput,
    ) => Promise<boolean>;
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
  apiBaseUrl: getApiBaseUrl(),
  hasCustomApiBaseUrl: false,
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

function getBackendUnavailableMessage(apiBaseUrl: string) {
  return `Backend not reachable at ${apiBaseUrl}. Start \`npm run server\` to use SQLite-backed data and OTP authentication.`;
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

  async function refreshBackendConnection({
    loadingMode = 'sync',
    apiBaseUrl = getApiBaseUrl(),
    hasCustomApiBaseUrl = state.hasCustomApiBaseUrl,
    successMessage,
  }: {
    loadingMode?: 'hydrate' | 'sync';
    apiBaseUrl?: string;
    hasCustomApiBaseUrl?: boolean;
    successMessage?: string;
  } = {}) {
    const sessionToken = state.session.sessionToken;

    setState((currentState) => ({
      ...currentState,
      isHydrating: loadingMode === 'hydrate',
      isSyncing: loadingMode === 'sync',
      apiBaseUrl,
      hasCustomApiBaseUrl,
      apiError: undefined,
      noticeMessage: undefined,
    }));

    try {
      const bootstrapResponse = await fetchBootstrapData();
      let sessionResponse:
        | Awaited<ReturnType<typeof fetchSessionSnapshotRequest>>
        | undefined;
      let sessionError: string | undefined;

      if (sessionToken) {
        try {
          sessionResponse = await fetchSessionSnapshotRequest(sessionToken);
        } catch (error) {
          sessionError = getErrorMessage(error);
        }
      }

      setState((currentState) => ({
        ...currentState,
        data: sessionResponse?.data ?? bootstrapResponse.data,
        chairmanAssigned: sessionResponse?.chairmanAssigned ?? bootstrapResponse.chairmanAssigned,
        amenityLibrary: sessionResponse?.amenityLibrary ?? bootstrapResponse.amenityLibrary,
        defaultSetupDraft: sessionResponse?.defaultSetupDraft ?? bootstrapResponse.defaultSetupDraft,
        onboarding: sessionResponse?.onboarding ?? currentState.onboarding,
        isHydrating: false,
        isSyncing: false,
        apiBaseUrl,
        hasCustomApiBaseUrl,
        apiError: sessionError,
        noticeMessage: sessionError ? undefined : successMessage,
        dataSource: 'remote',
        session: sessionResponse
          ? {
              ...currentState.session,
              userId: sessionResponse.currentUserId,
              sessionToken: sessionResponse.sessionToken,
            }
          : currentState.session,
      }));

      return !sessionError;
    } catch (error) {
      setState((currentState) => ({
        ...currentState,
        isHydrating: false,
        isSyncing: false,
        apiBaseUrl,
        hasCustomApiBaseUrl,
        dataSource: 'fallback',
        apiError: getBackendUnavailableMessage(apiBaseUrl),
        noticeMessage: undefined,
      }));

      return false;
    }
  }

  useEffect(() => {
    let active = true;

    async function hydrate() {
      const persistedApiBaseUrl = await loadPersistedApiBaseUrl();

      if (!active) {
        return;
      }

      await refreshBackendConnection({
        loadingMode: 'hydrate',
        apiBaseUrl: persistedApiBaseUrl ?? getDefaultApiBaseUrl(),
        hasCustomApiBaseUrl: Boolean(persistedApiBaseUrl),
      });
    }

    void hydrate();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const sessionToken = state.session.sessionToken;

    if (!sessionToken) {
      return undefined;
    }

    let active = true;
    const activeSessionToken = sessionToken;

    async function refreshSnapshot() {
      try {
        const response = await fetchSessionSnapshotRequest(activeSessionToken);

        if (!active) {
          return;
        }

        setState((currentState) => ({
          ...currentState,
          data: response.data,
          chairmanAssigned: response.chairmanAssigned,
          amenityLibrary: response.amenityLibrary,
          defaultSetupDraft: response.defaultSetupDraft,
          onboarding: response.onboarding,
          apiError: currentState.apiError?.startsWith('Backend not reachable') ? undefined : currentState.apiError,
          dataSource: 'remote',
          session: {
            ...currentState.session,
            userId: response.currentUserId,
            sessionToken: response.sessionToken,
          },
        }));
      } catch (error) {
        if (!active) {
          return;
        }

        setState((currentState) => ({
          ...currentState,
          apiError:
            currentState.apiError ??
            (error instanceof Error ? error.message : 'Could not refresh workspace data.'),
        }));
      }
    }

    void refreshSnapshot();

    const interval = setInterval(() => {
      void refreshSnapshot();
    }, 15000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [state.session.sessionToken, state.apiBaseUrl]);

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
      const message = getErrorMessage(error);

      if (message === 'Route not found.') {
        setState((currentState) => ({
          ...currentState,
          isSyncing: false,
          apiError:
            'This action needs the latest backend routes. Restart the backend and try again.',
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
  }

  const actions: AppContextValue['actions'] = {
    retryBackendConnection: async () =>
      refreshBackendConnection({
        loadingMode: 'sync',
        apiBaseUrl: state.apiBaseUrl,
        hasCustomApiBaseUrl: state.hasCustomApiBaseUrl,
        successMessage: 'Backend connection refreshed.',
      }),
    saveApiBaseUrl: async (value) => {
      const normalizedValue = value.trim();

      if (!normalizedValue) {
        setState((currentState) => ({
          ...currentState,
          apiError: 'Enter the backend URL in the format http://YOUR-LAN-IP:4000.',
          noticeMessage: undefined,
        }));
        return false;
      }

      const nextApiBaseUrl = await persistApiBaseUrl(normalizedValue);

      return refreshBackendConnection({
        loadingMode: 'sync',
        apiBaseUrl: nextApiBaseUrl,
        hasCustomApiBaseUrl: true,
        successMessage: 'Backend URL saved.',
      });
    },
    resetApiBaseUrl: async () => {
      const nextApiBaseUrl = await clearPersistedApiBaseUrl();

      return refreshBackendConnection({
        loadingMode: 'sync',
        apiBaseUrl: nextApiBaseUrl,
        hasCustomApiBaseUrl: false,
        successMessage: 'Backend URL reset to this device default.',
      });
    },
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
          noticeMessage:
            challenge.provider === 'development'
              ? 'SMS delivery is not configured on this backend yet. Use the local development OTP shown on the login screen.'
              : undefined,
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
    loginWithDevelopmentOtp: async (destination) => {
      setState((currentState) => ({
        ...currentState,
        isSyncing: true,
        apiError: undefined,
        noticeMessage: undefined,
        pendingChallenge: undefined,
      }));

      try {
        const challenge = await requestOtpRequest('auto', 'sms', destination);

        if (challenge.provider !== 'development' || !challenge.developmentCode) {
          setState((currentState) => ({
            ...currentState,
            isSyncing: false,
            pendingChallenge: challenge,
            apiError: undefined,
            noticeMessage:
              challenge.provider === 'development'
                ? 'Development OTP is unavailable for this request. Use the regular OTP flow.'
                : 'This backend is using real OTP delivery. Use the regular OTP flow to continue.',
            session: {
              ...currentState.session,
              authChannel: challenge.channel,
              verifiedDestination: undefined,
            },
          }));
          return;
        }

        const response = await verifyOtpRequest('auto', challenge.challengeId, challenge.developmentCode);

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
          noticeMessage: 'Logged in with the backend development OTP shortcut.',
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
        'Guard roster updated. That phone number can now use the Security workspace for this society.',
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
    createSecurityGuestRequest: async (societyId, input) =>
      runSocietyMutation(
        societyId,
        (sessionToken) => createSecurityGuestRequestRequest(sessionToken, societyId, input),
        'Guest captured and sent to the resident for approval.',
      ),
    reviewSecurityGuestRequest: async (societyId, requestId, input) =>
      runSocietyMutation(
        societyId,
        (sessionToken) =>
          reviewSecurityGuestRequestRequest(sessionToken, requestId, input.decision, input.note),
        input.decision === 'approve'
          ? 'Guest approved. Security can check the visitor in now.'
          : 'Guest denied. Security has been updated.',
      ),
    updateSecurityGuestRequestStatus: async (societyId, requestId, input) =>
      runSocietyMutation(
        societyId,
        (sessionToken) =>
          updateSecurityGuestRequestStatusRequest(sessionToken, requestId, input.status, input.note),
        input.status === 'checkedIn'
          ? 'Guest checked in.'
          : input.status === 'completed'
            ? 'Guest checked out and logged.'
            : input.status === 'cancelled'
              ? 'Gate request cancelled.'
              : 'Gate request updated.',
      ),
    sendSecurityGuestMessage: async (societyId, requestId, input) =>
      runSocietyMutation(
        societyId,
        (sessionToken) => sendSecurityGuestMessageRequest(sessionToken, requestId, input),
        'Message sent to the gate approval thread.',
      ),
    ringSecurityGuestRequest: async (societyId, requestId, input = {}) =>
      runSocietyMutation(
        societyId,
        (sessionToken) => ringSecurityGuestRequestRequest(sessionToken, requestId, input),
        'Resident ring sent for faster gate approval.',
      ),
    sendSocietyChatMessage: async (societyId, input) =>
      runSocietyMutation(
        societyId,
        (sessionToken) => sendSocietyChatMessageRequest(sessionToken, societyId, input),
        'Message sent to the society chat.',
      ),
    sendDirectChatMessage: async (societyId, recipientUserId, input) =>
      runSocietyMutation(
        societyId,
        (sessionToken) => sendDirectChatMessageRequest(sessionToken, societyId, recipientUserId, input),
        'Direct message sent.',
      ),
    createVisitorPass: async (societyId, input) =>
      runSocietyMutation(
        societyId,
        (sessionToken) => createVisitorPassRequest(sessionToken, societyId, input),
        'Visitor pass created and shared with the security desk.',
      ),
    updateVisitorPassStatus: async (societyId, visitorPassId, input) =>
      runSocietyMutation(
        societyId,
        (sessionToken) => updateVisitorPassStatusRequest(sessionToken, visitorPassId, input.status),
        input.status === 'checkedIn'
          ? 'Visitor marked checked in.'
          : input.status === 'completed'
            ? 'Visitor marked exited.'
            : input.status === 'cancelled'
              ? 'Visitor pass cancelled.'
              : 'Visitor pass updated.',
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
