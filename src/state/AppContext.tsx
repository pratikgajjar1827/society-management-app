import { ReactNode, createContext, useContext, useEffect, useState } from 'react';

import {
  createSocietyWorkspace as createSocietyWorkspaceRequest,
  fetchBootstrapData,
  getApiBaseUrl,
  localFallbackSnapshot,
} from '../api/client';
import { RoleProfile, SeedData, SocietySetupDraft } from '../types/domain';

type AuthMethod = 'phoneOtp' | 'email';
type Screen = 'auth' | 'workspace' | 'setup' | 'role' | 'dashboard';
type DataSource = 'remote' | 'fallback';

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
  defaultUserId: string;
  isHydrating: boolean;
  isSyncing: boolean;
  apiError?: string;
  dataSource: DataSource;
}

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
    completeSetup: (draft: SocietySetupDraft) => Promise<void>;
  };
}

const initialState: AppState = {
  screen: 'auth',
  session: {},
  data: localFallbackSnapshot.data,
  defaultUserId: localFallbackSnapshot.currentUserId,
  isHydrating: true,
  isSyncing: false,
  apiError: undefined,
  dataSource: 'fallback',
};

const AppContext = createContext<AppContextValue | undefined>(undefined);

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Unknown application error.';
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
          defaultUserId: response.currentUserId,
          isHydrating: false,
          apiError: undefined,
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
          apiError: `Backend not reachable at ${getApiBaseUrl()}. Start \`npm run server\` to use SQLite-backed data.`,
        }));
      }
    }

    hydrate();

    return () => {
      active = false;
    };
  }, []);

  const actions: AppContextValue['actions'] = {
    login: (method) =>
      setState((currentState) => ({
        ...currentState,
        screen: 'workspace',
        session: {
          userId: currentState.defaultUserId,
          authMethod: method,
        },
      })),
    logout: () =>
      setState((currentState) => ({
        ...currentState,
        screen: 'auth',
        session: {},
      })),
    selectSociety: (societyId) =>
      setState((currentState) => ({
        ...currentState,
        screen: 'role',
        session: {
          ...currentState.session,
          selectedSocietyId: societyId,
          selectedProfile: undefined,
        },
      })),
    startSetup: () =>
      setState((currentState) => ({
        ...currentState,
        screen: 'setup',
      })),
    cancelSetup: () =>
      setState((currentState) => ({
        ...currentState,
        screen: 'workspace',
      })),
    selectProfile: (profile) =>
      setState((currentState) => ({
        ...currentState,
        screen: 'dashboard',
        session: {
          ...currentState.session,
          selectedProfile: profile,
        },
      })),
    goToWorkspaces: () =>
      setState((currentState) => ({
        ...currentState,
        screen: 'workspace',
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
        session: {
          ...currentState.session,
          selectedProfile: undefined,
        },
      })),
    completeSetup: async (draft) => {
      const currentUserId = state.session.userId ?? state.defaultUserId;

      if (!currentUserId) {
        return;
      }

      setState((currentState) => ({
        ...currentState,
        isSyncing: true,
        apiError: undefined,
      }));

      try {
        const response = await createSocietyWorkspaceRequest(currentUserId, draft);

        setState((currentState) => ({
          ...currentState,
          data: response.data,
          defaultUserId: response.currentUserId ?? currentState.defaultUserId,
          screen: 'role',
          isSyncing: false,
          dataSource: 'remote',
          session: {
            ...currentState.session,
            userId: currentUserId,
            selectedSocietyId: response.societyId,
            selectedProfile: undefined,
          },
        }));
      } catch (error) {
        setState((currentState) => ({
          ...currentState,
          isSyncing: false,
          apiError: getErrorMessage(error),
        }));
      }
    },
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
