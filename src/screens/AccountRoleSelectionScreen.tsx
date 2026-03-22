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

export function AccountRoleSelectionScreen() {
  const { state, actions } = useApp();
  const canCreateSociety = state.session.accountRole === 'superUser';
  const hasMemberships = Boolean(state.onboarding?.membershipsCount);

  return (
    <Page>
      <HeroCard
        eyebrow="Portal Selection"
        title="Choose how this mobile number should continue."
        subtitle="If you are setting up a new residential community, use the society creation portal. If the society already exists, use the join portal to find it by country, state, city, and area."
        tone="accent"
      >
        <View style={styles.heroMeta}>
          <Pill label={state.session.verifiedDestination ?? 'OTP verified'} tone="warning" />
        </View>
      </HeroCard>

      <SectionHeader
        title="Two separate portals"
        description="This architecture keeps workspace creation and resident enrollment cleanly separated."
      />

      {canCreateSociety ? (
        <SurfaceCard>
          <Text style={styles.cardTitle}>Create Society Portal</Text>
          <Caption>
            Use this when you are the platform super user setting up a new society workspace. You will enter the society name, country, state, city, area, address, unit count, maintenance settings, and starter amenities.
          </Caption>
          <View style={styles.pillRow}>
            <Pill label="Super user only" tone="primary" />
            <Pill label="Creates workspace" tone="accent" />
            <Pill label="Captures location" tone="warning" />
          </View>
          <ActionButton
            label={state.isSyncing ? 'Opening portal...' : 'Open creation portal'}
            onPress={actions.startSetup}
            disabled={state.isSyncing}
          />
        </SurfaceCard>
      ) : null}

      {hasMemberships ? (
        <SurfaceCard>
          <Text style={styles.cardTitle}>Existing Workspaces</Text>
          <Caption>
            This login already has linked society workspaces. Open them directly to access admin or
            resident modules without repeating the join workflow.
          </Caption>
          <View style={styles.pillRow}>
            <Pill label="Direct access" tone="primary" />
            <Pill label="Linked societies" tone="accent" />
            {canCreateSociety ? <Pill label="Delete available there" tone="warning" /> : null}
          </View>
          <ActionButton
            label="Open workspaces"
            onPress={actions.goToWorkspaces}
            variant="secondary"
          />
        </SurfaceCard>
      ) : null}

      <SurfaceCard>
        <Text style={styles.cardTitle}>Join Society Portal</Text>
        <Caption>
          Use this when the society is already created. You will choose whether you are joining as an owner or tenant, filter the location step by step, select the society, and then choose your resident number or home.
        </Caption>
        <View style={styles.pillRow}>
          <Pill label="Owner or tenant" tone="primary" />
          <Pill label="Location filters" tone="accent" />
          <Pill label="Unit selection" tone="warning" />
        </View>
        <ActionButton
          label="Open join portal"
          onPress={actions.startSocietyEnrollment}
          variant="secondary"
        />
      </SurfaceCard>

      <SurfaceCard>
        <ActionButton label="Sign out" onPress={actions.logout} variant="secondary" />
      </SurfaceCard>
    </Page>
  );
}

const styles = StyleSheet.create({
  heroMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: palette.ink,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
