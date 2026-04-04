import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { ActionButton, Caption, InputField, Page, SurfaceCard } from '../components/ui';
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
  const developmentOtp = challenge?.provider === 'development' ? challenge.developmentCode ?? '' : '';
  const isDevelopmentFallback = developmentOtp.length > 0;
  const challengeDestination = challenge?.destination || destination.trim();
  const expiryLabel = formatChallengeExpiry(challenge?.expiresAt);

  useEffect(() => {
    setCode('');
  }, [challenge?.challengeId]);

  useEffect(() => {
    if (developmentOtp) {
      setCode(developmentOtp);
    }
  }, [challenge?.challengeId, developmentOtp]);

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
        <SurfaceCard style={[styles.authSheet, isCompact ? styles.authSheetCompact : null]}>
          <View style={styles.authHeader}>
            <Text style={[styles.authTitle, isCompact ? styles.authTitleCompact : null]}>Sign in</Text>
            <Caption style={styles.authDescription}>Use your mobile number to request OTP and verify OTP.</Caption>
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
                {isDevelopmentFallback
                  ? `Local OTP ready for ${challengeDestination || 'your mobile number'}`
                  : `OTP sent to ${challengeDestination || 'your mobile number'}`}
              </Text>
              <Caption>
                {isDevelopmentFallback
                  ? 'Use the OTP shown below, then tap Verify OTP.'
                  : expiryLabel}
              </Caption>
            </View>
          ) : null}

          {isDevelopmentFallback ? (
            <View style={styles.devOtpCard}>
              <Text style={styles.devOtpTitle}>Local OTP</Text>
              <View style={styles.devOtpRow}>
                <Text style={styles.devOtpValue}>{developmentOtp}</Text>
                <ActionButton label="Use OTP" onPress={() => setCode(developmentOtp)} variant="secondary" />
              </View>
            </View>
          ) : null}

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
        </SurfaceCard>
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
  authSheet: {
    gap: spacing.md,
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
    borderRadius: 28,
    backgroundColor: '#FFFDFC',
  },
  authSheetCompact: {
    borderRadius: 24,
  },
  authHeader: {
    gap: 4,
  },
  authTitle: {
    color: palette.ink,
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '900',
  },
  authTitleCompact: {
    fontSize: 24,
    lineHeight: 28,
  },
  authDescription: {
    color: palette.mutedInk,
    fontWeight: '600',
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
  devOtpCard: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#F1D6B7',
    backgroundColor: '#FFF4E4',
    gap: spacing.xs,
  },
  devOtpTitle: {
    color: '#7B4C06',
    fontSize: 14,
    fontWeight: '800',
  },
  devOtpActionStack: {
    gap: spacing.sm,
  },
  devOtpRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
  },
  devOtpValue: {
    minWidth: 120,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 16,
    backgroundColor: '#FFFDF9',
    color: palette.ink,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 2,
  },
});
