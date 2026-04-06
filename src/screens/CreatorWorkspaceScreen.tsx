import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import {
  ActionButton,
  Caption,
  HeroCard,
  MetricCard,
  Page,
  Pill,
  SectionHeader,
  SurfaceCard,
} from '../components/ui';
import { useApp } from '../state/AppContext';
import { palette, radius, spacing } from '../theme/tokens';
import {
  doesSocietyHaveChairman,
  formatLongDate,
  getCurrentUser,
  getJoinRequestsForSociety,
  getSelectedSociety,
  getSocietyWorkspaceLabel,
} from '../utils/selectors';

export function CreatorWorkspaceScreen() {
  const { state, actions } = useApp();
  const { width } = useWindowDimensions();
  const isCompact = width < 768;

  const societies = [...state.data.societies].sort((left, right) =>
    left.name.localeCompare(right.name, undefined, { sensitivity: 'base' }),
  );

  const pendingChairmanClaims = societies
    .flatMap((society) => getJoinRequestsForSociety(state.data, society.id, 'pending'))
    .filter((request) => request.joinRequest.residentType === 'chairman')
    .sort(
      (left, right) =>
        Date.parse(right.joinRequest.createdAt) - Date.parse(left.joinRequest.createdAt),
    );

  const pendingApprovals = state.data.joinRequests.filter(
    (request) => request.status === 'pending',
  ).length;
  const societiesWithoutChairman = societies.filter(
    (society) => !doesSocietyHaveChairman(state.data, society.id),
  ).length;
  const newestSociety = [...societies].sort(
    (left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt),
  )[0];

  return (
    <Page>
      <HeroCard
        eyebrow="Creator Console"
        title={isCompact ? 'Manage society launches clearly.' : 'Create societies and approve first-chairman claims from one clear console.'}
        subtitle="Use this app to launch a new society, review first-chairman requests, and open any society admin workspace without mixing in resident login steps."
        tone="muted"
      >
        <View style={[styles.heroActions, isCompact ? styles.heroActionsCompact : null]}>
          <ActionButton
            label={state.isSyncing ? 'Opening creator form...' : 'Create new society'}
            onPress={actions.startSetup}
            disabled={state.isSyncing}
          />
          {newestSociety ? (
            <ActionButton
              label="Open latest society"
              onPress={() => actions.selectSociety(newestSociety.id)}
              variant="secondary"
            />
          ) : null}
          <ActionButton label="Lock creator app" onPress={actions.logout} variant="ghost" />
        </View>
      </HeroCard>

      <View style={styles.metricGrid}>
        <MetricCard label="Total societies" value={String(societies.length)} tone="primary" />
        <MetricCard
          label="Chairman claims pending"
          value={String(pendingChairmanClaims.length)}
          tone="accent"
        />
        <MetricCard
          label="Societies without chairman"
          value={String(societiesWithoutChairman)}
          tone="blue"
        />
        <MetricCard label="All pending approvals" value={String(pendingApprovals)} tone="primary" />
      </View>

      <SurfaceCard style={styles.focusCard}>
        <View style={[styles.focusHeader, isCompact ? styles.focusHeaderCompact : null]}>
          <View style={styles.focusCopy}>
            <SectionHeader
              title="First-chairman approvals"
              description="These requests are waiting for the platform superuser. Approving them unlocks the local admin workspace for that society."
            />
          </View>
          <View style={styles.focusBadge}>
            <Text style={styles.focusBadgeValue}>{pendingChairmanClaims.length}</Text>
            <Caption>claims waiting</Caption>
          </View>
        </View>

        {pendingChairmanClaims.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No first-chairman claims are waiting right now.</Text>
            <Caption>
              After a resident claims the first chairman role from the main app, the request will
              appear here for approval.
            </Caption>
          </View>
        ) : (
          pendingChairmanClaims.map((request) => {
            const society = request.society ?? getSelectedSociety(state.data, request.joinRequest.societyId);
            const claimant = request.user ?? getCurrentUser(state.data, request.joinRequest.userId);
            const unitCodes = request.units.map((unit) => unit?.code).filter(Boolean).join(', ');

            return (
              <View key={request.joinRequest.id} style={styles.claimCard}>
                <View style={styles.claimHeading}>
                  <View style={styles.claimCopy}>
                    <Text style={styles.claimTitle}>{society?.name ?? 'Society workspace'}</Text>
                    <Caption>
                      Claimant: {claimant?.name ?? 'Resident'} | Requested on{' '}
                      {formatLongDate(request.joinRequest.createdAt)}
                    </Caption>
                    <Caption>Unit or space: {unitCodes || 'Pending mapping'}</Caption>
                    {request.residenceProfile?.phone ? (
                      <Caption>Phone: {request.residenceProfile.phone}</Caption>
                    ) : null}
                  </View>
                  <View style={styles.claimPills}>
                    <Pill label="First chairman claim" tone="accent" />
                    <Pill
                      label={society ? getSocietyWorkspaceLabel(society) : 'Workspace'}
                      tone="primary"
                    />
                  </View>
                </View>

                <View style={[styles.claimActions, isCompact ? styles.claimActionsCompact : null]}>
                  <ActionButton
                    label={state.isSyncing ? 'Approving...' : 'Approve claim'}
                    onPress={() => actions.reviewJoinRequest(request.joinRequest.id, 'approve')}
                    disabled={state.isSyncing}
                  />
                  <ActionButton
                    label={state.isSyncing ? 'Rejecting...' : 'Reject claim'}
                    onPress={() => actions.reviewJoinRequest(request.joinRequest.id, 'reject')}
                    variant="secondary"
                    disabled={state.isSyncing}
                  />
                  {society ? (
                    <ActionButton
                      label="Open society workspace"
                      onPress={() => actions.selectSociety(society.id)}
                      variant="secondary"
                      disabled={state.isSyncing}
                    />
                  ) : null}
                </View>
              </View>
            );
          })
        )}
      </SurfaceCard>

      <SurfaceCard style={styles.focusCard}>
        <View style={[styles.focusHeader, isCompact ? styles.focusHeaderCompact : null]}>
          <View style={styles.focusCopy}>
            <SectionHeader
              title="Society portfolio"
              description="Open any society admin workspace to review residents, billing, security, announcements, or deeper approval queues."
            />
          </View>
          <ActionButton
            label="Create another society"
            onPress={actions.startSetup}
            variant="secondary"
            disabled={state.isSyncing}
          />
        </View>

        {societies.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No society has been created from this backend yet.</Text>
            <Caption>Create the first society to start the portfolio.</Caption>
          </View>
        ) : (
          societies.map((society) => {
            const societyPendingClaims = getJoinRequestsForSociety(state.data, society.id, 'pending');
            const pendingChairmanCount = societyPendingClaims.filter(
              (request) => request.joinRequest.residentType === 'chairman',
            ).length;
            const pendingResidentCount = societyPendingClaims.filter(
              (request) => request.joinRequest.residentType !== 'chairman',
            ).length;
            const hasChairman = doesSocietyHaveChairman(state.data, society.id);

            return (
              <View key={society.id} style={styles.portfolioCard}>
                <View style={styles.portfolioCopy}>
                  <Text style={styles.portfolioTitle}>{society.name}</Text>
                  <Caption>{society.address}</Caption>
                  <View style={styles.portfolioPills}>
                    <Pill label={getSocietyWorkspaceLabel(society)} tone="primary" />
                    <Pill
                      label={hasChairman ? 'Chairman active' : 'Chairman pending'}
                      tone={hasChairman ? 'success' : 'warning'}
                    />
                    {pendingChairmanCount > 0 ? (
                      <Pill label={`${pendingChairmanCount} chairman claim`} tone="accent" />
                    ) : null}
                    {pendingResidentCount > 0 ? (
                      <Pill label={`${pendingResidentCount} resident approval`} tone="warning" />
                    ) : null}
                  </View>
                </View>

                <View style={styles.portfolioActions}>
                  <ActionButton
                    label="Open admin workspace"
                    onPress={() => actions.selectSociety(society.id)}
                    disabled={state.isSyncing}
                  />
                </View>
              </View>
            );
          })
        )}
      </SurfaceCard>
    </Page>
  );
}

const styles = StyleSheet.create({
  heroActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  heroActionsCompact: {
    gap: spacing.xs,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  focusCard: {
    backgroundColor: '#FFFDFC',
    gap: spacing.md,
  },
  focusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  focusHeaderCompact: {
    gap: spacing.sm,
  },
  focusCopy: {
    flex: 1,
    minWidth: 220,
  },
  focusBadge: {
    minWidth: 132,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: '#F7F1EA',
    borderWidth: 1,
    borderColor: '#E6D7C8',
    gap: 4,
  },
  focusBadgeValue: {
    color: palette.accent,
    fontSize: 24,
    fontWeight: '900',
  },
  emptyState: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#E8DDD2',
    backgroundColor: '#FFF8F2',
  },
  emptyTitle: {
    color: palette.ink,
    fontSize: 16,
    fontWeight: '800',
  },
  claimCard: {
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#E8DDD2',
    backgroundColor: '#FFFBF8',
  },
  claimHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  claimCopy: {
    flex: 1,
    minWidth: 220,
    gap: 4,
  },
  claimTitle: {
    color: palette.ink,
    fontSize: 18,
    fontWeight: '800',
  },
  claimPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  claimActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  claimActionsCompact: {
    gap: spacing.xs,
  },
  portfolioCard: {
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#E8DDD2',
    backgroundColor: '#FFFBF8',
  },
  portfolioCopy: {
    gap: spacing.xs,
  },
  portfolioTitle: {
    color: palette.ink,
    fontSize: 18,
    fontWeight: '800',
  },
  portfolioPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  portfolioActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
