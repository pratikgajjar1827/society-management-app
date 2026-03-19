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

export function SocietyEnrollmentScreen() {
  const { state, actions } = useApp();
  const currentRole = state.session.accountRole;
  const existingSocietyIds = new Set(
    state.data.memberships
      .filter((membership) => membership.userId === state.session.userId)
      .map((membership) => membership.societyId),
  );
  const societyOptions = state.data.societies.filter((society) => !existingSocietyIds.has(society.id));

  return (
    <Page>
      <HeroCard
        eyebrow="Society Selection"
        title="Choose the society workspace you belong to."
        subtitle="Owners and tenants should join an existing society before the app shows their resident workspace. Unit assignment and approval can be layered in next."
      >
        <View style={styles.heroActions}>
          <ActionButton label="Change role" onPress={actions.goToAccountRoleSelection} variant="secondary" />
          <ActionButton label="Sign out" onPress={actions.logout} variant="ghost" />
        </View>
      </HeroCard>

      <SectionHeader
        title="Available societies"
        description="The app will attach only the selected society workspace to this login. Later you can support invites, approval rules, and unit-level verification."
      />

      {societyOptions.length === 0 ? (
        <SurfaceCard>
          <Text style={styles.cardTitle}>No societies available to join</Text>
          <Caption>
            This login already has access to every seeded workspace. You can go back and create a new society if you are acting as chairman.
          </Caption>
        </SurfaceCard>
      ) : null}

      {societyOptions.map((society) => (
        <SurfaceCard key={society.id}>
          <View style={styles.cardHeader}>
            <View style={styles.headingBlock}>
              <Text style={styles.cardTitle}>{society.name}</Text>
              <Caption>{society.address}</Caption>
            </View>
            <Pill
              label={society.structure === 'apartment' ? 'Apartment society' : 'Bungalow society'}
              tone="primary"
            />
          </View>

          <Caption>{society.tagline}</Caption>

          <View style={styles.metaRow}>
            <Pill label={`${society.totalUnits} units`} tone="accent" />
            <Pill label={`Due day ${society.maintenanceDayOfMonth}`} tone="warning" />
          </View>

          <ActionButton
            label={
              state.isSyncing
                ? 'Joining society...'
                : `Join as ${currentRole === 'tenant' ? 'Tenant' : 'Owner'}`
            }
            onPress={() => actions.enrollIntoSociety(society.id)}
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
    flexWrap: 'wrap',
  },
  cardHeader: {
    gap: spacing.sm,
  },
  headingBlock: {
    gap: spacing.xs,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: palette.ink,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
