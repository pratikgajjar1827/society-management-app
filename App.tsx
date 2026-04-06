import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BackHandler, Platform, StyleSheet, Text, View } from 'react-native';

import { AccountRoleSelectionScreen } from './src/screens/AccountRoleSelectionScreen';
import { AdminShell } from './src/screens/admin/AdminShell';
import { AuthScreen } from './src/screens/AuthScreen';
import { CreatorWorkspaceScreen } from './src/screens/CreatorWorkspaceScreen';
import { ResidentShell } from './src/screens/resident/ResidentShell';
import { RoleSelectionScreen } from './src/screens/RoleSelectionScreen';
import { SecurityShell } from './src/screens/security/SecurityShell';
import { SocietyCreatorAccessScreen } from './src/screens/SocietyCreatorAccessScreen';
import { SocietyEnrollmentScreen } from './src/screens/SocietyEnrollmentScreen';
import { SocietySetupWizardScreen } from './src/screens/SocietySetupWizardScreen';
import { WorkspaceSelectionScreen } from './src/screens/WorkspaceSelectionScreen';
import { isCreatorAppVariant } from './src/config/appVariant';
import { AppProvider, useApp } from './src/state/AppContext';
import { ThemeProvider, useAppTheme } from './src/theme/appTheme';
import { palette, radius, spacing } from './src/theme/tokens';
import { getPendingSecurityGuestRequestsForResident } from './src/utils/selectors';

function AppRoot() {
  const { state, actions } = useApp();
  const { theme } = useAppTheme();
  const isCreatorApp = isCreatorAppVariant();
  const isAuthScreen = state.screen === 'auth';
  const pendingSecurityApprovals =
    state.session.userId &&
    state.session.selectedSocietyId &&
    state.session.selectedProfile === 'resident'
      ? getPendingSecurityGuestRequestsForResident(
          state.data,
          state.session.userId,
          state.session.selectedSocietyId,
        ).length
      : 0;

  useEffect(() => {
    if (Platform.OS !== 'android') {
      return undefined;
    }

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (state.isHydrating) {
        return true;
      }

      if (isCreatorApp) {
        switch (state.screen) {
          case 'dashboard':
            actions.goToWorkspaces();
            return true;
          case 'setup':
            actions.cancelSetup();
            return true;
          default:
            return false;
        }
      }

      switch (state.screen) {
        case 'role':
          actions.goToWorkspaces();
          return true;
        case 'workspace':
          return false;
        case 'portalChoice':
          return false;
        case 'setup':
          actions.cancelSetup();
          return true;
        default:
          return false;
      }
    });

    return () => subscription.remove();
  }, [actions, isCreatorApp, state.isHydrating, state.screen, state.session.sessionToken]);

  if (state.isHydrating) {
    return (
      <View style={styles.loadingScreen}>
        <View pointerEvents="none" style={styles.loadingBackdrop}>
          <View style={[styles.loadingShape, styles.loadingShapeRear]} />
          <View style={[styles.loadingShape, styles.loadingShapeMid]} />
          <View style={[styles.loadingShape, styles.loadingShapeFront]} />
        </View>

        <View style={styles.loadingMarkWrap}>
          <View style={styles.loadingCubeStack}>
            <View style={[styles.loadingCube, styles.loadingCubeRear]} />
            <View style={[styles.loadingCube, styles.loadingCubeMid]} />
            <View style={[styles.loadingCube, styles.loadingCubeFront]} />
          </View>
          <Text style={styles.loadingTitle}>My Space</Text>
        </View>
      </View>
    );
  }

  if (isCreatorApp) {
    const creatorUnlocked = Boolean(
      state.session.sessionToken &&
      state.session.userId &&
      state.session.accountRole === 'superUser',
    );

    let creatorScreen = <SocietyCreatorAccessScreen />;

    if (creatorUnlocked) {
      switch (state.screen) {
        case 'setup':
          creatorScreen = <SocietySetupWizardScreen />;
          break;
        case 'dashboard':
          creatorScreen = <AdminShell />;
          break;
        case 'workspace':
        case 'role':
        case 'portalChoice':
        case 'societyEnrollment':
        case 'auth':
        default:
          creatorScreen = <CreatorWorkspaceScreen />;
          break;
      }
    }

    return (
      <View style={[styles.appShell, { backgroundColor: theme.background }]}>
        {state.apiError ? (
          <View style={styles.banner}>
            <Text style={styles.bannerText}>{state.apiError}</Text>
          </View>
        ) : null}
        {!state.apiError && state.noticeMessage ? (
          <View style={styles.noticeBanner}>
            <Text style={styles.noticeBannerText}>{state.noticeMessage}</Text>
          </View>
        ) : null}
        {creatorScreen}
      </View>
    );
  }

  let screen = <AuthScreen />;

  switch (state.screen) {
    case 'portalChoice':
      screen = <AccountRoleSelectionScreen />;
      break;
    case 'societyEnrollment':
      screen = <SocietyEnrollmentScreen />;
      break;
    case 'workspace':
      screen = <WorkspaceSelectionScreen />;
      break;
    case 'setup':
      screen = <SocietySetupWizardScreen />;
      break;
    case 'role':
      screen = <RoleSelectionScreen />;
      break;
    case 'dashboard':
      screen =
        state.session.selectedProfile === 'admin'
          ? <AdminShell />
          : state.session.selectedProfile === 'security'
            ? <SecurityShell />
            : <ResidentShell />;
      break;
    case 'auth':
    default:
      screen = <AuthScreen />;
      break;
  }

  return (
    <View style={[styles.appShell, { backgroundColor: theme.background }]}>
      {!isAuthScreen && state.apiError ? (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>{state.apiError}</Text>
        </View>
      ) : null}
      {!isAuthScreen && !state.apiError && state.noticeMessage ? (
        <View style={styles.noticeBanner}>
          <Text style={styles.noticeBannerText}>{state.noticeMessage}</Text>
        </View>
      ) : null}
      {!isAuthScreen && pendingSecurityApprovals > 0 ? (
        <View style={styles.urgentBanner}>
          <Text style={styles.urgentBannerText}>
            {pendingSecurityApprovals === 1
              ? '1 guest approval request is waiting at the gate.'
              : `${pendingSecurityApprovals} guest approval requests are waiting at the gate.`}
          </Text>
        </View>
      ) : null}
      {screen}
    </View>
  );
}

function ThemedAppFrame() {
  const { theme } = useAppTheme();

  return (
    <>
      <StatusBar
        style={theme.mode === 'night' ? 'light' : 'dark'}
        backgroundColor={theme.background}
      />
      <AppRoot />
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppProvider>
          <ThemedAppFrame />
        </AppProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  appShell: {
    flex: 1,
    backgroundColor: palette.background,
  },
  loadingScreen: {
    flex: 1,
    backgroundColor: '#101B26',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    overflow: 'hidden',
    alignItems: 'center',
  },
  loadingBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  loadingShape: {
    position: 'absolute',
    borderRadius: 36,
    transform: [{ rotate: '-18deg' }],
  },
  loadingShapeRear: {
    width: 250,
    height: 250,
    top: 72,
    right: -82,
    backgroundColor: 'rgba(232, 93, 75, 0.12)',
  },
  loadingShapeMid: {
    width: 220,
    height: 220,
    bottom: 120,
    left: -88,
    backgroundColor: 'rgba(76, 122, 179, 0.13)',
  },
  loadingShapeFront: {
    width: 280,
    height: 280,
    bottom: -96,
    right: '10%',
    backgroundColor: 'rgba(211, 161, 63, 0.1)',
  },
  loadingMarkWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
  },
  loadingCubeStack: {
    width: 150,
    height: 124,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingCube: {
    position: 'absolute',
    width: 92,
    height: 92,
    borderRadius: 26,
    borderWidth: 1,
    transform: [{ rotate: '-18deg' }],
  },
  loadingCubeRear: {
    backgroundColor: 'rgba(76, 122, 179, 0.22)',
    borderColor: 'rgba(176, 207, 240, 0.2)',
    top: 8,
    left: 18,
  },
  loadingCubeMid: {
    backgroundColor: 'rgba(232, 93, 75, 0.26)',
    borderColor: 'rgba(255, 199, 190, 0.24)',
    top: 18,
    right: 12,
  },
  loadingCubeFront: {
    backgroundColor: 'rgba(255, 255, 255, 0.82)',
    borderColor: 'rgba(255, 255, 255, 0.62)',
    shadowColor: '#040A10',
    shadowOpacity: 0.22,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
  loadingTitle: {
    color: palette.white,
    fontSize: 40,
    lineHeight: 44,
    fontWeight: '900',
    letterSpacing: 1,
  },
  banner: {
    backgroundColor: '#FFF6E0',
    borderBottomColor: '#E6C981',
    borderBottomWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  bannerText: {
    color: '#775010',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  noticeBanner: {
    backgroundColor: '#E8F6EF',
    borderBottomColor: '#A6D7BD',
    borderBottomWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  noticeBannerText: {
    color: '#205C40',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  urgentBanner: {
    backgroundColor: '#FFF0CF',
    borderBottomColor: '#E3C57D',
    borderBottomWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  urgentBannerText: {
    color: '#7B4C06',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
  },
});
