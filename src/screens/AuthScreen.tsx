import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  ActionButton,
  Caption,
  HeroCard,
  InputField,
  Page,
  SectionHeader,
  SurfaceCard,
} from '../components/ui';
import { useApp } from '../state/AppContext';
import { spacing } from '../theme/tokens';

export function AuthScreen() {
  const { state, actions } = useApp();
  const [destination, setDestination] = useState('');
  const [code, setCode] = useState('');

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
      <HeroCard
        eyebrow="SocietyOS"
        title="Mobile OTP is the only entry point."
        subtitle="Enter your mobile number to continue. After OTP verification, the app will either show your existing society workspaces or guide you to create or join one."
      >
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
      </HeroCard>

      <SurfaceCard>
        <SectionHeader
          title="Verify OTP"
          description="Use the 6-digit code sent to your mobile number."
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
          <Caption>
            Code sent to {challenge.destination}. It remains active until{' '}
            {new Date(challenge.expiresAt).toLocaleTimeString('en-IN', {
              hour: 'numeric',
              minute: '2-digit',
            })}
            .
          </Caption>
        ) : (
          <Caption>Request the OTP first, then enter it here.</Caption>
        )}
        {challenge?.provider === 'development' && challenge.developmentCode ? (
          <Caption style={styles.devHint}>Local development OTP: {challenge.developmentCode}</Caption>
        ) : null}
        {challenge ? (
          <ActionButton label="Use another mobile number" onPress={actions.resetAuthFlow} variant="secondary" />
        ) : null}
      </SurfaceCard>
    </Page>
  );
}

const styles = StyleSheet.create({
  actionStack: {
    gap: spacing.sm,
  },
  devHint: {
    fontWeight: '700',
  },
});
