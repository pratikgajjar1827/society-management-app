import { useState } from 'react';
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
import {
  formatLongDate,
  formatCurrency,
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
        title="Choose a society workspace first."
        subtitle={
          canCreateSociety
            ? 'This super user login can open, delete, and create society workspaces across the full portfolio.'
            : 'Use this login to join societies and move across every workspace already linked to it.'
        }
      >
        <View style={styles.heroActions}>
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
            ? 'The super user can review every society workspace from one list and delete any society without joining it as a resident.'
            : 'Each card below represents one society workspace tied to your login. The same person can safely move across communities without new accounts.'
        }
      />

      {pendingRequests.length > 0 ? (
        <SurfaceCard>
          <SectionHeader
            title="Pending access requests"
            description="These unit or space claims are waiting for chairman approval before they become active workspaces."
          />
          {pendingRequests.map((request) => (
            <View key={request.joinRequest.id} style={styles.pendingRequestCard}>
              <Text style={styles.societyName}>{request.society?.name ?? 'Requested society'}</Text>
              <Caption>
                Requested as {request.joinRequest.residentType} on {formatLongDate(request.joinRequest.createdAt)}
              </Caption>
              <Caption>
                Units or spaces: {request.units.map((unit) => unit?.code).filter(Boolean).join(', ') || 'Pending mapping'}
              </Caption>
              <View style={styles.roleRow}>
                <Pill label="Awaiting chairman approval" tone="warning" />
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
        <SurfaceCard key={option.society.id}>
          <View style={styles.societyHeader}>
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

          <View style={styles.metricRow}>
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
          {canCreateSociety && pendingDeleteSocietyId === option.society.id ? (
            <Caption style={styles.deleteWarning}>
              This permanently removes the society workspace and its linked units, notices, bills,
              bookings, complaints, and approvals.
            </Caption>
          ) : null}

          <View style={styles.cardActions}>
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
    backgroundColor: palette.surface,
    borderRadius: 20,
    padding: spacing.md,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: palette.border,
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
