import { StyleSheet, Text, View } from 'react-native';

import {
  ActionButton,
  Caption,
  HeroCard,
  Page,
  Pill,
  SectionHeader,
  SurfaceCard,
} from '../components/ui';
import { useApp } from '../state/AppContext';
import { palette, spacing } from '../theme/tokens';
import { AccountRole } from '../types/domain';

const roleCards: Array<{
  role: AccountRole;
  title: string;
  summary: string;
  nextStep: string;
  tone: 'primary' | 'accent' | 'warning';
}> = [
  {
    role: 'chairman',
    title: 'Chairman / Society Admin',
    summary: 'Use this when you are creating the first workspace for a residential society.',
    nextStep: 'Next: create the society workspace, units, amenities, maintenance rules, and baseline policies.',
    tone: 'accent',
  },
  {
    role: 'owner',
    title: 'Resident Owner',
    summary: 'Use this when you own a flat, bungalow, or plot in an existing society.',
    nextStep: 'Next: choose the society you belong to, then open your resident workspace.',
    tone: 'primary',
  },
  {
    role: 'tenant',
    title: 'Tenant',
    summary: 'Use this when you are renting and need resident access to notices, dues, bookings, and helpdesk.',
    nextStep: 'Next: choose the society you stay in, then open your resident workspace.',
    tone: 'warning',
  },
];

export function AccountRoleSelectionScreen() {
  const { state, actions } = useApp();

  return (
    <Page>
      <HeroCard
        eyebrow="Role Selection"
        title="Choose the account role for this login."
        subtitle="Authentication stays shared, but onboarding changes by role. Chairman creates the first workspace. Owners and tenants join an existing one."
        tone="accent"
      >
        <View style={styles.heroActions}>
          <ActionButton label="Sign out" onPress={actions.logout} variant="secondary" />
        </View>
      </HeroCard>

      <SectionHeader
        title="Available onboarding roles"
        description="This choice controls the next step after signup. It does not replace in-society profile switching later."
      />

      {roleCards.map((item) => (
        <SurfaceCard key={item.role}>
          <View style={styles.roleHeader}>
            <View style={styles.roleHeadingBlock}>
              <Text style={styles.roleTitle}>{item.title}</Text>
              <Caption>{item.summary}</Caption>
            </View>
            <Pill
              label={item.role === 'chairman' ? 'Create workspace' : 'Join society'}
              tone={item.tone}
            />
          </View>

          <Caption>{item.nextStep}</Caption>

          <ActionButton
            label={state.isSyncing ? 'Saving role...' : `Continue as ${item.title}`}
            onPress={() => actions.selectAccountRole(item.role)}
            disabled={state.isSyncing}
          />
        </SurfaceCard>
      ))}
    </Page>
  );
}

const styles = StyleSheet.create({
  heroActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  roleHeader: {
    gap: spacing.sm,
  },
  roleHeadingBlock: {
    gap: spacing.xs,
  },
  roleTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: palette.ink,
  },
});
