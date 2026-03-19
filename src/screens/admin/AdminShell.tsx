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
  formatCurrency,
  formatLongDate,
  formatShortDate,
  getAdminOverview,
  getAmenitiesForSociety,
  getAnnouncementsForSociety,
  getAuditEvents,
  getCurrentUser,
  getInvoicesForSociety,
  getPaymentsForSociety,
  getResidentsDirectory,
  getRulesForSociety,
  getSelectedSociety,
  getStaffForSociety,
} from '../../utils/selectors';

type AdminTab =
  | 'home'
  | 'residents'
  | 'billing'
  | 'amenities'
  | 'security'
  | 'announcements'
  | 'audit';

const adminTabs: Array<{ key: AdminTab; label: string }> = [
  { key: 'home', label: 'Admin Home' },
  { key: 'residents', label: 'Residents' },
  { key: 'billing', label: 'Billing' },
  { key: 'amenities', label: 'Amenities' },
  { key: 'security', label: 'Security' },
  { key: 'announcements', label: 'Announcements' },
  { key: 'audit', label: 'Audit' },
];

export function AdminShell() {
  const { state, actions } = useApp();
  const [activeTab, setActiveTab] = useState<AdminTab>('home');

  if (!state.session.userId || !state.session.selectedSocietyId) {
    return null;
  }

  const user = getCurrentUser(state.data, state.session.userId);
  const society = getSelectedSociety(state.data, state.session.selectedSocietyId);

  if (!user || !society) {
    return null;
  }

  const overview = getAdminOverview(state.data, society.id);

  return (
    <Page>
      <HeroCard
        eyebrow={`${society.name} · Admin view`}
        title="Run society operations from one control surface."
        subtitle="Admin mode is designed for collections, occupancy control, helpdesk oversight, security, and high-trust auditability."
      >
        <View style={styles.heroActions}>
          <ActionButton label="Resident view" onPress={actions.goToRoleSelection} variant="secondary" />
          <ActionButton label="Workspaces" onPress={actions.goToWorkspaces} variant="ghost" />
        </View>
        <View style={styles.metricGrid}>
          <MetricCard label="Collection rate" value={`${overview.collectionRate}%`} />
          <MetricCard label="Pending approvals" value={String(overview.pendingApprovals)} tone="accent" />
          <MetricCard label="Open complaints" value={String(overview.openComplaints)} tone="blue" />
        </View>
      </HeroCard>

      <NavigationStrip items={adminTabs} activeKey={activeTab} onChange={setActiveTab} />

      {activeTab === 'home' ? <AdminHome societyId={society.id} /> : null}
      {activeTab === 'residents' ? <AdminResidents societyId={society.id} /> : null}
      {activeTab === 'billing' ? <AdminBilling societyId={society.id} /> : null}
      {activeTab === 'amenities' ? <AdminAmenities societyId={society.id} /> : null}
      {activeTab === 'security' ? <AdminSecurity societyId={society.id} /> : null}
      {activeTab === 'announcements' ? <AdminAnnouncements societyId={society.id} /> : null}
      {activeTab === 'audit' ? <AdminAudit societyId={society.id} /> : null}
    </Page>
  );
}

function AdminHome({ societyId }: { societyId: string }) {
  const { state } = useApp();
  const overview = getAdminOverview(state.data, societyId);

  return (
    <>
      <SurfaceCard>
        <SectionHeader title="Operating priorities" />
        <Caption>
          Overdue invoices: {overview.overdueInvoices}. Pending approvals: {overview.pendingApprovals}. Active guards on roster: {overview.activeGuards}.
        </Caption>
      </SurfaceCard>

      <SurfaceCard>
        <SectionHeader title="Recommended next admin modules" />
        <View style={styles.pillRow}>
          <Pill label="Resident invite flow" tone="primary" />
          <Pill label="Bulk billing run" tone="accent" />
          <Pill label="Targeted notifications" tone="warning" />
          <Pill label="Incident register" tone="success" />
        </View>
      </SurfaceCard>
    </>
  );
}

function AdminResidents({ societyId }: { societyId: string }) {
  const { state } = useApp();
  const residents = getResidentsDirectory(state.data, societyId);

  return (
    <>
      <SectionHeader
        title="Units and occupancy"
        description="The cleanest operational model is Society → optional Buildings → Units, with occupancy records separated from identity."
      />
      {residents.slice(0, 10).map((entry) => (
        <SurfaceCard key={entry.unit.id}>
          <Text style={styles.cardTitle}>{entry.unit.code}</Text>
          <Caption>
            {entry.residents.length > 0
              ? entry.residents.map((resident) => `${resident.user.name} (${resident.category})`).join(', ')
              : 'Vacant or placeholder unit admin'}
          </Caption>
        </SurfaceCard>
      ))}
    </>
  );
}

function AdminBilling({ societyId }: { societyId: string }) {
  const { state } = useApp();
  const invoices = getInvoicesForSociety(state.data, societyId);
  const payments = getPaymentsForSociety(state.data, societyId);

  return (
    <>
      <SectionHeader
        title="Invoices"
        description="Billing should eventually support fixed, area-based, special assessments, exports, and reconciliation."
      />
      {invoices.map((invoice) => (
        <SurfaceCard key={invoice.id}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>{invoice.periodLabel}</Text>
            <Pill
              label={invoice.status}
              tone={invoice.status === 'paid' ? 'success' : invoice.status === 'overdue' ? 'warning' : 'accent'}
            />
          </View>
          <Caption>
            Due {formatLongDate(invoice.dueDate)} · {formatCurrency(invoice.amountInr)}
          </Caption>
        </SurfaceCard>
      ))}

      <SectionHeader title="Captured payments" />
      {payments.map((payment) => (
        <SurfaceCard key={payment.id}>
          <Text style={styles.cardTitle}>{formatCurrency(payment.amountInr)}</Text>
          <Caption>
            {payment.method} · {formatLongDate(payment.paidAt)}
          </Caption>
        </SurfaceCard>
      ))}
    </>
  );
}

function AdminAmenities({ societyId }: { societyId: string }) {
  const { state } = useApp();
  const amenities = getAmenitiesForSociety(state.data, societyId);
  const bookings = state.data.bookings.filter((booking) => booking.societyId === societyId);

  return (
    <>
      <SectionHeader
        title="Amenity catalog"
        description="Support exclusive, capacity-based, and info-only amenities from day one."
      />
      {amenities.map((amenity) => (
        <SurfaceCard key={amenity.id}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>{amenity.name}</Text>
            <Pill label={amenity.bookingType} tone="accent" />
          </View>
          <Caption>
            Approval: {amenity.approvalMode} {amenity.priceInr ? `· Fee ${formatCurrency(amenity.priceInr)}` : ''}
          </Caption>
        </SurfaceCard>
      ))}

      <SectionHeader title="Pending and confirmed bookings" />
      {bookings.map((booking) => (
        <SurfaceCard key={booking.id}>
          <Text style={styles.cardTitle}>{booking.date}</Text>
          <Caption>
            {booking.startTime} - {booking.endTime} · {booking.status}
          </Caption>
        </SurfaceCard>
      ))}
    </>
  );
}

function AdminSecurity({ societyId }: { societyId: string }) {
  const { state } = useApp();
  const guards = state.data.securityGuards.filter((guard) => guard.societyId === societyId);
  const staff = getStaffForSociety(state.data, societyId);
  const entries = state.data.entryLogs.filter((log) => log.societyId === societyId);

  return (
    <>
      <SectionHeader title="Guard roster" />
      {guards.map((guard) => (
        <SurfaceCard key={guard.id}>
          <Text style={styles.cardTitle}>{guard.name}</Text>
          <Caption>
            {guard.shiftLabel} shift · {guard.vendorName}
          </Caption>
        </SurfaceCard>
      ))}

      <SectionHeader title="Domestic staff verification" />
      {staff.map((member) => (
        <SurfaceCard key={member.id}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>{member.name}</Text>
            <Pill
              label={member.verificationState}
              tone={member.verificationState === 'verified' ? 'success' : 'warning'}
            />
          </View>
          <Caption>{member.category}</Caption>
        </SurfaceCard>
      ))}

      <SectionHeader title="Recent entry logs" />
      {entries.map((entry) => (
        <SurfaceCard key={entry.id}>
          <Text style={styles.cardTitle}>{entry.subjectName}</Text>
          <Caption>
            {entry.subjectType} · {entry.status} · {formatShortDate(entry.enteredAt)}
          </Caption>
        </SurfaceCard>
      ))}
    </>
  );
}

function AdminAnnouncements({ societyId }: { societyId: string }) {
  const { state } = useApp();
  const announcements = getAnnouncementsForSociety(state.data, societyId);
  const rules = getRulesForSociety(state.data, societyId);

  return (
    <>
      <SectionHeader title="Targeted communications" />
      {announcements.map((announcement) => (
        <SurfaceCard key={announcement.id}>
          <Text style={styles.cardTitle}>{announcement.title}</Text>
          <Caption>
            Audience: {announcement.audience} · {formatShortDate(announcement.createdAt)}
          </Caption>
        </SurfaceCard>
      ))}

      <SectionHeader title="Policy and rule documents" />
      {rules.map((rule) => (
        <SurfaceCard key={rule.id}>
          <Text style={styles.cardTitle}>{rule.title}</Text>
          <Caption>
            {rule.version} · Published {formatShortDate(rule.publishedAt)}
          </Caption>
          {rule.summary ? <Caption>{rule.summary}</Caption> : null}
        </SurfaceCard>
      ))}
    </>
  );
}

function AdminAudit({ societyId }: { societyId: string }) {
  const { state } = useApp();
  const events = getAuditEvents(state.data, societyId);

  return (
    <>
      <SectionHeader
        title="Audit timeline"
        description="Production business software needs durable logs for invoice runs, rule changes, approvals, security actions, and notice publishing."
      />
      {events.map((event) => (
        <SurfaceCard key={event.id}>
          <Text style={styles.cardTitle}>{event.title}</Text>
          <Caption>{event.subtitle}</Caption>
          <Caption>{formatLongDate(event.createdAt)}</Caption>
        </SurfaceCard>
      ))}
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
});
