import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

import { AccountRoleSelectionScreen } from './src/screens/AccountRoleSelectionScreen';
import { AdminShell } from './src/screens/admin/AdminShell';
import { AuthScreen } from './src/screens/AuthScreen';
import { ResidentShell } from './src/screens/resident/ResidentShell';
import { RoleSelectionScreen } from './src/screens/RoleSelectionScreen';
import { SecurityShell } from './src/screens/security/SecurityShell';
import { SocietyEnrollmentScreen } from './src/screens/SocietyEnrollmentScreen';
import { SocietySetupWizardScreen } from './src/screens/SocietySetupWizardScreen';
import { WorkspaceSelectionScreen } from './src/screens/WorkspaceSelectionScreen';
import { AppProvider, useApp } from './src/state/AppContext';
import { palette, spacing } from './src/theme/tokens';
import { getPendingSecurityGuestRequestsForResident } from './src/utils/selectors';

function AppRoot() {
  const { state } = useApp();
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

  if (state.isHydrating) {
    return (
      <View style={styles.loadingScreen}>
        <Text style={styles.loadingEyebrow}>SocietyOS</Text>
        <Text style={styles.loadingTitle}>Connecting securely</Text>
        <Text style={styles.loadingBody}>
          Loading your workspace and verifying the backend connection.
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
    <View style={styles.appShell}>
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

export default function App() {
  return (
    <AppProvider>
      <StatusBar style="light" backgroundColor={palette.primaryDark} />
      <AppRoot />
    </AppProvider>
  );
}

const styles = StyleSheet.create({
  appShell: {
    flex: 1,
    backgroundColor: palette.background,
  },
  connectionHeaderCompact: {
    gap: spacing.xs,
  },
  connectionCopy: {
    flex: 1,
    gap: 2,
    minWidth: 240,
  },
  connectionCopyCompact: {
    minWidth: 0,
  },
  connectionEyebrow: {
    color: '#795A2B',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  connectionUrl: {
    color: palette.ink,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '800',
  },
  connectionUrlCompact: {
    fontSize: 13,
    lineHeight: 17,
  },
  connectionHint: {
    color: palette.mutedInk,
    fontSize: 11,
    lineHeight: 15,
  },
  connectionStatusPill: {
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderWidth: 1,
  },
  connectionStatusPillCompact: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  connectionStatusPillOnline: {
    backgroundColor: '#E8F6EF',
    borderColor: '#A6D7BD',
  },
  connectionStatusPillOffline: {
    backgroundColor: '#FFF0CF',
    borderColor: '#E3C57D',
  },
  connectionStatusText: {
    fontSize: 12,
    fontWeight: '800',
  },
  connectionStatusTextOnline: {
    color: '#205C40',
  },
  connectionStatusTextOffline: {
    color: '#7B4C06',
  },
  connectionActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  connectionActionsCompact: {
    gap: spacing.xs,
  },
  connectionActionsCollapsed: {
    alignItems: 'flex-start',
  },
  connectionEditor: {
    gap: spacing.sm,
    paddingTop: spacing.xs,
  },
  connectionEditorCompact: {
    paddingTop: spacing.xs,
  },
  connectionHelperText: {
    color: '#6D614E',
    fontSize: 12,
    lineHeight: 18,
  },
  loadingScreen: {
    flex: 1,
    backgroundColor: palette.primaryDark,
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    gap: spacing.md,
  },
  loadingEyebrow: {
    color: '#D6E5F4',
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
    color: '#D6E5F4',
    fontSize: 15,
    lineHeight: 23,
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
