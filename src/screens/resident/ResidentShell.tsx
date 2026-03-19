import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  ActionButton,
  Caption,
  HeroCard,
  MetricCard,
  NavigationStrip,
  Page,
  Pill,
  SectionHeader,
  SurfaceCard,
} from '../../components/ui';
import { useApp } from '../../state/AppContext';
import { palette, spacing } from '../../theme/tokens';
import {
  deriveProfiles,
  formatCurrency,
  formatLongDate,
  formatShortDate,
  getAmenitiesForSociety,
  getAnnouncementsForSociety,
  getBookingsForUserSociety,
  getComplaintsForUserSociety,
  getCurrentUser,
  getMembershipForSociety,
  getResidentOverview,
  getRulesForSociety,
  getSelectedSociety,
  getStaffForUser,
  getUnitsForSociety,
  humanizeRole,
} from '../../utils/selectors';

type ResidentTab = 'home' | 'notices' | 'bookings' | 'helpdesk' | 'profile';

const residentTabs: Array<{ key: ResidentTab; label: string }> = [
  { key: 'home', label: 'Home' },
  { key: 'notices', label: 'Notices' },
  { key: 'bookings', label: 'Bookings' },
  { key: 'helpdesk', label: 'Helpdesk' },
  { key: 'profile', label: 'Profile' },
];

export function ResidentShell() {
  const { state, actions } = useApp();
  const [activeTab, setActiveTab] = useState<ResidentTab>('home');

  if (!state.session.userId || !state.session.selectedSocietyId) {
    return null;
  }

  const user = getCurrentUser(state.data, state.session.userId);
  const society = getSelectedSociety(state.data, state.session.selectedSocietyId);
  const membership = getMembershipForSociety(
    state.data,
    state.session.userId,
    state.session.selectedSocietyId,
  );

  if (!user || !society || !membership) {
    return null;
  }

  const overview = getResidentOverview(state.data, user.id, society.id);
  const profiles = deriveProfiles(membership.roles);
  const canUseAdmin = profiles.includes('admin');

  return (
    <Page>
      <HeroCard
        eyebrow={`${society.name} · Resident view`}
        title={`Hello ${user.name.split(' ')[0]}, your day starts here.`}
        subtitle="Resident navigation prioritizes dues, notices, helpdesk, bookings, and household management."
      >
        <View style={styles.heroActions}>
          <ActionButton label="Workspaces" onPress={actions.goToWorkspaces} variant="secondary" />
          {canUseAdmin ? (
            <ActionButton label="Switch to Admin" onPress={actions.goToRoleSelection} variant="ghost" />
          ) : null}
        </View>
        <View style={styles.metricGrid}>
          <MetricCard label="Outstanding dues" value={formatCurrency(overview.totalDue)} tone="accent" />
          <MetricCard label="Unread notices" value={String(overview.unreadAnnouncements.length)} tone="blue" />
          <MetricCard
            label="Open tickets"
            value={String(overview.myComplaints.filter((item) => item.status !== 'resolved').length)}
          />
        </View>
      </HeroCard>

      <NavigationStrip items={residentTabs} activeKey={activeTab} onChange={setActiveTab} />

      {activeTab === 'home' ? <ResidentHome societyId={society.id} userId={user.id} /> : null}
      {activeTab === 'notices' ? <ResidentNotices societyId={society.id} userId={user.id} /> : null}
      {activeTab === 'bookings' ? <ResidentBookings societyId={society.id} userId={user.id} /> : null}
      {activeTab === 'helpdesk' ? <ResidentHelpdesk societyId={society.id} userId={user.id} /> : null}
      {activeTab === 'profile' ? <ResidentProfile societyId={society.id} userId={user.id} /> : null}
    </Page>
  );
}

function ResidentHome({ societyId, userId }: { societyId: string; userId: string }) {
  const { state } = useApp();
  const overview = getResidentOverview(state.data, userId, societyId);

  return (
    <>
      <SurfaceCard>
        <SectionHeader title="Quick actions" />
        <View style={styles.pillRow}>
          <Pill label="Pay maintenance" tone="primary" />
          <Pill label="Book amenity" tone="accent" />
          <Pill label="Raise complaint" tone="warning" />
          <Pill label="Register staff" tone="success" />
        </View>
      </SurfaceCard>

      <SurfaceCard>
        <SectionHeader title="Today at a glance" />
        <Caption>
          You have {overview.outstandingInvoices.length} unpaid invoice(s), {overview.myBookings.length} booking(s), and {overview.myStaffAssignments.length} household staff assignment(s).
        </Caption>
      </SurfaceCard>
    </>
  );
}

function ResidentNotices({ societyId, userId }: { societyId: string; userId: string }) {
  const { state } = useApp();
  const announcements = getAnnouncementsForSociety(state.data, societyId);
  const rules = getRulesForSociety(state.data, societyId);

  return (
    <>
      <SectionHeader
        title="Announcements"
        description="Important society communication should support audience targeting, read receipts, and priority labels."
      />
      {announcements.map((announcement) => (
        <SurfaceCard key={announcement.id}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>{announcement.title}</Text>
            <Pill label={announcement.priority} tone={announcement.priority === 'high' ? 'warning' : 'primary'} />
          </View>
          <Caption>{announcement.body}</Caption>
          <Caption>
            {announcement.readByUserIds.includes(userId) ? 'Read' : 'Unread'} · {formatShortDate(announcement.createdAt)}
          </Caption>
        </SurfaceCard>
      ))}

      <SectionHeader title="Rules and documents" />
      {rules.map((rule) => (
        <SurfaceCard key={rule.id}>
          <Text style={styles.cardTitle}>{rule.title}</Text>
          <Caption>
            {rule.version} · Published {formatLongDate(rule.publishedAt)}
          </Caption>
          {rule.summary ? <Caption>{rule.summary}</Caption> : null}
          <Caption>
            {rule.acknowledgedByUserIds.includes(userId)
              ? 'Acknowledged by you'
              : 'Acknowledgement pending'}
          </Caption>
        </SurfaceCard>
      ))}
    </>
  );
}

function ResidentBookings({ societyId, userId }: { societyId: string; userId: string }) {
  const { state } = useApp();
  const amenities = getAmenitiesForSociety(state.data, societyId);
  const bookings = getBookingsForUserSociety(state.data, userId, societyId);

  return (
    <>
      <SectionHeader
        title="Amenity discovery"
        description="Amenities can be exclusive slot-based, capacity-based, or simply informational."
      />
      {amenities.map((amenity) => (
        <SurfaceCard key={amenity.id}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>{amenity.name}</Text>
            <Pill label={amenity.bookingType} tone="accent" />
          </View>
          <Caption>
            Approval: {amenity.approvalMode} {amenity.capacity ? `· Capacity ${amenity.capacity}` : ''}
          </Caption>
        </SurfaceCard>
      ))}

      <SectionHeader title="My bookings" />
      {bookings.map((booking) => {
        const amenity = amenities.find((item) => item.id === booking.amenityId);

        return (
          <SurfaceCard key={booking.id}>
            <Text style={styles.cardTitle}>{amenity?.name ?? 'Amenity booking'}</Text>
            <Caption>
              {formatLongDate(booking.date)} · {booking.startTime} - {booking.endTime}
            </Caption>
            <Caption>
              Status: {booking.status} · Guests: {booking.guests}
            </Caption>
          </SurfaceCard>
        );
      })}
    </>
  );
}

function ResidentHelpdesk({ societyId, userId }: { societyId: string; userId: string }) {
  const { state } = useApp();
  const complaints = getComplaintsForUserSociety(state.data, userId, societyId);

  return (
    <>
      <SectionHeader
        title="Helpdesk tickets"
        description="A production version should support SLA, assignment, internal notes, attachments, and escalation."
      />
      {complaints.map((complaint) => (
        <SurfaceCard key={complaint.id}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>{complaint.title}</Text>
            <Pill
              label={complaint.status === 'inProgress' ? 'In progress' : complaint.status}
              tone={complaint.status === 'resolved' ? 'success' : 'warning'}
            />
          </View>
          <Caption>
            {complaint.category} · Raised on {formatLongDate(complaint.createdAt)}
          </Caption>
          <Caption>Assigned to: {complaint.assignedTo ?? 'Unassigned'}</Caption>
        </SurfaceCard>
      ))}
    </>
  );
}

function ResidentProfile({ societyId, userId }: { societyId: string; userId: string }) {
  const { state } = useApp();
  const membership = getMembershipForSociety(state.data, userId, societyId);
  const units = getUnitsForSociety(state.data, societyId).filter((unit) => membership?.unitIds.includes(unit.id));
  const staff = getStaffForUser(state.data, userId, societyId);

  return (
    <>
      <SectionHeader title="Membership and household" />
      <SurfaceCard>
        <Text style={styles.cardTitle}>Roles in this society</Text>
        <View style={styles.pillRow}>
          {membership?.roles.map((role) => <Pill key={role} label={humanizeRole(role)} tone="primary" />)}
        </View>
        <Caption>Unit access: {units.map((unit) => unit.code).join(', ') || 'Not assigned yet'}</Caption>
      </SurfaceCard>

      <SurfaceCard>
        <Text style={styles.cardTitle}>Domestic staff and vendors</Text>
        {staff.map((member) => (
          <View key={member.id} style={styles.compactRow}>
            <View style={styles.compactText}>
              <Text style={styles.compactTitle}>{member.name}</Text>
              <Caption>{member.category}</Caption>
            </View>
            <Pill
              label={member.verificationState}
              tone={member.verificationState === 'verified' ? 'success' : 'warning'}
            />
          </View>
        ))}
      </SurfaceCard>
    </>
  );
}

const styles = StyleSheet.create({
  heroActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: palette.ink,
    flex: 1,
  },
  compactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  compactText: {
    flex: 1,
    gap: 2,
  },
  compactTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: palette.ink,
  },
});
