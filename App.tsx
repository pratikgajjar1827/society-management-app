import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { getDefaultApiBaseUrl } from './src/api/client';
import { ActionButton, InputField } from './src/components/ui';
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

function BackendConnectionPanel() {
  const { state, actions } = useApp();
  const [isExpanded, setIsExpanded] = useState(false);
  const [draftUrl, setDraftUrl] = useState(state.apiBaseUrl);
  const { width } = useWindowDimensions();
  const isCompact = width < 768;

  useEffect(() => {
    setDraftUrl(state.apiBaseUrl);
  }, [state.apiBaseUrl]);

  useEffect(() => {
    if (state.apiError) {
      setIsExpanded(true);
    }
  }, [state.apiError]);

  const showExpandedMeta = isExpanded;
  const showCompactControls = isExpanded;

  return (
    <View style={[styles.connectionPanel, isCompact ? styles.connectionPanelCompact : null]}>
      <View style={[styles.connectionHeader, isCompact ? styles.connectionHeaderCompact : null]}>
        <View style={[styles.connectionCopy, isCompact ? styles.connectionCopyCompact : null]}>
          <Text style={styles.connectionEyebrow}>Backend target</Text>
          <Text
            style={[styles.connectionUrl, isCompact ? styles.connectionUrlCompact : null]}
            numberOfLines={isCompact && !showExpandedMeta ? 1 : 3}
          >
            {state.apiBaseUrl}
          </Text>
          {showExpandedMeta ? (
            <Text style={styles.connectionHint}>
              {state.hasCustomApiBaseUrl
                ? 'Custom phone target saved on this device.'
                : `Default target for this build. Default device URL: ${getDefaultApiBaseUrl()}`}
            </Text>
          ) : (
            <Text style={styles.connectionHint}>Tap edit if this phone should point somewhere else.</Text>
          )}
        </View>
        <View
          style={[
            styles.connectionStatusPill,
            isCompact ? styles.connectionStatusPillCompact : null,
            state.dataSource === 'remote' ? styles.connectionStatusPillOnline : styles.connectionStatusPillOffline,
          ]}
        >
          <Text
            style={[
              styles.connectionStatusText,
              state.dataSource === 'remote' ? styles.connectionStatusTextOnline : styles.connectionStatusTextOffline,
            ]}
          >
            {state.dataSource === 'remote' ? 'Connected' : 'Offline fallback'}
          </Text>
        </View>
      </View>

      {showCompactControls ? (
        <View style={[styles.connectionActions, isCompact ? styles.connectionActionsCompact : null]}>
          <ActionButton
            label={isExpanded ? 'Hide editor' : 'Edit target'}
            onPress={() => setIsExpanded((currentValue) => !currentValue)}
            variant="secondary"
          />
          <ActionButton
            label={state.isSyncing ? 'Checking...' : 'Retry'}
            onPress={() => {
              void actions.retryBackendConnection();
            }}
            variant="secondary"
            disabled={state.isSyncing}
          />
          {state.hasCustomApiBaseUrl && showExpandedMeta ? (
            <ActionButton
              label={state.isSyncing ? 'Resetting...' : 'Use default'}
              onPress={() => {
                void actions.resetApiBaseUrl();
              }}
              variant="secondary"
              disabled={state.isSyncing}
            />
          ) : null}
        </View>
      ) : (
        <View style={[styles.connectionActions, styles.connectionActionsCollapsed]}>
          <ActionButton
            label="Manage"
            onPress={() => setIsExpanded(true)}
            variant="secondary"
          />
        </View>
      )}

      {isExpanded ? (
        <View style={[styles.connectionEditor, isCompact ? styles.connectionEditorCompact : null]}>
          <InputField
            label="Backend URL for this phone"
            value={draftUrl}
            onChangeText={setDraftUrl}
            placeholder="http://192.168.0.4:4000"
            autoCapitalize="none"
          />
          <Text style={styles.connectionHelperText}>
            Use your laptop Wi-Fi IP with port `4000`, for example `http://192.168.0.4:4000`.
          </Text>
          <View style={styles.connectionActions}>
            <ActionButton
              label={state.isSyncing ? 'Saving...' : 'Save and reconnect'}
              onPress={() => {
                void actions.saveApiBaseUrl(draftUrl);
              }}
              disabled={state.isSyncing || !draftUrl.trim()}
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}

function AppRoot() {
  const { state } = useApp();
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
      <BackendConnectionPanel />
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
      {pendingSecurityApprovals > 0 ? (
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
  connectionPanel: {
    backgroundColor: '#FFF9F2',
    borderBottomColor: '#E6D7C3',
    borderBottomWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  connectionPanelCompact: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  connectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
    flexWrap: 'wrap',
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
