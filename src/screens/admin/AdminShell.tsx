import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  ActionButton,
  Caption,
  ChoiceChip,
  DetailRow,
  HeroCard,
  InputField,
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
  AdminRecommendationTab,
  formatCurrency,
  formatLongDate,
  formatShortDate,
  getAdminRecommendations,
  getAdminOverview,
  getAmenitiesForSociety,
  getAnnouncementsForSociety,
  getAuditEvents,
  getBookingsForSociety,
  getComplaintsForSociety,
  getCurrentUser,
  getEntryLogsForSociety,
  getExpenseRecordsForSociety,
  getGuardRosterForSociety,
  getInvoiceCollectionDirectory,
  getInvoicesForSociety,
  getJoinRequestsForSociety,
  getMembershipForSociety,
  getPaymentRemindersForSociety,
  getPaymentsForSociety,
  getResidentsDirectory,
  getSocietyUnitCollectionLabel,
  getRulesForSociety,
  getSelectedSociety,
  getStaffVerificationDirectory,
  humanizeRole,
} from '../../utils/selectors';

type AdminTab = 'home' | AdminRecommendationTab;

const adminTabs: Array<{ key: AdminTab; label: string }> = [
  { key: 'home', label: 'Admin Home' },
  { key: 'residents', label: 'Residents' },
  { key: 'billing', label: 'Billing' },
  { key: 'amenities', label: 'Amenities' },
  { key: 'helpdesk', label: 'Helpdesk' },
  { key: 'security', label: 'Security' },
  { key: 'announcements', label: 'Announcements' },
  { key: 'audit', label: 'Audit' },
];

const expenseTypes = [
  { key: 'maintenance' as const, label: 'Maintenance' },
  { key: 'adhoc' as const, label: 'Ad hoc' },
];

const staffCategories = [
  { key: 'domesticHelp' as const, label: 'Domestic help' },
  { key: 'cook' as const, label: 'Cook' },
  { key: 'driver' as const, label: 'Driver' },
  { key: 'vendor' as const, label: 'Vendor' },
];

const verificationStates = [
  { key: 'pending' as const, label: 'Pending' },
  { key: 'verified' as const, label: 'Verified' },
  { key: 'expired' as const, label: 'Expired' },
];

const entrySubjects = [
  { key: 'staff' as const, label: 'Staff' },
  { key: 'visitor' as const, label: 'Visitor' },
  { key: 'delivery' as const, label: 'Delivery' },
];

const entryStatuses = [
  { key: 'inside' as const, label: 'Inside' },
  { key: 'exited' as const, label: 'Exited' },
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
        eyebrow={`${society.name} - Admin view`}
        title="Run society operations from one control surface."
        subtitle="Admin mode is built for occupancy control, collections, security, and auditable society operations."
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

      {activeTab === 'home' ? <AdminHome societyId={society.id} onOpenTab={setActiveTab} /> : null}
      {activeTab === 'residents' ? <AdminResidents societyId={society.id} /> : null}
      {activeTab === 'billing' ? <AdminBilling societyId={society.id} /> : null}
      {activeTab === 'amenities' ? <AdminAmenities societyId={society.id} /> : null}
      {activeTab === 'helpdesk' ? <AdminHelpdesk societyId={society.id} /> : null}
      {activeTab === 'security' ? <AdminSecurity societyId={society.id} /> : null}
      {activeTab === 'announcements' ? <AdminAnnouncements societyId={society.id} /> : null}
      {activeTab === 'audit' ? <AdminAudit societyId={society.id} /> : null}
    </Page>
  );
}

function AdminHome({ societyId, onOpenTab }: { societyId: string; onOpenTab: (tab: AdminRecommendationTab) => void }) {
  const { state, actions } = useApp();
  const overview = getAdminOverview(state.data, societyId);
  const pendingJoinRequests = getJoinRequestsForSociety(state.data, societyId, 'pending');
  const recommendations = getAdminRecommendations(state.data, societyId);

  return (
    <>
      {pendingJoinRequests.length > 0 ? (
        <SurfaceCard>
          <SectionHeader title="Pending access approvals" description="Approve ownership and tenancy claims before access is linked." />
          {pendingJoinRequests.map((request) => (
            <View key={request.joinRequest.id} style={styles.requestCard}>
              <Text style={styles.cardTitle}>{request.user?.name ?? 'Resident request'}</Text>
              <Caption>Requested as {request.joinRequest.residentType} on {formatLongDate(request.joinRequest.createdAt)}</Caption>
              <Caption>Units: {request.units.map((unit) => unit?.code).filter(Boolean).join(', ')}</Caption>
              <View style={styles.heroActions}>
                <ActionButton
                  label={state.isSyncing ? 'Processing...' : 'Approve'}
                  onPress={() => actions.reviewJoinRequest(request.joinRequest.id, 'approve')}
                  disabled={state.isSyncing}
                />
                <ActionButton
                  label={state.isSyncing ? 'Processing...' : 'Reject'}
                  onPress={() => actions.reviewJoinRequest(request.joinRequest.id, 'reject')}
                  disabled={state.isSyncing}
                  variant="secondary"
                />
              </View>
            </View>
          ))}
        </SurfaceCard>
      ) : null}

      <SurfaceCard>
        <SectionHeader title="Operating priorities" />
        <Caption>
          Overdue invoices: {overview.overdueInvoices}. Pending approvals: {overview.pendingApprovals}. Active guards: {overview.activeGuards}.
        </Caption>
      </SurfaceCard>

      <SurfaceCard>
        <SectionHeader title="Recommended next admin modules" description="Open the next module directly from the current workload." />
        <View style={styles.recommendationGrid}>
          {recommendations.map((recommendation) => (
            <View key={recommendation.tab} style={styles.recommendationCard}>
              <Text style={styles.recommendationTitle}>{recommendation.title}</Text>
              <Pill label={recommendation.metric} tone={recommendation.tone} />
              <Caption>{recommendation.summary}</Caption>
              <ActionButton label={recommendation.actionLabel} onPress={() => onOpenTab(recommendation.tab)} variant="secondary" />
            </View>
          ))}
        </View>
      </SurfaceCard>
    </>
  );
}

function AdminResidents({ societyId }: { societyId: string }) {
  const { state, actions } = useApp();
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [chairmanResidentType, setChairmanResidentType] = useState<'owner' | 'tenant'>('owner');
  const chairmanUserId = state.session.userId;
  const society = getSelectedSociety(state.data, societyId);
  const chairmanMembership = chairmanUserId
    ? getMembershipForSociety(state.data, chairmanUserId, societyId)
    : undefined;
  const [selectedChairmanUnitIds, setSelectedChairmanUnitIds] = useState<string[]>(
    chairmanMembership?.unitIds ?? [],
  );
  const residents = getResidentsDirectory(state.data, societyId);
  const activeUnitId = residents.some((entry) => entry.unit.id === selectedUnitId) ? selectedUnitId : residents[0]?.unit.id ?? null;
  const currentChairmanUnitIds = new Set(chairmanMembership?.unitIds ?? []);
  const residentRoleLabels = chairmanMembership?.roles
    .filter((role) => role === 'owner' || role === 'tenant')
    .map((role) => humanizeRole(role)) ?? [];
  const currentChairmanUnits = residents
    .filter((entry) => currentChairmanUnitIds.has(entry.unit.id))
    .map((entry) => entry.unit.code);

  useEffect(() => {
    setSelectedChairmanUnitIds(chairmanMembership?.unitIds ?? []);
  }, [chairmanMembership?.unitIds]);

  useEffect(() => {
    if (chairmanMembership?.roles.includes('tenant')) {
      setChairmanResidentType('tenant');
      return;
    }

    if (chairmanMembership?.roles.includes('owner')) {
      setChairmanResidentType('owner');
    }
  }, [chairmanMembership?.roles]);

  function toggleChairmanUnit(unitId: string) {
    setSelectedChairmanUnitIds((currentSelection) =>
      currentSelection.includes(unitId)
        ? currentSelection.filter((value) => value !== unitId)
        : [...currentSelection, unitId],
    );
  }

  async function handleChairmanResidenceLink() {
    await actions.assignChairmanResidence(
      societyId,
      selectedChairmanUnitIds,
      chairmanResidentType,
    );
  }

  return (
    <>
      <SectionHeader
        title="Units and occupancy"
        description={`Showing all ${residents.length} units. Click any plot, apartment, office, or shed to see resident detail.`}
      />
      {society && chairmanMembership?.roles.includes('chairman') ? (
        <SurfaceCard>
          <SectionHeader
            title="Link chairman to a property"
            description={`The society creator is no longer auto-linked to the first unit. Choose the correct ${getUnitClaimLabel(society)} manually after setup.`}
          />
          <Caption>
            Current chairman resident access: {currentChairmanUnits.length > 0
              ? `${residentRoleLabels.join(', ') || 'Resident'} for ${currentChairmanUnits.join(', ')}`
              : 'No home, plot, office, or shed linked yet.'}
          </Caption>
          <View style={styles.choiceRow}>
            <ChoiceChip
              label="Owner"
              selected={chairmanResidentType === 'owner'}
              onPress={() => setChairmanResidentType('owner')}
            />
            <ChoiceChip
              label="Tenant"
              selected={chairmanResidentType === 'tenant'}
              onPress={() => setChairmanResidentType('tenant')}
            />
          </View>
          <Caption>
            Select one or more {getSocietyUnitCollectionLabel(society)} to link with the chairman profile.
          </Caption>
          <View style={styles.choiceRow}>
            {residents.map((entry) => (
              <ChoiceChip
                key={entry.unit.id}
                label={entry.unit.code}
                selected={selectedChairmanUnitIds.includes(entry.unit.id)}
                onPress={() => toggleChairmanUnit(entry.unit.id)}
              />
            ))}
          </View>
          <Caption>
            Leaving everything unselected keeps this person as chairman only and removes any resident unit link.
          </Caption>
          <ActionButton
            label={
              state.isSyncing
                ? 'Saving...'
                : selectedChairmanUnitIds.length > 0
                  ? 'Save chairman property link'
                  : 'Keep chairman as admin only'
            }
            onPress={handleChairmanResidenceLink}
            disabled={state.isSyncing || (selectedChairmanUnitIds.length === 0 && currentChairmanUnits.length === 0)}
          />
        </SurfaceCard>
      ) : null}
      {residents.map((entry) => {
        const isSelected = entry.unit.id === activeUnitId;

        return (
          <Pressable
            key={entry.unit.id}
            onPress={() => setSelectedUnitId(isSelected ? null : entry.unit.id)}
            style={({ pressed }) => [
              styles.interactiveCard,
              isSelected ? styles.interactiveCardActive : null,
              pressed ? styles.interactiveCardPressed : null,
            ]}
          >
            <View style={styles.rowBetween}>
              <Text style={styles.cardTitle}>{entry.unit.code}</Text>
              <Pill label={entry.residents.length > 0 ? `${entry.residents.length} linked` : 'Vacant'} tone={entry.residents.length > 0 ? 'primary' : 'warning'} />
            </View>
            <Caption>
              {entry.residents.length > 0
                ? entry.residents.map((resident) => `${resident.user.name} (${resident.category})`).join(', ')
                : 'No resident is linked yet.'}
            </Caption>

            {isSelected ? (
              <View style={styles.detailStack}>
                <View style={styles.detailPanel}>
                  <Text style={styles.detailTitle}>Unit snapshot</Text>
                  <DetailRow label="Unit type" value={entry.unit.unitType} />
                  <DetailRow label="Building / block" value={entry.building?.name ?? 'Direct unit mapping'} />
                  <DetailRow label="Outstanding dues" value={entry.outstandingAmount > 0 ? formatCurrency(entry.outstandingAmount) : 'None'} />
                  <DetailRow label="Last payment" value={entry.latestPayment ? formatLongDate(entry.latestPayment.paidAt) : 'No payment recorded'} />
                </View>

                <View style={styles.detailPanel}>
                  <Text style={styles.detailTitle}>Resident detail</Text>
                  {entry.residents.length > 0 ? (
                    entry.residents.map((resident) => (
                      <View key={`${entry.unit.id}-${resident.user.id}`} style={styles.inlineSection}>
                        <Text style={styles.inlineTitle}>{resident.user.name}</Text>
                        <Caption>{resident.category}{resident.roles.length > 0 ? ` - ${resident.roles.map(humanizeRole).join(', ')}` : ''}</Caption>
                        <Caption>{resident.user.phone}</Caption>
                        <Caption>{resident.user.email}</Caption>
                        <Caption>Started on {formatLongDate(resident.startDate)}</Caption>
                      </View>
                    ))
                  ) : (
                    <Caption>No resident detail is linked yet.</Caption>
                  )}
                </View>

                <View style={styles.detailPanel}>
                  <Text style={styles.detailTitle}>Domestic staff linked to this unit</Text>
                  {entry.unitStaffRecords.length > 0 ? (
                    entry.unitStaffRecords.map(({ staff, assignments, requestedBy, reviewedBy }) => (
                      <View key={`${entry.unit.id}-${staff.id}`} style={styles.inlineSection}>
                        <View style={styles.rowBetween}>
                          <Text style={styles.inlineTitle}>{staff.name}</Text>
                          <Pill
                            label={humanizeVerificationState(staff.verificationState)}
                            tone={getVerificationTone(staff.verificationState)}
                          />
                        </View>
                        <Caption>{humanizeStaffCategory(staff.category)} - {staff.phone}</Caption>
                        <Caption>
                          Submitted by {requestedBy?.name ?? 'Unknown resident'} on{' '}
                          {staff.requestedAt ? formatLongDate(staff.requestedAt) : 'date not recorded'}
                        </Caption>
                        <Caption>
                          {reviewedBy && staff.reviewedAt
                            ? `Reviewed by ${reviewedBy.name} on ${formatLongDate(staff.reviewedAt)}`
                            : 'Awaiting chairman review'}
                        </Caption>
                        {getAssignmentSummaries(assignments).map((summary) => (
                          <Caption key={`${staff.id}-${summary}`}>{summary}</Caption>
                        ))}
                      </View>
                    ))
                  ) : (
                    <Caption>No domestic staff is linked to this unit.</Caption>
                  )}
                </View>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </>
  );
}

function AdminBilling({ societyId }: { societyId: string }) {
  const { state, actions } = useApp();
  const [expenseType, setExpenseType] = useState<'maintenance' | 'adhoc'>('maintenance');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [incurredOn, setIncurredOn] = useState(todayString());
  const [notes, setNotes] = useState('');
  const [reminderMessage, setReminderMessage] = useState('');
  const plan = state.data.maintenancePlans.find((item) => item.societyId === societyId);
  const expenses = getExpenseRecordsForSociety(state.data, societyId);
  const payments = getPaymentsForSociety(state.data, societyId);
  const invoiceCollection = getInvoiceCollectionDirectory(state.data, societyId);
  const paymentReminders = getPaymentRemindersForSociety(state.data, societyId);
  const pendingPaymentFlags = payments
    .filter((payment) => payment.status === 'pending')
    .map((payment) => {
      const invoice = state.data.invoices.find((invoiceRecord) => invoiceRecord.id === payment.invoiceId);
      const unit = invoice ? state.data.units.find((unitRecord) => unitRecord.id === invoice.unitId) : undefined;
      const submitter = payment.submittedByUserId ? getCurrentUser(state.data, payment.submittedByUserId) : undefined;

      if (!invoice) {
        return undefined;
      }

      return {
        payment,
        invoice,
        unit,
        submitter,
      };
    })
    .filter(Boolean) as Array<{
    payment: typeof payments[number];
    invoice: typeof state.data.invoices[number];
    unit?: typeof state.data.units[number];
    submitter?: typeof state.data.users[number];
  }>;
  const unpaidInvoices = invoiceCollection.filter(({ invoice }) => invoice.status !== 'paid');
  const totalOutstanding = unpaidInvoices.reduce((sum, entry) => sum + entry.invoice.amountInr, 0);
  const totalCaptured = payments
    .filter((payment) => payment.status === 'captured')
    .reduce((sum, payment) => sum + payment.amountInr, 0);

  async function handleSave() {
    const saved = await actions.createExpenseRecord(societyId, {
      expenseType,
      title,
      amountInr: amount,
      incurredOn,
      notes,
    });

    if (saved) {
      setExpenseType('maintenance');
      setTitle('');
      setAmount('');
      setIncurredOn(todayString());
      setNotes('');
    }
  }

  async function handleReminder(invoiceIds: string[]) {
    const sent = await actions.sendMaintenanceReminder(societyId, {
      invoiceIds,
      message: reminderMessage,
    });

    if (sent) {
      setReminderMessage('');
    }
  }

  return (
    <>
      {plan ? (
        <SurfaceCard>
          <SectionHeader title="Maintenance plan" />
          <DetailRow label="Frequency" value={plan.frequency} />
          <DetailRow label="Due day" value={`Day ${plan.dueDay}`} />
          <DetailRow label="Amount" value={formatCurrency(plan.amountInr)} />
        </SurfaceCard>
      ) : null}

      <SurfaceCard>
        <SectionHeader
          title="Collection control"
          description="Resident payment flags, unpaid invoices, and reminder history now flow through one shared billing module."
        />
        <View style={styles.metricGrid}>
          <MetricCard label="Outstanding dues" value={formatCurrency(totalOutstanding)} tone="accent" />
          <MetricCard label="Pending payment flags" value={String(pendingPaymentFlags.length)} tone="primary" />
          <MetricCard label="Collected" value={formatCurrency(totalCaptured)} tone="blue" />
        </View>
      </SurfaceCard>

      <SurfaceCard>
        <SectionHeader
          title="Remind unpaid residents"
          description="Send one billing reminder to every unit with unpaid maintenance, or trigger it unit by unit from the collection tracker below."
        />
        <InputField
          label="Reminder message"
          value={reminderMessage}
          onChangeText={setReminderMessage}
          multiline
          placeholder="March maintenance is still pending. Please flag the payment in resident billing or contact the chairman if already settled."
        />
        <ActionButton
          label={state.isSyncing ? 'Sending...' : 'Remind all unpaid residents'}
          onPress={() => handleReminder(unpaidInvoices.map(({ invoice }) => invoice.id))}
          disabled={state.isSyncing || unpaidInvoices.length === 0}
        />
      </SurfaceCard>

      <SectionHeader title="Pending resident payment flags" />
      {pendingPaymentFlags.length > 0 ? pendingPaymentFlags.map(({ payment, invoice, unit, submitter }) => (
        <SurfaceCard key={payment.id}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>{invoice.periodLabel}</Text>
            <Pill label="Pending review" tone="warning" />
          </View>
          <Caption>{unit?.code ?? 'Unit'} - {formatCurrency(payment.amountInr)} via {humanizePaymentMethod(payment.method)}</Caption>
          <Caption>Submitted by {submitter?.name ?? 'Resident'} on {formatLongDate(payment.paidAt)}</Caption>
          {payment.referenceNote ? <Caption>Reference: {payment.referenceNote}</Caption> : null}
          <View style={styles.heroActions}>
            <ActionButton
              label={state.isSyncing ? 'Processing...' : 'Approve payment'}
              onPress={() => actions.reviewResidentPayment(societyId, payment.id, 'approve')}
              disabled={state.isSyncing}
            />
            <ActionButton
              label={state.isSyncing ? 'Processing...' : 'Reject payment'}
              onPress={() => actions.reviewResidentPayment(societyId, payment.id, 'reject')}
              disabled={state.isSyncing}
              variant="secondary"
            />
          </View>
        </SurfaceCard>
      )) : (
        <SurfaceCard><Caption>No resident payment confirmations are waiting right now.</Caption></SurfaceCard>
      )}

      <SectionHeader title="Resident maintenance tracker" />
      {invoiceCollection.map(({ invoice, unit, residents, latestPayment, latestReminder }) => (
        <SurfaceCard key={invoice.id}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>{invoice.periodLabel}</Text>
            <Pill label={humanizeInvoiceStatus(invoice.status)} tone={getInvoiceStatusTone(invoice.status)} />
          </View>
          <Caption>{unit?.code ?? 'Unit'} - {formatCurrency(invoice.amountInr)} due on {formatLongDate(invoice.dueDate)}</Caption>
          <Caption>Residents: {residents.map((resident) => resident.name).join(', ') || 'No resident linked yet'}</Caption>
          <Caption>
            Latest payment: {latestPayment
              ? `${humanizePaymentStatus(latestPayment.status)} via ${humanizePaymentMethod(latestPayment.method)}`
              : 'No payment submitted'}
          </Caption>
          <Caption>
            Latest reminder: {latestReminder
              ? formatLongDate(latestReminder.reminder.sentAt)
              : 'No reminder sent'}
          </Caption>
          {invoice.status !== 'paid' ? (
            <ActionButton
              label={state.isSyncing ? 'Sending...' : `Remind ${unit?.code ?? 'unit'}`}
              onPress={() => handleReminder([invoice.id])}
              disabled={state.isSyncing}
              variant="secondary"
            />
          ) : null}
        </SurfaceCard>
      ))}

      <SurfaceCard>
        <SectionHeader title="Record expense" description="Log maintenance and ad hoc spending from this module." />
        <View style={styles.choiceRow}>
          {expenseTypes.map((option) => (
            <ChoiceChip key={option.key} label={option.label} selected={expenseType === option.key} onPress={() => setExpenseType(option.key)} />
          ))}
        </View>
        <View style={styles.formGrid}>
          <View style={styles.formField}>
            <InputField label="Title" value={title} onChangeText={setTitle} placeholder="Water pump servicing" />
          </View>
          <View style={styles.formField}>
            <InputField label="Amount (INR)" value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="12000" />
          </View>
          <View style={styles.formField}>
            <InputField label="Date" value={incurredOn} onChangeText={setIncurredOn} placeholder="2026-03-20" />
          </View>
        </View>
        <InputField label="Notes" value={notes} onChangeText={setNotes} multiline placeholder="Vendor note or work summary" />
        <ActionButton label={state.isSyncing ? 'Saving...' : 'Save expense'} onPress={handleSave} disabled={state.isSyncing} />
      </SurfaceCard>

      <SectionHeader title="Expense register" />
      {expenses.length > 0 ? expenses.map((expense) => (
        <SurfaceCard key={expense.id}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>{expense.title}</Text>
            <Pill label={expense.expenseType === 'maintenance' ? 'Maintenance' : 'Ad hoc'} tone={expense.expenseType === 'maintenance' ? 'primary' : 'accent'} />
          </View>
          <Caption>{formatCurrency(expense.amountInr)} - {formatLongDate(expense.incurredOn)}</Caption>
          {expense.notes ? <Caption>{expense.notes}</Caption> : null}
        </SurfaceCard>
      )) : (
        <SurfaceCard><Caption>No expense records yet.</Caption></SurfaceCard>
      )}

      <SectionHeader title="Payment reminders sent" />
      {paymentReminders.length > 0 ? paymentReminders.map(({ reminder, units, sentBy }) => (
        <SurfaceCard key={reminder.id}>
          <Text style={styles.cardTitle}>Reminder by {sentBy?.name ?? 'Admin'}</Text>
          <Caption>{reminder.message}</Caption>
          <Caption>Units: {units.map((unit) => unit.code).join(', ')}</Caption>
          <Caption>{formatLongDate(reminder.sentAt)}</Caption>
        </SurfaceCard>
      )) : (
        <SurfaceCard><Caption>No maintenance reminders have been sent yet.</Caption></SurfaceCard>
      )}

      <SectionHeader title="Payment ledger" />
      {payments.length > 0 ? payments.map((payment) => {
        const invoice = state.data.invoices.find((invoiceRecord) => invoiceRecord.id === payment.invoiceId);
        const unit = invoice ? state.data.units.find((unitRecord) => unitRecord.id === invoice.unitId) : undefined;
        return (
          <SurfaceCard key={payment.id}>
            <View style={styles.rowBetween}>
              <Text style={styles.cardTitle}>{invoice?.periodLabel ?? 'Maintenance payment'}</Text>
              <Pill label={humanizePaymentStatus(payment.status)} tone={getPaymentStatusTone(payment.status)} />
            </View>
            <Caption>{unit?.code ?? 'Unit'} - {formatCurrency(payment.amountInr)} via {humanizePaymentMethod(payment.method)}</Caption>
            <Caption>Paid on {formatLongDate(payment.paidAt)}</Caption>
            {payment.referenceNote ? <Caption>Reference: {payment.referenceNote}</Caption> : null}
          </SurfaceCard>
        );
      }) : (
        <SurfaceCard><Caption>No payment records yet.</Caption></SurfaceCard>
      )}
    </>
  );
}

function AdminAmenities({ societyId }: { societyId: string }) {
  const { state, actions } = useApp();
  const amenities = getAmenitiesForSociety(state.data, societyId);
  const bookings = getBookingsForSociety(state.data, societyId);
  const pendingBookings = bookings.filter(({ booking }) => booking.status === 'pending');
  const waitlistedBookings = bookings.filter(({ booking }) => booking.status === 'waitlisted');

  return (
    <>
      <SectionHeader title="Amenity catalog" description="Support exclusive, capacity-based, and info-only amenities from day one." />
      {amenities.map((amenity) => (
        <SurfaceCard key={amenity.id}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>{amenity.name}</Text>
            <Pill label={amenity.bookingType} tone="accent" />
          </View>
          <Caption>Approval: {amenity.approvalMode}{amenity.priceInr ? ` - Fee ${formatCurrency(amenity.priceInr)}` : ''}</Caption>
        </SurfaceCard>
      ))}

      <SurfaceCard>
        <SectionHeader
          title="Booking operations"
          description="Resident booking requests land here. Confirm or waitlist them so the resident workspace and admin queue stay in sync."
        />
        <View style={styles.metricGrid}>
          <MetricCard label="Pending review" value={String(pendingBookings.length)} tone="accent" />
          <MetricCard label="Waitlisted" value={String(waitlistedBookings.length)} tone="blue" />
          <MetricCard label="Total requests" value={String(bookings.length)} />
        </View>
      </SurfaceCard>

      <SectionHeader title="Pending, waitlisted, and confirmed bookings" />
      {bookings.length > 0 ? bookings.map(({ booking, amenity, unit, user }) => (
        <SurfaceCard key={booking.id}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>{amenity?.name ?? 'Amenity booking'}</Text>
            <Pill label={humanizeBookingStatus(booking.status)} tone={getBookingTone(booking.status)} />
          </View>
          <Caption>{formatLongDate(booking.date)} - {booking.startTime} to {booking.endTime}</Caption>
          <Caption>{user?.name ?? 'Resident'} · {unit?.code ?? 'Unit'} · Guests {booking.guests}</Caption>
          {booking.status !== 'confirmed' ? (
            <View style={styles.heroActions}>
              <ActionButton
                label={state.isSyncing ? 'Saving...' : 'Confirm booking'}
                onPress={() => actions.reviewAmenityBooking(societyId, booking.id, 'confirmed')}
                disabled={state.isSyncing}
              />
              <ActionButton
                label={state.isSyncing ? 'Saving...' : 'Move to waitlist'}
                onPress={() => actions.reviewAmenityBooking(societyId, booking.id, 'waitlisted')}
                disabled={state.isSyncing}
                variant="secondary"
              />
            </View>
          ) : null}
        </SurfaceCard>
      )) : (
        <SurfaceCard><Caption>No amenity booking requests have been raised yet.</Caption></SurfaceCard>
      )}
    </>
  );
}

function AdminHelpdesk({ societyId }: { societyId: string }) {
  const { state, actions } = useApp();
  const complaints = getComplaintsForSociety(state.data, societyId);
  const openComplaints = complaints.filter(({ complaint }) => complaint.status === 'open');
  const inProgressComplaints = complaints.filter(({ complaint }) => complaint.status === 'inProgress');
  const resolvedComplaints = complaints.filter(({ complaint }) => complaint.status === 'resolved');
  const [assignmentDrafts, setAssignmentDrafts] = useState<Record<string, string>>({});

  function getAssignedValue(complaintId: string, currentAssignedTo?: string) {
    return assignmentDrafts[complaintId] ?? currentAssignedTo ?? '';
  }

  function setAssignedValue(complaintId: string, value: string) {
    setAssignmentDrafts((currentDrafts) => ({
      ...currentDrafts,
      [complaintId]: value,
    }));
  }

  async function updateComplaint(
    complaintId: string,
    status: 'open' | 'inProgress' | 'resolved',
    assignedTo?: string,
  ) {
    const saved = await actions.updateComplaintTicket(societyId, complaintId, {
      status,
      assignedTo,
    });

    if (saved) {
      setAssignmentDrafts((currentDrafts) => ({
        ...currentDrafts,
        [complaintId]: assignedTo ?? '',
      }));
    }
  }

  return (
    <>
      <SurfaceCard>
        <SectionHeader
          title="Helpdesk control"
          description="Resident tickets now land here directly from the resident workspace. Assign ownership and move them through open, in progress, and resolved states."
        />
        <View style={styles.metricGrid}>
          <MetricCard label="Open tickets" value={String(openComplaints.length)} tone="accent" />
          <MetricCard label="In progress" value={String(inProgressComplaints.length)} tone="primary" />
          <MetricCard label="Resolved" value={String(resolvedComplaints.length)} tone="blue" />
        </View>
      </SurfaceCard>

      <SectionHeader title="Resident helpdesk queue" />
      {complaints.length > 0 ? complaints.map(({ complaint, unit, user }) => {
        const assignedTo = getAssignedValue(complaint.id, complaint.assignedTo);

        return (
          <SurfaceCard key={complaint.id}>
            <View style={styles.rowBetween}>
              <Text style={styles.cardTitle}>{complaint.title}</Text>
              <Pill label={humanizeComplaintStatus(complaint.status)} tone={getComplaintTone(complaint.status)} />
            </View>
            <Caption>{humanizeComplaintCategory(complaint.category)} · {user?.name ?? 'Resident'} · {unit?.code ?? 'Unit'}</Caption>
            <Caption>Raised on {formatLongDate(complaint.createdAt)}</Caption>
            {complaint.description ? <Caption>{complaint.description}</Caption> : null}
            <View style={styles.formGrid}>
              <View style={styles.formField}>
                <InputField
                  label="Assigned to"
                  value={assignedTo}
                  onChangeText={(value) => setAssignedValue(complaint.id, value)}
                  placeholder="Plumber, billing desk, facility manager"
                />
              </View>
            </View>
            <View style={styles.heroActions}>
              <ActionButton
                label={state.isSyncing ? 'Saving...' : complaint.status === 'open' ? 'Start work' : 'Reopen'}
                onPress={() =>
                  updateComplaint(
                    complaint.id,
                    complaint.status === 'open' ? 'inProgress' : 'open',
                    assignedTo.trim() || undefined,
                  )
                }
                disabled={state.isSyncing}
                variant="secondary"
              />
              <ActionButton
                label={state.isSyncing ? 'Saving...' : 'Save owner'}
                onPress={() => updateComplaint(complaint.id, complaint.status, assignedTo.trim() || undefined)}
                disabled={state.isSyncing}
                variant="secondary"
              />
              <ActionButton
                label={state.isSyncing ? 'Saving...' : 'Resolve'}
                onPress={() => updateComplaint(complaint.id, 'resolved', assignedTo.trim() || undefined)}
                disabled={state.isSyncing}
              />
            </View>
          </SurfaceCard>
        );
      }) : (
        <SurfaceCard><Caption>No helpdesk tickets have been raised yet.</Caption></SurfaceCard>
      )}
    </>
  );
}

function AdminSecurity({ societyId }: { societyId: string }) {
  const { state, actions } = useApp();
  const [guardName, setGuardName] = useState('');
  const [guardPhone, setGuardPhone] = useState('');
  const [guardShiftLabel, setGuardShiftLabel] = useState('');
  const [guardVendor, setGuardVendor] = useState('');
  const [guardGate, setGuardGate] = useState('');
  const [guardShiftStart, setGuardShiftStart] = useState(nowDateTimeString(6));
  const [guardShiftEnd, setGuardShiftEnd] = useState(nowDateTimeString(14));
  const [staffName, setStaffName] = useState('');
  const [staffPhone, setStaffPhone] = useState('');
  const [staffCategory, setStaffCategory] = useState<'domesticHelp' | 'cook' | 'driver' | 'vendor'>('domesticHelp');
  const [staffState, setStaffState] = useState<'pending' | 'verified' | 'expired'>('pending');
  const [staffUnits, setStaffUnits] = useState('');
  const [serviceLabel, setServiceLabel] = useState('');
  const [visitsPerWeek, setVisitsPerWeek] = useState('6');
  const [entrySubject, setEntrySubject] = useState<'staff' | 'visitor' | 'delivery'>('visitor');
  const [entryName, setEntryName] = useState('');
  const [entryUnit, setEntryUnit] = useState('');
  const [entryState, setEntryState] = useState<'inside' | 'exited'>('inside');
  const guards = getGuardRosterForSociety(state.data, societyId);
  const staff = getStaffVerificationDirectory(state.data, societyId);
  const pendingStaff = staff.filter((entry) => entry.staff.verificationState === 'pending');
  const entries = getEntryLogsForSociety(state.data, societyId);

  async function saveGuard() {
    const saved = await actions.createSecurityGuard(societyId, {
      name: guardName,
      phone: guardPhone,
      shiftLabel: guardShiftLabel,
      vendorName: guardVendor,
      gate: guardGate,
      shiftStart: guardShiftStart,
      shiftEnd: guardShiftEnd,
    });
    if (saved) {
      setGuardName('');
      setGuardPhone('');
      setGuardShiftLabel('');
      setGuardVendor('');
      setGuardGate('');
    }
  }

  async function saveStaff() {
    const saved = await actions.createStaffVerification(societyId, {
      name: staffName,
      phone: staffPhone,
      category: staffCategory,
      verificationState: staffState,
      employerUnitCodes: parseUnitCodes(staffUnits),
      serviceLabel,
      visitsPerWeek,
    });
    if (saved) {
      setStaffName('');
      setStaffPhone('');
      setStaffUnits('');
      setServiceLabel('');
      setVisitsPerWeek('6');
      setStaffCategory('domesticHelp');
      setStaffState('pending');
    }
  }

  async function saveEntry() {
    const saved = await actions.createEntryLogRecord(societyId, {
      subjectType: entrySubject,
      subjectName: entryName,
      unitCode: entryUnit.trim(),
      status: entryState,
    });
    if (saved) {
      setEntrySubject('visitor');
      setEntryName('');
      setEntryUnit('');
      setEntryState('inside');
    }
  }

  return (
    <>
      <SectionHeader title="Security operations" description="Add guard, staff, and entry data here. Residents can then see the records tied to their units." />

      <SurfaceCard>
        <SectionHeader title="Guard roster" />
        <View style={styles.formGrid}>
          <View style={styles.formField}><InputField label="Guard name" value={guardName} onChangeText={setGuardName} placeholder="Mahesh Yadav" /></View>
          <View style={styles.formField}><InputField label="Phone" value={guardPhone} onChangeText={setGuardPhone} keyboardType="phone-pad" placeholder="+91 98980 12345" /></View>
          <View style={styles.formField}><InputField label="Shift label" value={guardShiftLabel} onChangeText={setGuardShiftLabel} placeholder="Day or Night" /></View>
          <View style={styles.formField}><InputField label="Vendor" value={guardVendor} onChangeText={setGuardVendor} placeholder="SecureNest Services" /></View>
          <View style={styles.formField}><InputField label="Gate" value={guardGate} onChangeText={setGuardGate} placeholder="Main gate" /></View>
          <View style={styles.formField}><InputField label="Shift start" value={guardShiftStart} onChangeText={setGuardShiftStart} placeholder="2026-03-20T06:00" /></View>
          <View style={styles.formField}><InputField label="Shift end" value={guardShiftEnd} onChangeText={setGuardShiftEnd} placeholder="2026-03-20T14:00" /></View>
        </View>
        <ActionButton label={state.isSyncing ? 'Saving...' : 'Add guard'} onPress={saveGuard} disabled={state.isSyncing} />
        {guards.length > 0 ? guards.map(({ guard, latestShift }) => (
          <View key={guard.id} style={styles.inlineSection}>
            <Text style={styles.inlineTitle}>{guard.name}</Text>
            <Caption>{guard.shiftLabel}{guard.vendorName ? ` - ${guard.vendorName}` : ''}</Caption>
            <Caption>{guard.phone}</Caption>
            <Caption>{latestShift ? `Gate ${latestShift.gate} - ${formatLongDate(latestShift.start)}` : 'No shift record yet'}</Caption>
          </View>
        )) : <Caption>No guards added yet.</Caption>}
      </SurfaceCard>

      <SurfaceCard>
        <SectionHeader
          title="Domestic staff verification and approvals"
          description="Resident owners and tenants can submit staff requests from their workspace. Review them here before access is treated as verified."
        />
        {pendingStaff.length > 0 ? (
          pendingStaff.map(({ staff, assignments, employerUnits, requestedBy }) => (
            <View key={`pending-${staff.id}`} style={styles.inlineSection}>
              <View style={styles.rowBetween}>
                <Text style={styles.inlineTitle}>{staff.name}</Text>
                <Pill label="Pending approval" tone="warning" />
              </View>
              <Caption>{humanizeStaffCategory(staff.category)} - {staff.phone}</Caption>
              <Caption>
                Works for: {employerUnits.map((unit) => unit.code).join(', ') || 'No units linked'}
              </Caption>
              <Caption>
                Submitted by {requestedBy?.name ?? 'Unknown resident'} on{' '}
                {staff.requestedAt ? formatLongDate(staff.requestedAt) : 'date not recorded'}
              </Caption>
              {getAssignmentSummaries(assignments).map((summary) => (
                <Caption key={`${staff.id}-${summary}`}>{summary}</Caption>
              ))}
              <View style={styles.heroActions}>
                <ActionButton
                  label={state.isSyncing ? 'Processing...' : 'Approve'}
                  onPress={() => actions.reviewStaffVerification(societyId, staff.id, 'verified')}
                  disabled={state.isSyncing}
                />
                <ActionButton
                  label={state.isSyncing ? 'Processing...' : 'Mark expired'}
                  onPress={() => actions.reviewStaffVerification(societyId, staff.id, 'expired')}
                  disabled={state.isSyncing}
                  variant="secondary"
                />
              </View>
            </View>
          ))
        ) : (
          <Caption>No pending staff approvals right now.</Caption>
        )}
        <View style={styles.detailPanel}>
          <Text style={styles.detailTitle}>Chairman direct entry</Text>
          <Caption>
            Use this when the chairman is registering a verified vendor or backfilling an existing domestic staff record directly from admin operations.
          </Caption>
        <View style={styles.choiceRow}>
          {staffCategories.map((option) => (
            <ChoiceChip key={option.key} label={option.label} selected={staffCategory === option.key} onPress={() => setStaffCategory(option.key)} />
          ))}
        </View>
        <View style={styles.choiceRow}>
          {verificationStates.map((option) => (
            <ChoiceChip key={option.key} label={option.label} selected={staffState === option.key} onPress={() => setStaffState(option.key)} />
          ))}
        </View>
        <View style={styles.formGrid}>
          <View style={styles.formField}><InputField label="Staff name" value={staffName} onChangeText={setStaffName} placeholder="Sunita Ben" /></View>
          <View style={styles.formField}><InputField label="Phone" value={staffPhone} onChangeText={setStaffPhone} keyboardType="phone-pad" placeholder="+91 98980 55555" /></View>
          <View style={styles.formField}><InputField label="Resident numbers" value={staffUnits} onChangeText={setStaffUnits} placeholder="Plot 07, Plot 08" /></View>
          <View style={styles.formField}><InputField label="Service label" value={serviceLabel} onChangeText={setServiceLabel} placeholder="Cooking or cleaning" /></View>
          <View style={styles.formField}><InputField label="Visits per week" value={visitsPerWeek} onChangeText={setVisitsPerWeek} keyboardType="numeric" placeholder="6" /></View>
        </View>
        <ActionButton label={state.isSyncing ? 'Saving...' : 'Add staff verification'} onPress={saveStaff} disabled={state.isSyncing} />
        </View>
        {staff.length > 0 ? staff.map(({ staff, assignments, employerUnits }) => (
          <View key={staff.id} style={styles.inlineSection}>
            <View style={styles.rowBetween}>
              <Text style={styles.inlineTitle}>{staff.name}</Text>
              <Pill
                label={humanizeVerificationState(staff.verificationState)}
                tone={getVerificationTone(staff.verificationState)}
              />
            </View>
            <Caption>{humanizeStaffCategory(staff.category)} - {staff.phone}</Caption>
            <Caption>Works for: {employerUnits.map((unit) => unit.code).join(', ') || 'No units linked'}</Caption>
            <Caption>
              Submitted by {staff.requestedByUserId ? 'resident or chairman' : 'system'} on{' '}
              {staff.requestedAt ? formatLongDate(staff.requestedAt) : 'date not recorded'}
            </Caption>
            {getAssignmentSummaries(assignments).map((summary) => (
              <Caption key={`${staff.id}-${summary}`}>{summary}</Caption>
            ))}
          </View>
        )) : <Caption>No staff records added yet.</Caption>}
      </SurfaceCard>

      <SurfaceCard>
        <SectionHeader title="Recent entry logs" />
        <View style={styles.choiceRow}>
          {entrySubjects.map((option) => (
            <ChoiceChip key={option.key} label={option.label} selected={entrySubject === option.key} onPress={() => setEntrySubject(option.key)} />
          ))}
          {entryStatuses.map((option) => (
            <ChoiceChip key={option.key} label={option.label} selected={entryState === option.key} onPress={() => setEntryState(option.key)} />
          ))}
        </View>
        <View style={styles.formGrid}>
          <View style={styles.formField}><InputField label="Subject name" value={entryName} onChangeText={setEntryName} placeholder="Amazon parcel" /></View>
          <View style={styles.formField}><InputField label="Resident number" value={entryUnit} onChangeText={setEntryUnit} placeholder="Plot 07" /></View>
        </View>
        <ActionButton label={state.isSyncing ? 'Saving...' : 'Add entry log'} onPress={saveEntry} disabled={state.isSyncing} />
        {entries.length > 0 ? entries.map(({ entry, unit }) => (
          <View key={entry.id} style={styles.inlineSection}>
            <View style={styles.rowBetween}>
              <Text style={styles.inlineTitle}>{entry.subjectName}</Text>
              <Pill label={entry.status} tone={entry.status === 'inside' ? 'primary' : 'accent'} />
            </View>
            <Caption>{entry.subjectType}{unit ? ` - ${unit.code}` : ''} - {formatLongDate(entry.enteredAt)}</Caption>
          </View>
        )) : <Caption>No entry logs added yet.</Caption>}
      </SurfaceCard>
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
          <Caption>Audience: {announcement.audience} - {formatShortDate(announcement.createdAt)}</Caption>
        </SurfaceCard>
      ))}
      <SectionHeader title="Policy and rule documents" />
      {rules.map((rule) => (
        <SurfaceCard key={rule.id}>
          <Text style={styles.cardTitle}>{rule.title}</Text>
          <Caption>{rule.version} - Published {formatShortDate(rule.publishedAt)}</Caption>
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
      <SectionHeader title="Audit timeline" description="Durable logs for notices, money movement, complaints, and security actions." />
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
  heroActions: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  cardTitle: { fontSize: 18, fontWeight: '800', color: palette.ink, flex: 1 },
  requestCard: { gap: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: '#EFE5D9' },
  recommendationGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  recommendationCard: { flexGrow: 1, flexBasis: 260, gap: spacing.sm, padding: spacing.md, borderRadius: 20, backgroundColor: palette.surfaceMuted, borderWidth: 1, borderColor: '#E4D8CA' },
  recommendationTitle: { fontSize: 16, fontWeight: '800', color: palette.ink },
  interactiveCard: { backgroundColor: palette.surface, borderRadius: 24, padding: spacing.lg, gap: spacing.sm, borderWidth: 1, borderColor: palette.border },
  interactiveCardActive: { borderColor: palette.primary, backgroundColor: '#F8F3EB' },
  interactiveCardPressed: { opacity: 0.9 },
  detailStack: { gap: spacing.md, paddingTop: spacing.sm },
  detailPanel: { gap: spacing.sm, padding: spacing.md, borderRadius: 20, backgroundColor: palette.white, borderWidth: 1, borderColor: '#E7DDD0' },
  detailTitle: { fontSize: 15, fontWeight: '800', color: palette.ink },
  formGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  formField: { flexGrow: 1, flexBasis: 220 },
  choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  inlineSection: { gap: spacing.xs, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: '#EFE5D9' },
  inlineTitle: { fontSize: 15, fontWeight: '800', color: palette.ink },
});

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function nowDateTimeString(hour: number) {
  const value = new Date();
  value.setHours(hour, 0, 0, 0);
  return value.toISOString().slice(0, 16);
}

function parseUnitCodes(value: string) {
  return [...new Set(value.split(/[\n,]+/).map((item) => item.trim()).filter(Boolean))];
}

function humanizeStaffCategory(category: 'domesticHelp' | 'cook' | 'driver' | 'vendor') {
  switch (category) {
    case 'domesticHelp':
      return 'Domestic help';
    case 'cook':
      return 'Cook';
    case 'driver':
      return 'Driver';
    case 'vendor':
      return 'Vendor';
    default:
      return category;
  }
}

function humanizeVerificationState(verificationState: 'pending' | 'verified' | 'expired') {
  switch (verificationState) {
    case 'pending':
      return 'Pending approval';
    case 'verified':
      return 'Verified';
    case 'expired':
      return 'Expired';
    default:
      return verificationState;
  }
}

function getVerificationTone(verificationState: 'pending' | 'verified' | 'expired') {
  switch (verificationState) {
    case 'verified':
      return 'success' as const;
    case 'expired':
      return 'accent' as const;
    case 'pending':
    default:
      return 'warning' as const;
  }
}

function getAssignmentSummaries(assignments: Array<{ serviceLabel: string; visitsPerWeek: number }>) {
  return [...new Set(assignments.map((assignment) => {
    const visitLabel = assignment.visitsPerWeek === 1 ? 'visit' : 'visits';
    return `${assignment.serviceLabel} - ${assignment.visitsPerWeek} ${visitLabel} per week`;
  }))];
}

function humanizeInvoiceStatus(status: 'paid' | 'pending' | 'overdue') {
  switch (status) {
    case 'paid':
      return 'Paid';
    case 'overdue':
      return 'Overdue';
    case 'pending':
    default:
      return 'Pending';
  }
}

function getInvoiceStatusTone(status: 'paid' | 'pending' | 'overdue') {
  switch (status) {
    case 'paid':
      return 'success' as const;
    case 'overdue':
      return 'warning' as const;
    case 'pending':
    default:
      return 'accent' as const;
  }
}

function humanizePaymentStatus(status: 'captured' | 'pending' | 'rejected') {
  switch (status) {
    case 'captured':
      return 'Captured';
    case 'pending':
      return 'Pending review';
    case 'rejected':
      return 'Rejected';
    default:
      return status;
  }
}

function getPaymentStatusTone(status: 'captured' | 'pending' | 'rejected') {
  switch (status) {
    case 'captured':
      return 'success' as const;
    case 'rejected':
      return 'accent' as const;
    case 'pending':
    default:
      return 'warning' as const;
  }
}

function humanizePaymentMethod(method: 'upi' | 'netbanking' | 'cash') {
  switch (method) {
    case 'upi':
      return 'UPI';
    case 'netbanking':
      return 'Netbanking';
    case 'cash':
      return 'Cash';
    default:
      return method;
  }
}

function humanizeBookingStatus(status: 'confirmed' | 'pending' | 'waitlisted') {
  switch (status) {
    case 'confirmed':
      return 'Confirmed';
    case 'waitlisted':
      return 'Waitlisted';
    case 'pending':
    default:
      return 'Pending review';
  }
}

function getBookingTone(status: 'confirmed' | 'pending' | 'waitlisted') {
  switch (status) {
    case 'confirmed':
      return 'success' as const;
    case 'waitlisted':
      return 'accent' as const;
    case 'pending':
    default:
      return 'warning' as const;
  }
}

function humanizeComplaintCategory(category: 'plumbing' | 'security' | 'billing' | 'cleaning' | 'general') {
  switch (category) {
    case 'plumbing':
      return 'Plumbing';
    case 'security':
      return 'Security';
    case 'billing':
      return 'Billing';
    case 'cleaning':
      return 'Cleaning';
    case 'general':
    default:
      return 'General';
  }
}

function humanizeComplaintStatus(status: 'open' | 'inProgress' | 'resolved') {
  switch (status) {
    case 'inProgress':
      return 'In progress';
    case 'resolved':
      return 'Resolved';
    case 'open':
    default:
      return 'Open';
  }
}

function getComplaintTone(status: 'open' | 'inProgress' | 'resolved') {
  switch (status) {
    case 'resolved':
      return 'success' as const;
    case 'inProgress':
      return 'primary' as const;
    case 'open':
    default:
      return 'warning' as const;
  }
}

function getUnitClaimLabel(society: { structure: 'apartment' | 'bungalow' | 'commercial'; commercialSpaceType?: 'shed' | 'office' | null }) {
  if (society.structure === 'commercial') {
    return society.commercialSpaceType === 'office' ? 'office space' : 'shed';
  }

  return society.structure === 'bungalow' ? 'plot' : 'apartment';
}
