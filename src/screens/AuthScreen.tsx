import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { ActionButton, Caption, HeroCard, InputField, Page, Pill, SurfaceCard } from '../components/ui';
import { useApp } from '../state/AppContext';
import { palette, radius, spacing } from '../theme/tokens';

function formatChallengeExpiry(value: string | undefined) {
  if (!value) {
    return 'Expires in about 10 minutes.';
  }

  const parsed = Date.parse(value);

  if (Number.isNaN(parsed)) {
    return 'Expires in about 10 minutes.';
  }

  return `Active until ${new Date(parsed).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })}.`;
}

export function AuthScreen() {
  const { state, actions } = useApp();
  const [destination, setDestination] = useState('');
  const [code, setCode] = useState('');
  const { width } = useWindowDimensions();
  const isCompact = width < 768;

  const challenge = state.pendingChallenge;
  const challengeDestination = challenge?.destination || destination.trim();
  const expiryLabel = formatChallengeExpiry(challenge?.expiresAt);

  useEffect(() => {
    setCode('');
  }, [challenge?.challengeId]);

  useEffect(() => {
    if (challenge?.destination) {
      setDestination(challenge.destination);
    }
  }, [challenge?.challengeId, challenge?.destination]);

  useEffect(() => {
    setDestination(state.session.verifiedDestination ?? '');
    setCode('');
  }, [state.screen, state.session.verifiedDestination]);

  return (
    <Page>
      <View style={[styles.screenStack, isCompact ? styles.screenStackCompact : null]}>
        <View style={[styles.authLayout, isCompact ? styles.authLayoutCompact : null]}>
          <HeroCard
            eyebrow="Society Access"
            title={
              isCompact
                ? 'A sharper first impression for every resident and operator.'
                : 'A secure front door for residents, admins, security teams, and super users.'
            }
            subtitle="One verified mobile number unlocks the right society workspace with OTP protection, faster return access, and a cleaner handoff into daily operations."
            tone="muted"
          >
            <View style={styles.heroPillRow}>
              <Pill label="OTP protected" tone="warning" />
              <Pill label="Role-aware access" tone="accent" />
              <Pill label="Fast re-entry" tone="success" />
            </View>

            <View style={[styles.heroFeatureGrid, isCompact ? styles.heroFeatureGridCompact : null]}>
              <View style={styles.heroFeatureCard}>
                <Text style={styles.heroFeatureValue}>01</Text>
                <Text style={styles.heroFeatureTitle}>Verified onboarding</Text>
                <Caption style={styles.heroFeatureDescription}>
                  Mobile OTP keeps account access simple without passwords or manual provisioning.
                </Caption>
              </View>
              <View style={styles.heroFeatureCard}>
                <Text style={styles.heroFeatureValue}>02</Text>
                <Text style={styles.heroFeatureTitle}>Workspace-aware entry</Text>
                <Caption style={styles.heroFeatureDescription}>
                  The same login can open resident, admin, security, or super-user journeys when permitted.
                </Caption>
              </View>
              <View style={styles.heroFeatureCard}>
                <Text style={styles.heroFeatureValue}>03</Text>
                <Text style={styles.heroFeatureTitle}>Production-ready access</Text>
                <Caption style={styles.heroFeatureDescription}>
                  Live API, live OTP, and remembered sessions deliver a cleaner return experience on phone.
                </Caption>
              </View>
            </View>
          </HeroCard>

          <SurfaceCard style={[styles.authSheet, isCompact ? styles.authSheetCompact : null]}>
            <View style={styles.authHeader}>
              <Pill label={challenge ? 'Step 2 of 2' : 'Step 1 of 2'} tone={challenge ? 'accent' : 'primary'} />
              <Text style={[styles.authTitle, isCompact ? styles.authTitleCompact : null]}>Sign in with your mobile number</Text>
              <Caption style={styles.authDescription}>
                Request a one-time passcode, verify it, and continue directly into the right society workspace.
              </Caption>
            </View>

            <View style={styles.stepRail}>
              <View style={[styles.stepChip, styles.stepChipActive]}>
                <Text style={styles.stepChipNumber}>1</Text>
                <Text style={styles.stepChipLabel}>Request OTP</Text>
              </View>
              <View style={[styles.stepConnector, challenge ? styles.stepConnectorActive : null]} />
              <View style={[styles.stepChip, challenge ? styles.stepChipActive : styles.stepChipMuted]}>
                <Text style={[styles.stepChipNumber, challenge ? styles.stepChipNumberActive : styles.stepChipNumberMuted]}>2</Text>
                <Text style={[styles.stepChipLabel, challenge ? styles.stepChipLabelActive : styles.stepChipLabelMuted]}>
                  Verify access
                </Text>
              </View>
            </View>

            <View style={styles.formStack}>
              <InputField
                label="Mobile number"
                value={destination}
                onChangeText={setDestination}
                placeholder="+91 98765 43210"
                keyboardType="phone-pad"
                autoCapitalize="none"
              />

              <ActionButton
                label={state.isSyncing && !challenge ? 'Sending OTP...' : 'Request OTP'}
                onPress={() => actions.requestOtp(destination)}
                disabled={state.isSyncing || destination.trim().length === 0}
              />

              <InputField
                label="OTP code"
                value={code}
                onChangeText={(value) => setCode(value.replace(/[^0-9]/g, ''))}
                placeholder="Enter the OTP"
                keyboardType="numeric"
              />

              <ActionButton
                label={state.isSyncing && Boolean(challenge) ? 'Verifying OTP...' : 'Verify OTP'}
                onPress={() => actions.verifyOtp(code)}
                disabled={state.isSyncing || !challenge || code.trim().length < 4}
              />
            </View>

            {challenge ? (
              <View style={styles.statusCard}>
                <Text style={styles.statusTitle}>
                  {`OTP sent to ${challengeDestination || 'your mobile number'}`}
                </Text>
                <Caption>{expiryLabel}</Caption>
              </View>
            ) : (
              <View style={styles.infoCard}>
                <Text style={styles.infoTitle}>Secure mobile verification</Text>
                <Caption style={styles.infoText}>
                  The same verified number can reopen your workspace on this device without repeating full setup steps.
                </Caption>
              </View>
            )}

            {state.noticeMessage ? (
              <View style={styles.noticeCard}>
                <Caption style={styles.noticeText}>{state.noticeMessage}</Caption>
              </View>
            ) : null}

            {state.apiError ? (
              <View style={styles.errorCard}>
                <Caption style={styles.errorText}>{state.apiError}</Caption>
              </View>
            ) : null}

            {challenge ? (
              <ActionButton label="Use another mobile number" onPress={actions.resetAuthFlow} variant="secondary" />
            ) : null}

            <Caption style={styles.authFootnote}>
              OTP is used only for identity verification, session recovery, and controlled access to society operations.
            </Caption>
          </SurfaceCard>
        </View>
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  screenStack: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  screenStackCompact: {
    paddingVertical: spacing.md,
  },
  authLayout: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.lg,
  },
  authLayoutCompact: {
    flexDirection: 'column',
    gap: spacing.md,
  },
  authSheet: {
    gap: spacing.md,
    width: '100%',
    maxWidth: 470,
    alignSelf: 'stretch',
    borderRadius: 28,
    backgroundColor: '#FFFDFC',
    flexShrink: 1,
  },
  authSheetCompact: {
    borderRadius: 24,
  },
  authHeader: {
    gap: spacing.xs,
  },
  authTitle: {
    color: palette.ink,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '900',
  },
  authTitleCompact: {
    fontSize: 23,
    lineHeight: 27,
  },
  authDescription: {
    color: palette.mutedInk,
    fontWeight: '600',
  },
  heroPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  heroFeatureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  heroFeatureGridCompact: {
    gap: spacing.xs,
  },
  heroFeatureCard: {
    minWidth: 150,
    flex: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    gap: 4,
  },
  heroFeatureValue: {
    color: '#F7D99D',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  heroFeatureTitle: {
    color: palette.white,
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '800',
  },
  heroFeatureDescription: {
    color: '#D8E4F0',
  },
  stepRail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stepChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderWidth: 1,
  },
  stepChipActive: {
    backgroundColor: '#EDF3FA',
    borderColor: '#D2DEEB',
  },
  stepChipMuted: {
    backgroundColor: '#FBF7F0',
    borderColor: '#E8DDCF',
  },
  stepChipNumber: {
    width: 24,
    height: 24,
    borderRadius: 999,
    textAlign: 'center',
    textAlignVertical: 'center',
    overflow: 'hidden',
    paddingTop: 2,
    backgroundColor: palette.primary,
    color: palette.white,
    fontSize: 12,
    fontWeight: '900',
  },
  stepChipNumberActive: {
    backgroundColor: palette.primary,
    color: palette.white,
  },
  stepChipNumberMuted: {
    backgroundColor: '#E6DDD2',
    color: palette.mutedInk,
  },
  stepChipLabel: {
    color: palette.ink,
    fontSize: 13,
    fontWeight: '800',
  },
  stepChipLabelActive: {
    color: palette.ink,
  },
  stepChipLabelMuted: {
    color: palette.mutedInk,
  },
  stepConnector: {
    flex: 1,
    height: 2,
    borderRadius: 999,
    backgroundColor: '#E7DDCF',
  },
  stepConnectorActive: {
    backgroundColor: '#CEDDEC',
  },
  formStack: {
    gap: spacing.sm,
  },
  statusCard: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#E9DDCF',
    backgroundColor: '#FFF9F1',
    gap: 4,
  },
  infoCard: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#D6E2EE',
    backgroundColor: '#F4F8FC',
    gap: 4,
  },
  infoTitle: {
    color: palette.ink,
    fontSize: 14,
    fontWeight: '800',
  },
  infoText: {
    color: palette.mutedInk,
  },
  noticeCard: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#E2D4B7',
    backgroundColor: '#FFF7E8',
  },
  noticeText: {
    color: '#7B4C06',
    fontWeight: '700',
  },
  errorCard: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#E7B8B2',
    backgroundColor: '#FFF1EF',
  },
  errorText: {
    color: palette.danger,
    fontWeight: '700',
  },
  statusTitle: {
    color: palette.ink,
    fontSize: 14,
    fontWeight: '800',
  },
  authFootnote: {
    color: palette.mutedInk,
    lineHeight: 19,
  },
});
