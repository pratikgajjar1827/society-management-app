import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';

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
import { deriveProfiles, getMembershipForSociety, getSelectedSociety, humanizeProfile } from '../utils/selectors';

const profileModules = {
  resident: ['Home', 'Notices', 'Bookings', 'Helpdesk', 'Profile'],
  admin: ['Admin Home', 'Residents', 'Billing', 'Amenities', 'Security', 'Announcements', 'Audit'],
  security: ['Gate Desk', 'Approvals', 'Visitors', 'Logs'],
} as const;

export function RoleSelectionScreen() {
  const { state, actions } = useApp();
  const { width } = useWindowDimensions();
  const isCompact = width < 768;

  if (!state.session.userId || !state.session.selectedSocietyId) {
    return null;
  }

  const society = getSelectedSociety(state.data, state.session.selectedSocietyId);
  const membership = getMembershipForSociety(
    state.data,
    state.session.userId,
    state.session.selectedSocietyId,
  );
  const profiles = membership ? deriveProfiles(membership.roles) : [];

  if (!society || !membership) {
    return null;
  }

  return (
    <Page>
      <HeroCard
        eyebrow={society.name}
        title={isCompact ? 'Choose how you want to enter this society.' : 'Pick the profile you want to use in this society.'}
        subtitle="One person can carry multiple roles inside the same workspace. Switching the active profile keeps permissions clean and keeps the mobile navigation focused."
      >
        <View style={[styles.heroActions, isCompact ? styles.heroActionsCompact : null]}>
          <ActionButton label="Change workspace" onPress={actions.goToWorkspaces} variant="secondary" />
        </View>
      </HeroCard>

      <SectionHeader
        title="Available profiles"
        description="Resident view focuses on daily living. Admin view focuses on operations and collections. Security workspace focuses on gate approvals, visitor movement, and entry logs."
      />

      {profiles.map((profile) => (
        <SurfaceCard key={profile} style={isCompact ? styles.profileCardCompact : null}>
          <View style={[styles.profileHeader, isCompact ? styles.profileHeaderCompact : null]}>
            <View style={styles.profileHeadingBlock}>
              <Text style={styles.profileTitle}>{humanizeProfile(profile)}</Text>
              <Caption>
                {profile === 'resident'
                  ? 'Best for owners, tenants, and family members.'
                  : profile === 'admin'
                    ? 'Best for chairman and committee workflows.'
                    : 'Best for security guards and gate desk operators.'}
              </Caption>
            </View>
            <Pill
              label={
                profile === 'resident'
                  ? 'Daily usage'
                  : profile === 'admin'
                    ? 'Operational control'
                    : 'Gate operations'
              }
              tone="primary"
            />
          </View>

          <View style={[styles.moduleRow, isCompact ? styles.moduleRowCompact : null]}>
            {profileModules[profile].map((moduleName) => (
              <Pill key={moduleName} label={moduleName} tone="accent" />
            ))}
          </View>

          <ActionButton label={`Open ${humanizeProfile(profile)}`} onPress={() => actions.selectProfile(profile)} />
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
  heroActionsCompact: {
    gap: spacing.xs,
  },
  profileHeader: {
    gap: spacing.sm,
  },
  profileHeaderCompact: {
    gap: spacing.xs,
  },
  profileHeadingBlock: {
    gap: spacing.xs,
  },
  profileTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: palette.ink,
  },
  moduleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  moduleRowCompact: {
    gap: spacing.xs,
  },
  profileCardCompact: {
    gap: spacing.md,
  },
});
