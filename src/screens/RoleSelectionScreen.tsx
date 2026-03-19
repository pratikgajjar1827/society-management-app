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
import { deriveProfiles, getMembershipForSociety, getSelectedSociety, humanizeProfile } from '../utils/selectors';

const profileModules = {
  resident: ['Home', 'Notices', 'Bookings', 'Helpdesk', 'Profile'],
  admin: ['Admin Home', 'Residents', 'Billing', 'Amenities', 'Security', 'Announcements', 'Audit'],
} as const;

export function RoleSelectionScreen() {
  const { state, actions } = useApp();

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
        title="Pick the profile you want to use in this society."
        subtitle="One person can carry multiple roles inside the same workspace. Switching the active profile keeps permissions clean and prevents overloaded navigation."
      >
        <View style={styles.heroActions}>
          <ActionButton label="Change workspace" onPress={actions.goToWorkspaces} variant="secondary" />
        </View>
      </HeroCard>

      <SectionHeader
        title="Available profiles"
        description="Resident view focuses on daily living. Admin view focuses on operations, compliance, and collections."
      />

      {profiles.map((profile) => (
        <SurfaceCard key={profile}>
          <View style={styles.profileHeader}>
            <View style={styles.profileHeadingBlock}>
              <Text style={styles.profileTitle}>{humanizeProfile(profile)}</Text>
              <Caption>
                {profile === 'resident'
                  ? 'Best for owners, tenants, and family members.'
                  : 'Best for chairman and committee workflows.'}
              </Caption>
            </View>
            <Pill label={profile === 'resident' ? 'Daily usage' : 'Operational control'} tone="primary" />
          </View>

          <View style={styles.moduleRow}>
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
  profileHeader: {
    gap: spacing.sm,
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
});
