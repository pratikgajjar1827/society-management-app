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
import { formatCurrency, getCurrentUser, getSocietyOptions, humanizeRole } from '../utils/selectors';

export function WorkspaceSelectionScreen() {
  const { state, actions } = useApp();
  const user = getCurrentUser(state.data, state.session.userId);
  const options = state.session.userId ? getSocietyOptions(state.data, state.session.userId) : [];

  return (
    <Page>
      <HeroCard
        eyebrow={user ? `Welcome back, ${user.name}` : 'Select workspace'}
        title="Choose a society workspace first."
        subtitle="This is the tenancy boundary of the product. Billing, announcements, units, amenities, staff, and permissions all stay inside one society workspace."
      >
        <View style={styles.heroActions}>
          <ActionButton label="Set up a new society" onPress={actions.startSetup} />
          <ActionButton label="Sign out" onPress={actions.logout} variant="ghost" />
        </View>
      </HeroCard>

      <SectionHeader
        title="Your societies"
        description="Each card below represents one society workspace tied to your login. The same person can safely move across communities without new accounts."
      />

      {options.map((option) => (
        <SurfaceCard key={option.society.id}>
          <View style={styles.societyHeader}>
            <View style={styles.societyHeadingBlock}>
              <Text style={styles.societyName}>{option.society.name}</Text>
              <Caption>{option.society.address}</Caption>
            </View>
            <Pill
              label={option.society.structure === 'apartment' ? 'Apartment society' : 'Bungalow society'}
              tone="primary"
            />
          </View>

          <Caption>{option.society.tagline}</Caption>

          <View style={styles.metricRow}>
            <View style={styles.metricTile}>
              <Text style={styles.metricLabel}>Outstanding dues</Text>
              <Text style={styles.metricValue}>{formatCurrency(option.totalDue)}</Text>
            </View>
            <View style={styles.metricTile}>
              <Text style={styles.metricLabel}>Unread notices</Text>
              <Text style={styles.metricValue}>{option.unreadAnnouncements}</Text>
            </View>
            <View style={styles.metricTile}>
              <Text style={styles.metricLabel}>Open tickets</Text>
              <Text style={styles.metricValue}>{option.openComplaints}</Text>
            </View>
          </View>

          <View style={styles.roleRow}>
            {option.membership.roles.map((role) => (
              <Pill key={role} label={humanizeRole(role)} tone="accent" />
            ))}
          </View>

          <ActionButton label="Open workspace" onPress={() => actions.selectSociety(option.society.id)} />
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
  societyHeader: {
    gap: spacing.sm,
  },
  societyHeadingBlock: {
    gap: spacing.xs,
  },
  societyName: {
    fontSize: 22,
    fontWeight: '800',
    color: palette.ink,
  },
  metricRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  metricTile: {
    flex: 1,
    minWidth: 96,
    backgroundColor: palette.surfaceMuted,
    borderRadius: 18,
    padding: spacing.md,
    gap: spacing.xs,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: palette.mutedInk,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '800',
    color: palette.primary,
  },
  roleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
