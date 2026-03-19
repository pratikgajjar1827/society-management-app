import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  ActionButton,
  Caption,
  ChoiceChip,
  HeroCard,
  InputField,
  Page,
  Pill,
  SectionHeader,
  SurfaceCard,
} from '../components/ui';
import { useApp } from '../state/AppContext';
import { spacing } from '../theme/tokens';
import { AuthChannel } from '../types/domain';

const channelContent: Record<AuthChannel, { label: string; placeholder: string; keyboardType: 'phone-pad' | 'email-address' }> = {
  sms: {
    label: 'Mobile number',
    placeholder: '+91 98765 43210',
    keyboardType: 'phone-pad',
  },
  email: {
    label: 'Email address',
    placeholder: 'you@example.com',
    keyboardType: 'email-address',
  },
};

export function AuthScreen() {
  const { state, actions } = useApp();
  const [channel, setChannel] = useState<AuthChannel>('sms');
  const [destination, setDestination] = useState('');
  const [code, setCode] = useState('');

  const challenge = state.pendingChallenge;
  const fieldConfig = channelContent[channel];
  const hasActiveChallenge = Boolean(challenge);
  const sendButtonLabel = state.isSyncing
    ? hasActiveChallenge
      ? 'Verifying...'
      : 'Sending OTP...'
    : hasActiveChallenge
      ? `Resend ${channel === 'sms' ? 'mobile' : 'email'} OTP`
      : `Send ${channel === 'sms' ? 'mobile' : 'email'} OTP`;

  const onboardingSummary = useMemo(
    () => [
      'Chairman signs up first, verifies OTP, and creates the first society workspace.',
      'Owner and tenant accounts verify OTP first, choose their role, and then pick a society to join.',
      'After that, each user only sees the society workspaces attached to their login.',
    ],
    [],
  );

  useEffect(() => {
    setCode('');
  }, [challenge?.challengeId]);

  return (
    <Page>
      <HeroCard
        eyebrow="SocietyOS"
        title="New user sign up starts with mobile OTP or email OTP."
        subtitle="Authentication happens before any role or workspace choice. Once the OTP is verified, the app guides the user into chairman setup or society selection."
      >
        <View style={styles.choiceRow}>
          <ChoiceChip label="Mobile OTP" selected={channel === 'sms'} onPress={() => setChannel('sms')} />
          <ChoiceChip label="Email OTP" selected={channel === 'email'} onPress={() => setChannel('email')} />
        </View>

        <InputField
          label={fieldConfig.label}
          value={destination}
          onChangeText={setDestination}
          placeholder={fieldConfig.placeholder}
          keyboardType={fieldConfig.keyboardType}
          autoCapitalize="none"
        />

        <View style={styles.actionStack}>
          <ActionButton
            label={sendButtonLabel}
            onPress={() => actions.requestOtp(channel, destination)}
            disabled={state.isSyncing || destination.trim().length === 0}
          />
        </View>

        <View style={styles.pillRow}>
          <Pill label="OTP-first onboarding" tone="warning" />
          <Pill label="Chairman creates workspace" tone="accent" />
          <Pill label="Resident joins society" tone="success" />
        </View>
      </HeroCard>

      <SurfaceCard>
        <SectionHeader
          title="Verify your code"
          description="The role selector appears only after OTP verification succeeds."
        />
        <InputField
          label="OTP code"
          value={code}
          onChangeText={(value) => setCode(value.replace(/[^0-9]/g, ''))}
          placeholder="Enter the 6-digit OTP"
          keyboardType="numeric"
        />
        <ActionButton
          label={state.isSyncing ? 'Verifying OTP...' : 'Verify OTP'}
          onPress={() => actions.verifyOtp(code)}
          disabled={state.isSyncing || !challenge || code.trim().length < 4}
        />
        {challenge ? (
          <Caption>
            Code sent to {challenge.destination}. It remains active until {new Date(challenge.expiresAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}.
          </Caption>
        ) : (
          <Caption>Request the OTP first, then enter it here.</Caption>
        )}
        {challenge?.provider === 'development' && challenge.developmentCode ? (
          <Caption style={styles.devHint}>
            Local development OTP: {challenge.developmentCode}
          </Caption>
        ) : null}
      </SurfaceCard>

      <SurfaceCard>
        <SectionHeader title="Workflow after OTP" />
        <View style={styles.summaryList}>
          {onboardingSummary.map((item) => (
            <Caption key={item}>{item}</Caption>
          ))}
        </View>
      </SurfaceCard>
    </Page>
  );
}

const styles = StyleSheet.create({
  choiceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  actionStack: {
    gap: spacing.sm,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  summaryList: {
    gap: spacing.sm,
  },
  devHint: {
    fontWeight: '700',
  },
});
