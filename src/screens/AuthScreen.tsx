import { StyleSheet, View } from 'react-native';

import {
  ActionButton,
  Caption,
  DetailRow,
  HeroCard,
  Page,
  Pill,
  SectionHeader,
  SurfaceCard,
} from '../components/ui';
import { useApp } from '../state/AppContext';
import { spacing } from '../theme/tokens';

export function AuthScreen() {
  const { actions } = useApp();

  return (
    <Page>
      <HeroCard
        eyebrow="SocietyOS"
        title="One app for every owner, tenant, committee and guard."
        subtitle="Use a single login method first, then switch society workspace and role context. That keeps operations simple while still giving each person the right dashboard."
      >
        <View style={styles.heroActions}>
          <ActionButton label="Continue with phone OTP" onPress={() => actions.login('phoneOtp')} />
          <ActionButton
            label="Continue with email"
            onPress={() => actions.login('email')}
            variant="secondary"
          />
        </View>
        <View style={styles.pillRow}>
          <Pill label="Multi-society" tone="warning" />
          <Pill label="Role-aware dashboards" tone="accent" />
          <Pill label="Apartment and bungalow ready" tone="success" />
        </View>
      </HeroCard>

      <SectionHeader
        title="Recommended product layout"
        description="Instead of separate auth systems for chairman, tenant, and owner, keep one identity and attach society memberships with roles. The app then changes navigation by context."
      />

      <SurfaceCard>
        <DetailRow
          label="Login"
          value="Phone OTP or email, whichever gives you the strongest adoption and support workflow."
        />
        <DetailRow
          label="Workspace selection"
          value="If a user belongs to multiple societies, let them choose the society after login. If they belong to none, offer chairman setup."
        />
        <DetailRow
          label="Profile selection"
          value="Inside a society, let the user choose Resident view or Admin view based on their assigned roles."
        />
      </SurfaceCard>

      <SurfaceCard>
        <SectionHeader title="Why this is stronger than 3 login types" />
        <Caption>
          A single person may become owner, tenant, committee member, or member in two societies over time. One identity avoids duplicated accounts and messy migrations.
        </Caption>
        <Caption>
          The app can still feel specialized because the resident and chairman experiences use different home screens, alerts, and actions.
        </Caption>
      </SurfaceCard>
    </Page>
  );
}

const styles = StyleSheet.create({
  heroActions: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
});
