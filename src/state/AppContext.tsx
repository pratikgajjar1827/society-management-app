import { ReactNode, createContext, useContext, useEffect, useState } from 'react';

import {
  assignChairmanResidence as assignChairmanResidenceRequest,
  createAmenityBooking as createAmenityBookingRequest,
  createComplaintTicket as createComplaintTicketRequest,
  createEntryLogRecord as createEntryLogRecordRequest,
  createExpenseRecord as createExpenseRecordRequest,
  createSecurityGuard as createSecurityGuardRequest,
  createSocietyWorkspace as createSocietyWorkspaceRequest,
  createStaffVerification as createStaffVerificationRequest,
  enrollIntoSociety as enrollIntoSocietyRequest,
  fetchBootstrapData,
  getApiBaseUrl,
  localFallbackSnapshot,
  requestOtp as requestOtpRequest,
  reviewAmenityBooking as reviewAmenityBookingRequest,
  reviewResidentPayment as reviewResidentPaymentRequest,
  reviewStaffVerification as reviewStaffVerificationRequest,
  reviewJoinRequest as reviewJoinRequestRequest,
  saveAccountRole,
  sendMaintenanceReminder as sendMaintenanceReminderRequest,
  submitResidentPayment as submitResidentPaymentRequest,
  updateComplaintTicket as updateComplaintTicketRequest,
  verifyOtp as verifyOtpRequest,
} from '../api/client';
import {
  AuthChannel,
  AuthChallenge,
  ComplaintCategory,
  EntryStatus,
  EntrySubjectType,
  ExpenseType,
  JoinRequestRole,
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
}

interface MaintenanceReminderInput {
  invoiceIds: string[];
  message?: string;
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
  accountRole?: 'chairman' | 'owner' | 'tenant';
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
    reviewResidentPayment: (
      societyId: string,
      paymentId: string,
      decision: 'approve' | 'reject',
    ) => Promise<boolean>;
    createComplaintTicket: (societyId: string, input: ComplaintTicketInput) => Promise<boolean>;
    updateComplaintTicket: (
      societyId: string,
      complaintId: string,
      input: ComplaintTicketUpdateInput,
    ) => Promise<boolean>;
    sendMaintenanceReminder: (societyId: string, input: MaintenanceReminderInput) => Promise<boolean>;
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
        screen: 'societyEnrollment',
        apiError: undefined,
        noticeMessage: undefined,
        session: {
          ...currentState.session,
          selectedSocietyId: undefined,
          selectedProfile: undefined,
        },
      })),
    enrollIntoSociety: async (societyId, unitIds, residentType) => {
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

      setState((currentState) => ({
        ...currentState,
        isSyncing: true,
        apiError: undefined,
        noticeMessage: undefined,
      }));

      try {
        const response = await enrollIntoSocietyRequest(sessionToken, societyId, unitIds, residentType);

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
        screen: 'role',
        noticeMessage: undefined,
        session: {
          ...currentState.session,
          selectedSocietyId: societyId,
          selectedProfile: undefined,
        },
      })),
    startSetup: async () => {
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
        const response = await saveAccountRole(sessionToken, 'chairman');

        setState((currentState) => ({
          ...currentState,
          data: response.data,
          chairmanAssigned: response.chairmanAssigned,
          amenityLibrary: response.amenityLibrary,
          defaultSetupDraft: response.defaultSetupDraft,
          onboarding: response.onboarding,
          screen: 'setup',
          isSyncing: false,
          apiError: undefined,
          noticeMessage: undefined,
          session: {
            ...currentState.session,
            accountRole: 'chairman',
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
        screen: 'role',
        noticeMessage: undefined,
        session: {
          ...currentState.session,
          selectedProfile: undefined,
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
            accountRole: 'chairman',
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
        'Payment confirmation sent to the admin billing desk.',
      ),
    reviewResidentPayment: async (societyId, paymentId, decision) =>
      runSocietyMutation(
        societyId,
        (sessionToken) => reviewResidentPaymentRequest(sessionToken, paymentId, decision),
        decision === 'approve'
          ? 'Resident payment marked captured.'
          : 'Resident payment submission rejected.',
      ),
    createComplaintTicket: async (societyId, input) =>
      runSocietyMutation(
        societyId,
        (sessionToken) => createComplaintTicketRequest(sessionToken, societyId, input),
        'Helpdesk ticket raised successfully.',
      ),
    updateComplaintTicket: async (societyId, complaintId, input) =>
      runSocietyMutation(
        societyId,
        (sessionToken) => updateComplaintTicketRequest(sessionToken, complaintId, input),
        input.status === 'resolved'
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
