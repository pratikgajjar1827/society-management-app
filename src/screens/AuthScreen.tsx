import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import {
  ActionButton,
  Caption,
  InputField,
  Page,
  Pill,
  SectionHeader,
  SurfaceCard,
} from '../components/ui';
import { useApp } from '../state/AppContext';
import { palette, shadow, spacing } from '../theme/tokens';

export function AuthScreen() {
  const { state, actions } = useApp();
  const [destination, setDestination] = useState('');
  const [code, setCode] = useState('');
  const { width } = useWindowDimensions();
  const isCompact = width < 768;

  const challenge = state.pendingChallenge;

  useEffect(() => {
    setCode('');
  }, [challenge?.challengeId]);

  useEffect(() => {
    setDestination('');
    setCode('');
  }, [state.screen]);

  return (
    <Page>
      <SurfaceCard style={[styles.entryHero, isCompact ? styles.entryHeroCompact : null]}>
        <View style={[styles.entryHeroTop, isCompact ? styles.entryHeroTopCompact : null]}>
          <View style={[styles.entryHeroCopy, isCompact ? styles.entryHeroCopyCompact : null]}>
            <View style={styles.entryBadgeRow}>
              <Pill label="Android-first onboarding" tone="warning" />
              <Pill label="One mobile identity" tone="primary" />
            </View>
            <Text style={[styles.entryTitle, isCompact ? styles.entryTitleCompact : null]}>
              Society life should feel like an app, not a form.
            </Text>
            <Caption style={[styles.entryDescription, isCompact ? styles.entryDescriptionCompact : null]}>
              Sign in with one mobile number, jump into your society workspace, and move between resident, admin, or security access without losing the mobile-first feel.
            </Caption>
            <View style={[styles.entryFactRow, isCompact ? styles.entryFactRowCompact : null]}>
              <View style={[styles.entryFactCard, isCompact ? styles.entryFactCardCompact : null]}>
                <Text style={styles.entryFactValue}>Fast</Text>
                <Caption>OTP and workspace in minutes</Caption>
              </View>
              <View style={[styles.entryFactCard, isCompact ? styles.entryFactCardCompact : null]}>
                <Text style={styles.entryFactValue}>Unified</Text>
                <Caption>one login across societies</Caption>
              </View>
              <View style={[styles.entryFactCard, isCompact ? styles.entryFactCardCompact : null]}>
                <Text style={styles.entryFactValue}>Native</Text>
                <Caption>built for touch and quick access</Caption>
              </View>
            </View>
          </View>
          <View style={[styles.entryHeroVisual, isCompact ? styles.entryHeroVisualCompact : null]}>
            <View style={[styles.deviceFrame, isCompact ? styles.deviceFrameCompact : null]}>
              <View style={styles.deviceTopBar} />
              <View style={styles.deviceTilePrimary}>
                <Text style={styles.deviceTileTitle}>Today</Text>
                <Text style={styles.deviceTileValue}>SocietyOS</Text>
              </View>
              <View style={styles.deviceTileRow}>
                <View style={styles.deviceMiniTileAccent} />
                <View style={styles.deviceMiniTileBlue} />
              </View>
              <View style={styles.deviceListCard}>
                <View style={styles.deviceListLineStrong} />
                <View style={styles.deviceListLineSoft} />
                <View style={styles.deviceListLineSoft} />
              </View>
            </View>
          </View>
        </View>

        <View style={[styles.entrySteps, isCompact ? styles.entryStepsCompact : null]}>
          <View style={[styles.entryStep, isCompact ? styles.entryStepCompact : null]}>
            <Text style={styles.entryStepNumber}>01</Text>
            <Caption>Enter your phone number</Caption>
          </View>
          <View style={[styles.entryStep, isCompact ? styles.entryStepCompact : null]}>
            <Text style={styles.entryStepNumber}>02</Text>
            <Caption>Verify the OTP code</Caption>
          </View>
          <View style={[styles.entryStep, isCompact ? styles.entryStepCompact : null]}>
            <Text style={styles.entryStepNumber}>03</Text>
            <Caption>Choose your society experience</Caption>
          </View>
        </View>
      </SurfaceCard>

      <View style={[styles.authGrid, isCompact ? styles.authGridCompact : null]}>
        <SurfaceCard style={[styles.authPanel, isCompact ? styles.authPanelCompact : null]}>
          <SectionHeader
            title="Step 1: Request OTP"
            description="Use your primary number to discover linked society workspaces or begin the guided join flow."
          />
          <InputField
            label="Mobile number"
            value={destination}
            onChangeText={setDestination}
            placeholder="+91 98765 43210"
            keyboardType="phone-pad"
            autoCapitalize="none"
          />

          <View style={styles.actionStack}>
            <ActionButton
              label={state.isSyncing && !challenge ? 'Sending OTP...' : 'Request OTP'}
              onPress={() => actions.requestOtp(destination)}
              disabled={state.isSyncing || destination.trim().length === 0}
            />
          </View>
          <View style={styles.supportPills}>
            <Pill label="Resident login" tone="primary" />
            <Pill label="Admin access" tone="accent" />
            <Pill label="Single mobile identity" tone="warning" />
          </View>
        </SurfaceCard>

        <SurfaceCard style={[styles.authPanel, isCompact ? styles.authPanelCompact : null]}>
          <SectionHeader
            title="Step 2: Verify OTP"
            description="Enter the code and move straight into your mobile workspace."
          />
          <InputField
            label="OTP code"
            value={code}
            onChangeText={(value) => setCode(value.replace(/[^0-9]/g, ''))}
            placeholder="Enter the 6-digit OTP"
            keyboardType="numeric"
          />
          <ActionButton
            label={state.isSyncing && Boolean(challenge) ? 'Verifying OTP...' : 'Verify OTP'}
            onPress={() => actions.verifyOtp(code)}
            disabled={state.isSyncing || !challenge || code.trim().length < 4}
          />
          {challenge ? (
            <View style={styles.statusCard}>
              <Text style={styles.statusTitle}>Code sent to {challenge.destination}</Text>
              <Caption>
                Active until{' '}
                {new Date(challenge.expiresAt).toLocaleTimeString('en-IN', {
                  hour: 'numeric',
                  minute: '2-digit',
                })}
                .
              </Caption>
            </View>
          ) : (
            <View style={styles.statusCard}>
              <Text style={styles.statusTitle}>Waiting for OTP request</Text>
              <Caption>Request the OTP first, then enter it here.</Caption>
            </View>
          )}
          {challenge?.provider === 'development' && challenge.developmentCode ? (
            <Caption style={styles.devHint}>Local development OTP: {challenge.developmentCode}</Caption>
          ) : null}
          {challenge ? (
            <ActionButton label="Use another mobile number" onPress={actions.resetAuthFlow} variant="secondary" />
          ) : null}
        </SurfaceCard>
      </View>

      <SurfaceCard style={styles.assurancePanel}>
        <SectionHeader
          title="One app for residents, committees, and gate teams"
          description="The same login can open resident modules, admin tools, or security access depending on the society role attached to you."
        />
        <View style={styles.supportPills}>
          <Pill label="Create or join society" tone="warning" />
          <Pill label="Workspace aware" tone="primary" />
          <Pill label="Modern mobile experience" tone="accent" />
        </View>
      </SurfaceCard>
    </Page>
  );
}

const styles = StyleSheet.create({
  entryHero: {
    gap: spacing.xl,
    backgroundColor: '#FFF8F0',
  },
  entryHeroCompact: {
    gap: spacing.lg,
  },
  entryHeroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.lg,
    flexWrap: 'wrap',
  },
  entryHeroTopCompact: {
    gap: spacing.md,
    flexDirection: 'column',
  },
  entryHeroCopy: {
    flex: 1,
    minWidth: 260,
    gap: spacing.md,
  },
  entryHeroCopyCompact: {
    minWidth: 0,
  },
  entryBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  entryTitle: {
    color: palette.ink,
    fontSize: 40,
    lineHeight: 46,
    fontWeight: '800',
    maxWidth: 640,
  },
  entryTitleCompact: {
    fontSize: 30,
    lineHeight: 35,
  },
  entryDescription: {
    maxWidth: 660,
    fontSize: 16,
    lineHeight: 24,
  },
  entryDescriptionCompact: {
    fontSize: 14,
    lineHeight: 21,
  },
  entryHeroVisual: {
    minWidth: 180,
    minHeight: 160,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 0,
  },
  entryHeroVisualCompact: {
    width: '100%',
    minWidth: 0,
    alignItems: 'flex-start',
  },
  deviceFrame: {
    width: 188,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#D9C9B5',
    backgroundColor: '#173043',
    padding: spacing.md,
    gap: spacing.sm,
    shadowColor: '#5A4634',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 5,
  },
  deviceFrameCompact: {
    width: 160,
    alignSelf: 'flex-start',
  },
  deviceTopBar: {
    alignSelf: 'center',
    width: 54,
    height: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  deviceTilePrimary: {
    borderRadius: 22,
    backgroundColor: '#24465E',
    padding: spacing.md,
    gap: 4,
  },
  deviceTileTitle: {
    color: '#B6CBDD',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  deviceTileValue: {
    color: palette.white,
    fontSize: 22,
    fontWeight: '800',
  },
  deviceTileRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  deviceMiniTileAccent: {
    flex: 1,
    height: 52,
    borderRadius: 18,
    backgroundColor: '#E98C7B',
  },
  deviceMiniTileBlue: {
    flex: 1,
    height: 52,
    borderRadius: 18,
    backgroundColor: '#8EB7E0',
  },
  deviceListCard: {
    borderRadius: 20,
    backgroundColor: '#FFF7EE',
    padding: spacing.md,
    gap: spacing.xs,
  },
  deviceListLineStrong: {
    width: '70%',
    height: 10,
    borderRadius: 999,
    backgroundColor: '#24465E',
  },
  deviceListLineSoft: {
    width: '100%',
    height: 8,
    borderRadius: 999,
    backgroundColor: '#D8C8B4',
  },
  entryFactRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  entryFactRowCompact: {
    gap: spacing.xs,
  },
  entryFactCard: {
    minWidth: 120,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E8D9C7',
    backgroundColor: '#FFFDF9',
    gap: 2,
  },
  entryFactCardCompact: {
    flex: 1,
    minWidth: 0,
  },
  entryFactValue: {
    color: palette.ink,
    fontSize: 19,
    fontWeight: '800',
  },
  entrySteps: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  entryStepsCompact: {
    gap: spacing.xs,
  },
  entryStep: {
    flexGrow: 1,
    minWidth: 170,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#EADCCB',
    backgroundColor: '#FFFCF8',
    gap: 4,
  },
  entryStepCompact: {
    minWidth: 0,
    flexBasis: '100%',
  },
  entryStepNumber: {
    color: palette.accent,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  authGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },
  authGridCompact: {
    gap: spacing.md,
    flexDirection: 'column',
  },
  authPanel: {
    flex: 1,
    minWidth: 280,
    gap: spacing.md,
  },
  authPanelCompact: {
    minWidth: 0,
    width: '100%',
  },
  actionStack: {
    gap: spacing.sm,
  },
  statusCard: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E9DDCF',
    backgroundColor: '#FFF9F1',
    gap: 4,
  },
  statusTitle: {
    color: palette.ink,
    fontSize: 15,
    fontWeight: '800',
  },
  supportPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  assurancePanel: {
    gap: spacing.md,
    backgroundColor: '#FFFCF8',
    ...shadow.card,
  },
  devHint: {
    fontWeight: '700',
    color: palette.accent,
  },
});
