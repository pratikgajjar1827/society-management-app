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
import { palette, radius, spacing } from './src/theme/tokens';
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
        <View pointerEvents="none" style={styles.loadingBackdrop}>
          <View style={[styles.loadingOrb, styles.loadingOrbTop]} />
          <View style={[styles.loadingOrb, styles.loadingOrbMiddle]} />
          <View style={[styles.loadingOrb, styles.loadingOrbBottom]} />
        </View>

        <View style={styles.loadingCard}>
          <View style={styles.loadingBrandRow}>
            <Text style={styles.loadingEyebrow}>SocietyOS</Text>
            <View style={styles.loadingBrandPill}>
              <View style={styles.loadingBrandDot} />
              <Text style={styles.loadingBrandPillText}>Secure startup</Text>
            </View>
          </View>

          <Text style={styles.loadingTitle}>Preparing your secure society workspace.</Text>
          <Text style={styles.loadingBody}>
            Restoring your verified session, refreshing society access, and confirming the live backend connection before the workspace opens.
          </Text>

          <View style={styles.loadingChecklist}>
            <View style={styles.loadingChecklistItem}>
              <View style={styles.loadingChecklistBullet} />
              <Text style={styles.loadingChecklistText}>Verifying the production API connection</Text>
            </View>
            <View style={styles.loadingChecklistItem}>
              <View style={styles.loadingChecklistBullet} />
              <Text style={styles.loadingChecklistText}>Restoring roles, societies, and active access</Text>
            </View>
            <View style={styles.loadingChecklistItem}>
              <View style={styles.loadingChecklistBullet} />
              <Text style={styles.loadingChecklistText}>Preparing resident, admin, and security modules</Text>
            </View>
          </View>

          <View style={styles.loadingPulseRow}>
            <View style={[styles.loadingPulseBar, styles.loadingPulseBarPrimary]} />
            <View style={[styles.loadingPulseBar, styles.loadingPulseBarMuted]} />
            <View style={[styles.loadingPulseBar, styles.loadingPulseBarAccent]} />
          </View>
        </View>
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
  loadingScreen: {
    flex: 1,
    backgroundColor: '#152230',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    overflow: 'hidden',
  },
  loadingBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  loadingOrb: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.92,
  },
  loadingOrbTop: {
    width: 260,
    height: 260,
    top: -70,
    right: -60,
    backgroundColor: 'rgba(232, 93, 75, 0.18)',
  },
  loadingOrbMiddle: {
    width: 210,
    height: 210,
    top: '30%',
    left: -90,
    backgroundColor: 'rgba(76, 122, 179, 0.18)',
  },
  loadingOrbBottom: {
    width: 280,
    height: 280,
    bottom: -110,
    right: '8%',
    backgroundColor: 'rgba(211, 161, 63, 0.14)',
  },
  loadingCard: {
    backgroundColor: 'rgba(15, 28, 40, 0.78)',
    borderWidth: 1,
    borderColor: 'rgba(221, 233, 244, 0.12)',
    borderRadius: radius.xl,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxxl,
    gap: spacing.md,
  },
  loadingBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  loadingEyebrow: {
    color: '#D6E5F4',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  loadingBrandPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  loadingBrandDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: palette.gold,
  },
  loadingBrandPillText: {
    color: '#E7F0F8',
    fontSize: 12,
    fontWeight: '700',
  },
  loadingTitle: {
    color: palette.white,
    fontSize: 42,
    lineHeight: 46,
    fontWeight: '900',
    maxWidth: 420,
  },
  loadingBody: {
    color: '#D6E5F4',
    fontSize: 16,
    lineHeight: 25,
    maxWidth: 560,
  },
  loadingChecklist: {
    gap: spacing.sm,
    paddingTop: spacing.xs,
  },
  loadingChecklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  loadingChecklistBullet: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: palette.blue,
  },
  loadingChecklistText: {
    color: '#E7F0F8',
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '700',
    flex: 1,
  },
  loadingPulseRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingTop: spacing.xs,
  },
  loadingPulseBar: {
    flex: 1,
    height: 8,
    borderRadius: 999,
  },
  loadingPulseBarPrimary: {
    backgroundColor: '#DCE7F2',
  },
  loadingPulseBarMuted: {
    backgroundColor: 'rgba(220, 231, 242, 0.35)',
  },
  loadingPulseBarAccent: {
    backgroundColor: palette.accent,
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
