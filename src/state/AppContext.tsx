import { ReactNode, createContext, useContext, useReducer } from 'react';

import { createAmenitiesFromSelection, createUnitStructure } from '../data/factories';
import { DEMO_USER_ID, seedData } from '../data/seed';
import { RoleProfile, SeedData, SocietySetupDraft } from '../types/domain';

type AuthMethod = 'phoneOtp' | 'email';
type Screen = 'auth' | 'workspace' | 'setup' | 'role' | 'dashboard';

interface SessionState {
  userId?: string;
  authMethod?: AuthMethod;
  selectedSocietyId?: string;
  selectedProfile?: RoleProfile;
}

interface AppState {
  screen: Screen;
  session: SessionState;
  data: SeedData;
}

type Action =
  | { type: 'LOGIN'; method: AuthMethod }
  | { type: 'LOGOUT' }
  | { type: 'SELECT_SOCIETY'; societyId: string }
  | { type: 'START_SETUP' }
  | { type: 'CANCEL_SETUP' }
  | { type: 'SELECT_PROFILE'; profile: RoleProfile }
  | { type: 'GO_TO_WORKSPACES' }
  | { type: 'GO_TO_ROLE_SELECTION' }
  | { type: 'COMPLETE_SETUP'; draft: SocietySetupDraft };

interface AppContextValue {
  state: AppState;
  actions: {
    login: (method: AuthMethod) => void;
    logout: () => void;
    selectSociety: (societyId: string) => void;
    startSetup: () => void;
    cancelSetup: () => void;
    selectProfile: (profile: RoleProfile) => void;
    goToWorkspaces: () => void;
    goToRoleSelection: () => void;
    completeSetup: (draft: SocietySetupDraft) => void;
  };
}

const initialState: AppState = {
  screen: 'auth',
  session: {},
  data: seedData,
};

const AppContext = createContext<AppContextValue | undefined>(undefined);

function nextId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}`;
}

function bootstrapSociety(data: SeedData, userId: string, draft: SocietySetupDraft) {
  const societyId = nextId('society');
  const totalUnits = Math.max(1, Number.parseInt(draft.totalUnits, 10) || 1);
  const maintenanceDay = Math.min(28, Math.max(1, Number.parseInt(draft.maintenanceDay, 10) || 10));
  const maintenanceAmount = Math.max(1000, Number.parseInt(draft.maintenanceAmount, 10) || 5000);
  const structure = createUnitStructure(societyId, draft.structure, totalUnits);
  const amenities = createAmenitiesFromSelection(societyId, draft.selectedAmenities);
  const primaryUnitId = structure.units[0]?.id;
  const now = new Date().toISOString();

  return {
    data: {
      ...data,
      societies: [
        ...data.societies,
        {
          id: societyId,
          name: draft.societyName.trim(),
          address: draft.address.trim(),
          structure: draft.structure,
          timezone: 'Asia/Kolkata',
          totalUnits,
          maintenanceDayOfMonth: maintenanceDay,
          maintenanceAmount,
          tagline:
            draft.structure === 'apartment'
              ? 'New apartment community workspace'
              : 'New bungalow cluster workspace',
          createdAt: now,
        },
      ],
      buildings: [...data.buildings, ...structure.buildings],
      units: [...data.units, ...structure.units],
      memberships: [
        ...data.memberships,
        {
          id: nextId('membership'),
          userId,
          societyId,
          roles: ['chairman', 'owner'] as Array<'chairman' | 'owner'>,
          unitIds: primaryUnitId ? [primaryUnitId] : [],
          isPrimary: false,
        },
      ],
      occupancy: primaryUnitId
        ? [
            ...data.occupancy,
            {
              id: nextId('occupancy'),
              societyId,
              unitId: primaryUnitId,
              userId,
              category: 'owner' as const,
              startDate: now.slice(0, 10),
            },
          ]
        : data.occupancy,
      announcements: [
        ...data.announcements,
        {
          id: nextId('announcement'),
          societyId,
          title: 'Workspace created',
          body: 'Chairman setup is complete. You can now invite owners, tenants, staff, and committee members.',
          audience: 'all' as const,
          createdAt: now,
          priority: 'normal' as const,
          readByUserIds: [userId],
        },
      ],
      rules: [
        ...data.rules,
        {
          id: nextId('rule'),
          societyId,
          title: 'Society rules',
          version: 'v1.0',
          publishedAt: now,
          acknowledgementRequired: true,
          acknowledgedByUserIds: [userId],
        },
      ],
      amenities: [...data.amenities, ...amenities.amenities],
      amenityScheduleRules: [...data.amenityScheduleRules, ...amenities.rules],
      maintenancePlans: [
        ...data.maintenancePlans,
        {
          id: nextId('plan'),
          societyId,
          frequency: 'monthly' as const,
          dueDay: maintenanceDay,
          amountInr: maintenanceAmount,
          lateFeeInr: 250,
          calculationMethod: 'fixed' as const,
          receiptPrefix: draft.societyName.trim().slice(0, 3).toUpperCase(),
        },
      ],
    },
    societyId,
  };
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'LOGIN':
      return {
        ...state,
        screen: 'workspace',
        session: {
          userId: DEMO_USER_ID,
          authMethod: action.method,
        },
      };
    case 'LOGOUT':
      return {
        ...state,
        screen: 'auth',
        session: {},
      };
    case 'SELECT_SOCIETY':
      return {
        ...state,
        screen: 'role',
        session: {
          ...state.session,
          selectedSocietyId: action.societyId,
          selectedProfile: undefined,
        },
      };
    case 'START_SETUP':
      return {
        ...state,
        screen: 'setup',
      };
    case 'CANCEL_SETUP':
      return {
        ...state,
        screen: 'workspace',
      };
    case 'SELECT_PROFILE':
      return {
        ...state,
        screen: 'dashboard',
        session: {
          ...state.session,
          selectedProfile: action.profile,
        },
      };
    case 'GO_TO_WORKSPACES':
      return {
        ...state,
        screen: 'workspace',
        session: {
          ...state.session,
          selectedSocietyId: undefined,
          selectedProfile: undefined,
        },
      };
    case 'GO_TO_ROLE_SELECTION':
      return {
        ...state,
        screen: 'role',
        session: {
          ...state.session,
          selectedProfile: undefined,
        },
      };
    case 'COMPLETE_SETUP': {
      if (!state.session.userId) {
        return state;
      }

      const bootstrapped = bootstrapSociety(state.data, state.session.userId, action.draft);

      return {
        ...state,
        screen: 'role',
        data: bootstrapped.data,
        session: {
          ...state.session,
          selectedSocietyId: bootstrapped.societyId,
          selectedProfile: undefined,
        },
      };
    }
    default:
      return state;
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const value: AppContextValue = {
    state,
    actions: {
      login: (method) => dispatch({ type: 'LOGIN', method }),
      logout: () => dispatch({ type: 'LOGOUT' }),
      selectSociety: (societyId) => dispatch({ type: 'SELECT_SOCIETY', societyId }),
      startSetup: () => dispatch({ type: 'START_SETUP' }),
      cancelSetup: () => dispatch({ type: 'CANCEL_SETUP' }),
      selectProfile: (profile) => dispatch({ type: 'SELECT_PROFILE', profile }),
      goToWorkspaces: () => dispatch({ type: 'GO_TO_WORKSPACES' }),
      goToRoleSelection: () => dispatch({ type: 'GO_TO_ROLE_SELECTION' }),
      completeSetup: (draft) => dispatch({ type: 'COMPLETE_SETUP', draft }),
    },
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }

  return context;
}
