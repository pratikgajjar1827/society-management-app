import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

import { AccountRoleSelectionScreen } from './src/screens/AccountRoleSelectionScreen';
import { AdminShell } from './src/screens/admin/AdminShell';
import { AuthScreen } from './src/screens/AuthScreen';
import { ResidentShell } from './src/screens/resident/ResidentShell';
import { RoleSelectionScreen } from './src/screens/RoleSelectionScreen';
import { SocietyEnrollmentScreen } from './src/screens/SocietyEnrollmentScreen';
import { SocietySetupWizardScreen } from './src/screens/SocietySetupWizardScreen';
import { WorkspaceSelectionScreen } from './src/screens/WorkspaceSelectionScreen';
import { AppProvider, useApp } from './src/state/AppContext';
import { palette, spacing } from './src/theme/tokens';

function AppRoot() {
  const { state } = useApp();

  if (state.isHydrating) {
    return (
      <View style={styles.loadingScreen}>
        <Text style={styles.loadingEyebrow}>SocietyOS</Text>
        <Text style={styles.loadingTitle}>Connecting to local backend</Text>
        <Text style={styles.loadingBody}>
          Loading workspace data from SQLite. If this takes too long, start the API with `npm run server`.
        </Text>
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
      screen = state.session.selectedProfile === 'admin' ? <AdminShell /> : <ResidentShell />;
      break;
    case 'auth':
    default:
      screen = <AuthScreen />;
      break;
  }

  return (
    <View style={styles.appShell}>
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
      {screen}
    </View>
  );
}

export default function App() {
  return (
    <AppProvider>
      <StatusBar style="light" backgroundColor={palette.primary} />
      <AppRoot />
    </AppProvider>
  );
}

const styles = StyleSheet.create({
  appShell: {
    flex: 1,
    backgroundColor: palette.background,
  },
  loadingScreen: {
    flex: 1,
    backgroundColor: palette.primary,
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    gap: spacing.md,
  },
  loadingEyebrow: {
    color: '#DCEBE4',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  loadingTitle: {
    color: palette.white,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
  },
  loadingBody: {
    color: '#DCEBE4',
    fontSize: 15,
    lineHeight: 23,
  },
  banner: {
    backgroundColor: '#FFF4D7',
    borderBottomColor: '#E3C16F',
    borderBottomWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  bannerText: {
    color: '#6F4B00',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  noticeBanner: {
    backgroundColor: '#E7F5EE',
    borderBottomColor: '#8EC3A8',
    borderBottomWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  noticeBannerText: {
    color: '#1F5A3D',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
});
