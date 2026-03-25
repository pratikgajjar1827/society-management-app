import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import {
  ActionButton,
  Caption,
  Page,
  Pill,
  SectionHeader,
  SurfaceCard,
} from '../components/ui';
import { useApp } from '../state/AppContext';
import { palette, spacing } from '../theme/tokens';

export function AccountRoleSelectionScreen() {
  const { state, actions } = useApp();
  const { width } = useWindowDimensions();
  const isCompact = width < 768;
  const canCreateSociety = state.session.accountRole === 'superUser';
  const hasMemberships = Boolean(state.onboarding?.membershipsCount);

  return (
    <Page>
      <SurfaceCard style={[styles.heroCard, isCompact ? styles.heroCardCompact : null]}>
        <View style={[styles.heroTop, isCompact ? styles.heroTopCompact : null]}>
          <View style={[styles.heroCopy, isCompact ? styles.heroCopyCompact : null]}>
            <Pill label="Portal selection" tone="accent" />
            <Text style={[styles.heroTitle, isCompact ? styles.heroTitleCompact : null]}>
              Choose how this mobile number should continue
            </Text>
            <Caption style={styles.heroDescription}>
              Open workspaces directly, create a new society, or use the guided join journey with a cleaner Android-style flow.
            </Caption>
          </View>
          <View style={styles.heroBadgeStack}>
            <Pill label={state.session.verifiedDestination ?? 'OTP verified'} tone="warning" />
          </View>
        </View>
        <View style={[styles.heroMeta, isCompact ? styles.heroMetaCompact : null]}>
          <View style={[styles.heroMetric, isCompact ? styles.heroMetricCompact : null]}>
            <Text style={styles.heroMetricValue}>{hasMemberships ? 'Ready' : 'Fresh'}</Text>
            <Caption>workspace state</Caption>
          </View>
          <View style={[styles.heroMetric, isCompact ? styles.heroMetricCompact : null]}>
            <Text style={styles.heroMetricValue}>{canCreateSociety ? '3' : '2'}</Text>
            <Caption>available paths</Caption>
          </View>
        </View>
      </SurfaceCard>

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
  heroCard: {
    gap: spacing.lg,
    backgroundColor: '#FFF8F0',
  },
  heroCardCompact: {
    gap: spacing.md,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  heroTopCompact: {
    gap: spacing.sm,
  },
  heroCopy: {
    flex: 1,
    minWidth: 260,
    gap: spacing.sm,
  },
  heroCopyCompact: {
    minWidth: 0,
  },
  heroTitle: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '800',
    color: palette.ink,
  },
  heroTitleCompact: {
    fontSize: 28,
    lineHeight: 33,
  },
  heroDescription: {
    maxWidth: 700,
  },
  heroBadgeStack: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  heroMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  heroMetaCompact: {
    gap: spacing.xs,
  },
  heroMetric: {
    minWidth: 120,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E7D9C8',
    backgroundColor: '#FFFDF9',
    gap: 2,
  },
  heroMetricCompact: {
    flex: 1,
    minWidth: 0,
  },
  heroMetricValue: {
    fontSize: 18,
    fontWeight: '800',
    color: palette.accent,
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
