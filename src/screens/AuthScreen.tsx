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
  const [reviewAccessKey, setReviewAccessKey] = useState('');
  const { width } = useWindowDimensions();
  const isCompact = width < 768;

  const challenge = state.pendingChallenge;
  const challengeDestination = challenge?.destination || destination.trim();
  const expiryLabel = formatChallengeExpiry(challenge?.expiresAt);
  const primaryActionLabel = challenge
    ? state.isSyncing
      ? 'Verifying OTP...'
      : 'Verify OTP'
    : state.isSyncing
      ? 'Sending OTP...'
      : 'Send OTP';

  useEffect(() => {
    setCode('');
  }, [challenge?.challengeId]);

  useEffect(() => {
    if (!state.playReviewAccessEnabled) {
      setReviewAccessKey('');
    }
  }, [state.playReviewAccessEnabled]);

  useEffect(() => {
    if (challenge?.destination) {
      setDestination(challenge.destination);
    }
  }, [challenge?.challengeId, challenge?.destination]);

  useEffect(() => {
    setDestination(state.session.verifiedDestination ?? '');
    setCode('');
  }, [state.screen, state.session.verifiedDestination]);

  async function handlePrimaryAction() {
    if (challenge) {
      await actions.verifyOtp(code);
      return;
    }

    await actions.requestOtp(destination);
  }

  return (
    <Page>
      <View style={[styles.screenStack, isCompact ? styles.screenStackCompact : null]}>
        <SurfaceCard style={[styles.authSheet, isCompact ? styles.authSheetCompact : null]}>
          <View style={styles.brandBlock}>
            <Text style={styles.brandName}>My Space</Text>
            <Text style={[styles.authTitle, isCompact ? styles.authTitleCompact : null]}>Login</Text>
            <Caption style={styles.authDescription}>Enter mobile number and OTP.</Caption>
          </View>

          <View style={styles.formStack}>
            <InputField
              label="Mobile"
              value={destination}
              onChangeText={setDestination}
              placeholder="+91 98765 43210"
              keyboardType="phone-pad"
              autoCapitalize="none"
            />

            <InputField
              label="OTP"
              value={code}
              onChangeText={(value) => setCode(value.replace(/[^0-9]/g, ''))}
              placeholder="Enter OTP"
              keyboardType="numeric"
            />

            <ActionButton
              label={primaryActionLabel}
              onPress={handlePrimaryAction}
              disabled={
                state.isSyncing
                || destination.trim().length === 0
                || (Boolean(challenge) && code.trim().length < 4)
              }
            />
          </View>

          {state.playReviewAccessEnabled && !challenge ? (
            <View style={styles.reviewAccessCard}>
              <Text style={styles.reviewAccessTitle}>Play review access</Text>
              <Caption style={styles.reviewAccessDescription}>
                Use this only for Google Play review credentials. Regular users should sign in with mobile OTP.
              </Caption>
              <InputField
                label="Review access key"
                value={reviewAccessKey}
                onChangeText={setReviewAccessKey}
                placeholder="Enter configured review key"
                autoCapitalize="none"
                secureTextEntry
              />
              <ActionButton
                label={state.isSyncing ? 'Opening review access...' : 'Open review access'}
                onPress={() => actions.requestPlayReviewAccess(reviewAccessKey)}
                variant="secondary"
                disabled={state.isSyncing || reviewAccessKey.trim().length === 0}
              />
            </View>
          ) : null}

          {challenge ? (
            <View style={styles.statusCard}>
              <Text style={styles.statusTitle}>{`OTP sent to ${challengeDestination || 'your mobile number'}`}</Text>
              <Caption>{expiryLabel}</Caption>
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
            <ActionButton label="Change mobile number" onPress={actions.resetAuthFlow} variant="secondary" />
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
    maxWidth: 420,
    alignSelf: 'center',
    borderRadius: 28,
    backgroundColor: '#FFFDFC',
  },
  authSheetCompact: {
    borderRadius: 24,
  },
  brandBlock: {
    gap: spacing.xs,
    alignItems: 'center',
  },
  brandName: {
    color: palette.primary,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  authTitle: {
    color: palette.ink,
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '800',
  },
  authTitleCompact: {
    fontSize: 20,
    lineHeight: 24,
  },
  authDescription: {
    color: palette.mutedInk,
    fontWeight: '600',
    textAlign: 'center',
  },
  formStack: {
    gap: spacing.sm,
  },
  reviewAccessCard: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#D7E1D6',
    backgroundColor: '#F6FBF6',
    gap: spacing.sm,
  },
  reviewAccessTitle: {
    color: palette.ink,
    fontSize: 15,
    fontWeight: '800',
  },
  reviewAccessDescription: {
    color: palette.mutedInk,
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
  statusTitle: {
    color: palette.ink,
    fontSize: 14,
    fontWeight: '800',
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
});
