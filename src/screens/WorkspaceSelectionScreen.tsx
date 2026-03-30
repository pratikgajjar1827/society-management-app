import { useState } from 'react';
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
import {
  doesSocietyHaveChairman,
  formatLongDate,
  formatCurrency,
  humanizeJoinRequestRole,
  getCurrentUser,
  getMembershipForSociety,
  getPendingJoinRequestsForUser,
  getSocietyOptions,
  getSocietyWorkspaceLabel,
  humanizeRole,
} from '../utils/selectors';

export function WorkspaceSelectionScreen() {
  const { state, actions } = useApp();
  const [pendingDeleteSocietyId, setPendingDeleteSocietyId] = useState<string>();
  const { width } = useWindowDimensions();
  const isCompact = width < 768;
  const user = getCurrentUser(state.data, state.session.userId);
  const canCreateSociety = state.session.accountRole === 'superUser';
  const linkedOptions = state.session.userId ? getSocietyOptions(state.data, state.session.userId) : [];
  const options = canCreateSociety
    ? [...state.data.societies]
        .sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: 'base' }))
        .map((society) => ({
          society,
          membership:
            state.session.userId
              ? getMembershipForSociety(state.data, state.session.userId, society.id)
              : undefined,
          totalDue: state.data.invoices
            .filter((invoice) => invoice.societyId === society.id && invoice.status !== 'paid')
            .reduce((sum, invoice) => sum + invoice.amountInr, 0),
          unreadAnnouncements: state.data.announcements.filter(
            (announcement) => announcement.societyId === society.id,
          ).length,
          openComplaints: state.data.complaints.filter(
            (complaint) => complaint.societyId === society.id && complaint.status !== 'resolved',
          ).length,
        }))
    : linkedOptions;
  const pendingRequests = state.session.userId
    ? getPendingJoinRequestsForUser(state.data, state.session.userId)
    : [];

  async function handleDeleteSociety(societyId: string) {
    const wasDeleted = await actions.deleteSocietyWorkspace(societyId);

    if (wasDeleted) {
      setPendingDeleteSocietyId((currentSocietyId) =>
        currentSocietyId === societyId ? undefined : currentSocietyId,
      );
    }
  }

  return (
    <Page>
      <HeroCard
        eyebrow={user ? `Welcome back, ${user.name}` : 'Select workspace'}
        title={isCompact ? 'Pick your society and jump in.' : 'Choose a society workspace first.'}
        subtitle={
          canCreateSociety
            ? 'This super user login can open, delete, and create society workspaces across the full portfolio.'
            : 'Use one login to move across every society already linked to you with a clean mobile-first workspace switcher.'
        }
      >
        <View style={[styles.heroActions, isCompact ? styles.heroActionsCompact : null]}>
          {canCreateSociety ? (
            <ActionButton label="Create new society" onPress={actions.startSetup} />
          ) : null}
          <ActionButton label="Join another society" onPress={actions.startSocietyEnrollment} variant="secondary" />
          <ActionButton label="Sign out" onPress={actions.logout} variant="ghost" />
        </View>
      </HeroCard>

      <SectionHeader
        title="Your societies"
        description={
          canCreateSociety
            ? 'The super user can review every society workspace from one list, create societies, approve first-chairman claims, and delete society workspaces when needed.'
            : 'Each card below represents one society workspace tied to your login. The same person can safely move across communities without new accounts.'
        }
      />

      {pendingRequests.length > 0 ? (
        <SurfaceCard>
          <SectionHeader
            title="Pending access requests"
            description="These requests are waiting for chairman or super user approval before they become active workspaces."
          />
          {pendingRequests.map((request) => (
            <View key={request.joinRequest.id} style={styles.pendingRequestCard}>
              <Text style={styles.societyName}>{request.society?.name ?? 'Requested society'}</Text>
              <Caption>
                Requested as {humanizeJoinRequestRole(request.joinRequest.residentType)} on {formatLongDate(request.joinRequest.createdAt)}
              </Caption>
              {request.joinRequest.residentType === 'chairman' ? (
                <Caption>Approval path: Super user must confirm the first chairman for this society.</Caption>
              ) : null}
              <Caption>
                Units or spaces: {request.units.map((unit) => unit?.code).filter(Boolean).join(', ') || 'Pending mapping'}
              </Caption>
              <View style={styles.roleRow}>
                <Pill
                  label={request.joinRequest.residentType === 'chairman' ? 'Awaiting super user approval' : 'Awaiting chairman approval'}
                  tone="warning"
                />
              </View>
            </View>
          ))}
        </SurfaceCard>
      ) : null}

      {options.length === 0 ? (
        <SurfaceCard>
          <Text style={styles.societyName}>No society workspace linked yet</Text>
          <Caption>
            {pendingRequests.length > 0
              ? canCreateSociety
                ? 'Your claims are pending approval. You can still create another society or submit a new join request.'
                : 'Your claims are pending approval. You can still submit another join request.'
              : canCreateSociety
                ? 'Create a new society or join an existing one to populate this list.'
                : 'Join an existing society to populate this list.'}
          </Caption>
          <View style={styles.heroActions}>
            {canCreateSociety ? (
              <ActionButton label="Create first workspace" onPress={actions.startSetup} />
            ) : null}
            <ActionButton label="Join a society" onPress={actions.startSocietyEnrollment} variant="secondary" />
          </View>
        </SurfaceCard>
      ) : null}

      {options.map((option) => (
        <SurfaceCard key={option.society.id} style={isCompact ? styles.workspaceCardCompact : null}>
          {(() => {
            const hasChairman = doesSocietyHaveChairman(state.data, option.society.id);
            const pendingChairmanClaims = state.data.joinRequests.filter(
              (request) =>
                request.societyId === option.society.id &&
                request.status === 'pending' &&
                request.residentType === 'chairman',
            ).length;

            return (
              <>
          <View style={[styles.societyHeader, isCompact ? styles.societyHeaderCompact : null]}>
            <View style={styles.societyHeadingBlock}>
              <Text style={styles.societyName}>{option.society.name}</Text>
              <Caption>{option.society.address}</Caption>
            </View>
            <Pill
              label={getSocietyWorkspaceLabel(option.society)}
              tone="primary"
            />
          </View>

          <Caption>{option.society.tagline}</Caption>

          <View style={[styles.metricRow, isCompact ? styles.metricRowCompact : null]}>
            <View style={styles.metricTile}>
              <Text style={styles.metricLabel}>Outstanding dues</Text>
              <Text style={styles.metricValue}>{formatCurrency(option.totalDue)}</Text>
            </View>
            <View style={styles.metricTile}>
              <Text style={styles.metricLabel}>{canCreateSociety ? 'Notices' : 'Unread notices'}</Text>
              <Text style={styles.metricValue}>{option.unreadAnnouncements}</Text>
            </View>
            <View style={styles.metricTile}>
              <Text style={styles.metricLabel}>Open tickets</Text>
              <Text style={styles.metricValue}>{option.openComplaints}</Text>
            </View>
          </View>

          <View style={styles.roleRow}>
            {!hasChairman ? <Pill label="Chairman pending" tone="warning" /> : null}
            {pendingChairmanClaims > 0 ? <Pill label={`${pendingChairmanClaims} chairman claim pending`} tone="accent" /> : null}
            {canCreateSociety ? (
              <>
                <Pill label="Super user control" tone="accent" />
                {option.membership?.roles.map((role) => (
                  <Pill key={role} label={humanizeRole(role)} tone="primary" />
                ))}
              </>
            ) : (
              option.membership?.roles.map((role) => (
                <Pill key={role} label={humanizeRole(role)} tone="accent" />
              ))
            )}
          </View>
          {!hasChairman ? (
            <Caption>
              This society is ready for enrollment, but resident approvals will start only after the first local chairman is approved.
            </Caption>
          ) : null}
          {canCreateSociety && pendingDeleteSocietyId === option.society.id ? (
            <Caption style={styles.deleteWarning}>
              This permanently removes the society workspace and its linked units, notices, bills,
              bookings, complaints, and approvals.
            </Caption>
          ) : null}

          <View style={[styles.cardActions, isCompact ? styles.cardActionsCompact : null]}>
            <ActionButton
              label={canCreateSociety ? 'Open admin workspace' : 'Open workspace'}
              onPress={() => actions.selectSociety(option.society.id)}
              disabled={state.isSyncing}
            />
            {canCreateSociety ? (
              pendingDeleteSocietyId === option.society.id ? (
                <>
                  <ActionButton
                    label="Cancel"
                    onPress={() => setPendingDeleteSocietyId(undefined)}
                    variant="secondary"
                    disabled={state.isSyncing}
                  />
                  <ActionButton
                    label="Confirm delete"
                    onPress={() => {
                      void handleDeleteSociety(option.society.id);
                    }}
                    variant="danger"
                    disabled={state.isSyncing}
                  />
                </>
              ) : (
                <ActionButton
                  label="Delete society"
                  onPress={() => setPendingDeleteSocietyId(option.society.id)}
                  variant="danger"
                  disabled={state.isSyncing}
                />
              )
            ) : null}
          </View>
              </>
            );
          })()}
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
  heroActionsCompact: {
    gap: spacing.xs,
  },
  societyHeader: {
    gap: spacing.sm,
  },
  societyHeaderCompact: {
    gap: spacing.xs,
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
  metricRowCompact: {
    gap: spacing.xs,
    flexDirection: 'column',
  },
  metricTile: {
    flex: 1,
    minWidth: 96,
    backgroundColor: palette.surface,
    borderRadius: 20,
    padding: spacing.md,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: palette.border,
  },
  workspaceCardCompact: {
    gap: spacing.md,
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
  cardActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  cardActionsCompact: {
    gap: spacing.xs,
    flexDirection: 'column',
  },
  deleteWarning: {
    color: palette.danger,
  },
  pendingRequestCard: {
    gap: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: palette.border,
  },
});
