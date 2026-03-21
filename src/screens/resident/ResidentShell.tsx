import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  ActionButton,
  Caption,
  ChoiceChip,
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
  deriveProfiles,
  formatCurrency,
  formatLongDate,
  formatShortDate,
  getAmenitiesForSociety,
  getAnnouncementsForSociety,
  getBookingsForUserSociety,
  getComplaintsForUserSociety,
  getCurrentUser,
  getEntryLogsForSociety,
  getGuardRosterForSociety,
  getMembershipForSociety,
  getPaymentRemindersForUser,
  getPaymentsForUserSociety,
  getResidentOverview,
  getRulesForSociety,
  getSelectedSociety,
  getStaffVerificationDirectory,
  getUnitsForSociety,
  humanizeRole,
} from '../../utils/selectors';
import { ComplaintCategory, PaymentMethod } from '../../types/domain';

type ResidentTab = 'home' | 'billing' | 'notices' | 'bookings' | 'helpdesk' | 'profile';

const residentTabs: Array<{ key: ResidentTab; label: string }> = [
  { key: 'home', label: 'Home' },
  { key: 'billing', label: 'Billing' },
  { key: 'notices', label: 'Notices' },
  { key: 'bookings', label: 'Bookings' },
  { key: 'helpdesk', label: 'Helpdesk' },
  { key: 'profile', label: 'Profile' },
];

const staffCategories = [
  { key: 'domesticHelp' as const, label: 'Domestic help' },
  { key: 'cook' as const, label: 'Cook' },
  { key: 'driver' as const, label: 'Driver' },
  { key: 'vendor' as const, label: 'Vendor' },
];

const paymentMethods = [
  { key: 'upi' as const, label: 'UPI' },
  { key: 'netbanking' as const, label: 'Netbanking' },
  { key: 'cash' as const, label: 'Cash' },
];

const complaintCategories = [
  { key: 'general' as const, label: 'General' },
  { key: 'plumbing' as const, label: 'Plumbing' },
  { key: 'cleaning' as const, label: 'Cleaning' },
  { key: 'billing' as const, label: 'Billing' },
  { key: 'security' as const, label: 'Security' },
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

      {activeTab === 'home' ? <ResidentHome societyId={society.id} userId={user.id} onOpenTab={setActiveTab} /> : null}
      {activeTab === 'billing' ? <ResidentBilling societyId={society.id} userId={user.id} /> : null}
      {activeTab === 'notices' ? <ResidentNotices societyId={society.id} userId={user.id} /> : null}
      {activeTab === 'bookings' ? <ResidentBookings societyId={society.id} userId={user.id} /> : null}
      {activeTab === 'helpdesk' ? <ResidentHelpdesk societyId={society.id} userId={user.id} /> : null}
      {activeTab === 'profile' ? <ResidentProfile societyId={society.id} userId={user.id} /> : null}
    </Page>
  );
}

function ResidentHome({
  societyId,
  userId,
  onOpenTab,
}: {
  societyId: string;
  userId: string;
  onOpenTab: (tab: ResidentTab) => void;
}) {
  const { state } = useApp();
  const overview = getResidentOverview(state.data, userId, societyId);
  const membership = getMembershipForSociety(state.data, userId, societyId);
  const unitIds = new Set(membership?.unitIds ?? []);
  const guardRoster = getGuardRosterForSociety(state.data, societyId);
  const unitEntryLogs = getEntryLogsForSociety(state.data, societyId)
    .filter(({ entry }) => entry.unitId && unitIds.has(entry.unitId))
    .slice(0, 4);

  return (
    <>
      <SurfaceCard>
        <SectionHeader title="Quick actions" />
        <View style={styles.heroActions}>
          <ActionButton label="Pay maintenance" onPress={() => onOpenTab('billing')} variant="secondary" />
          <ActionButton label="Book amenity" onPress={() => onOpenTab('bookings')} variant="secondary" />
          <ActionButton label="Raise complaint" onPress={() => onOpenTab('helpdesk')} variant="secondary" />
          <ActionButton label="Register staff" onPress={() => onOpenTab('profile')} variant="secondary" />
        </View>
      </SurfaceCard>

      <SurfaceCard>
        <SectionHeader title="Today at a glance" />
        <Caption>
          You have {overview.outstandingInvoices.length} unpaid invoice(s), {overview.myPendingPayments.length} payment flag(s) under review, {overview.myBookings.length} booking(s), and {overview.myStaffAssignments.length} household staff assignment(s).
        </Caption>
        {overview.myPaymentReminders.length > 0 ? (
          <Caption>{overview.myPaymentReminders.length} maintenance reminder(s) are waiting in your billing tab.</Caption>
        ) : null}
      </SurfaceCard>

      <SurfaceCard>
        <SectionHeader
          title="Security and access"
          description="Guards and entry records added by the chairman appear here for your unit."
        />
        <Caption>
          Guards on roster: {guardRoster.map(({ guard }) => guard.name).join(', ') || 'Not configured yet'}
        </Caption>
        {unitEntryLogs.length > 0 ? (
          unitEntryLogs.map(({ entry, unit }) => (
            <View key={entry.id} style={styles.compactText}>
              <Text style={styles.compactTitle}>{entry.subjectName}</Text>
              <Caption>
                {entry.subjectType} {unit ? `- ${unit.code}` : ''} - {entry.status} - {formatLongDate(entry.enteredAt)}
              </Caption>
            </View>
          ))
        ) : (
          <Caption>No recent unit-level entry records yet.</Caption>
        )}
      </SurfaceCard>
    </>
  );
}

function ResidentBilling({ societyId, userId }: { societyId: string; userId: string }) {
  const { state, actions } = useApp();
  const overview = getResidentOverview(state.data, userId, societyId);
  const paymentHistory = getPaymentsForUserSociety(state.data, userId, societyId);
  const reminders = getPaymentRemindersForUser(state.data, userId, societyId);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(overview.outstandingInvoices[0]?.id ?? null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('upi');
  const [paidAt, setPaidAt] = useState(nowDateTimeInputValue());
  const [referenceNote, setReferenceNote] = useState('');

  const pendingInvoiceIds = new Set(
    paymentHistory
      .filter(({ payment }) => payment.status === 'pending')
      .map(({ invoice }) => invoice.id),
  );
  const selectedInvoice = overview.outstandingInvoices.find((invoice) => invoice.id === selectedInvoiceId)
    ?? overview.outstandingInvoices.find((invoice) => !pendingInvoiceIds.has(invoice.id))
    ?? overview.outstandingInvoices[0]
    ?? null;

  async function handleSubmitPayment() {
    if (!selectedInvoice) {
      return;
    }

    const saved = await actions.submitResidentPayment(societyId, {
      invoiceId: selectedInvoice.id,
      amountInr: String(selectedInvoice.amountInr),
      method: paymentMethod,
      paidAt,
      referenceNote,
    });

    if (saved) {
      setReferenceNote('');
      setPaidAt(nowDateTimeInputValue());
      const nextInvoice = overview.outstandingInvoices.find((invoice) => invoice.id !== selectedInvoice.id && !pendingInvoiceIds.has(invoice.id));
      setSelectedInvoiceId(nextInvoice?.id ?? null);
    }
  }

  return (
    <>
      <SurfaceCard>
        <SectionHeader
          title="Maintenance billing"
          description="Flag a maintenance payment here. The admin billing desk reviews it and updates the central ledger for the whole society."
        />
        <View style={styles.metricGrid}>
          <MetricCard label="Outstanding dues" value={formatCurrency(overview.totalDue)} tone="accent" />
          <MetricCard label="Payment flags" value={String(overview.myPendingPayments.length)} tone="primary" />
          <MetricCard label="Reminder notices" value={String(reminders.length)} tone="blue" />
        </View>
      </SurfaceCard>

      {reminders.length > 0 ? (
        <SurfaceCard>
          <SectionHeader title="Recent payment reminders" />
          {reminders.map(({ reminder, invoices, units, sentBy }) => (
            <View key={reminder.id} style={styles.inlineSection}>
              <Text style={styles.compactTitle}>Reminder from {sentBy?.name ?? 'Admin desk'}</Text>
              <Caption>{reminder.message}</Caption>
              <Caption>Units: {units.map((unit) => unit.code).join(', ')}</Caption>
              <Caption>Invoices: {invoices.map((invoice) => invoice.periodLabel).join(', ')}</Caption>
              <Caption>Sent on {formatLongDate(reminder.sentAt)}</Caption>
            </View>
          ))}
        </SurfaceCard>
      ) : null}

      <SurfaceCard>
        <SectionHeader title="Flag payment for review" description="Pick an unpaid invoice, record how you paid, and send it to the chairman for confirmation." />
        {overview.outstandingInvoices.length > 0 ? (
          <>
            <View style={styles.choiceRow}>
              {overview.outstandingInvoices.map((invoice) => {
                const invoiceLabel = `${invoice.periodLabel} - ${formatCurrency(invoice.amountInr)}`;
                return (
                  <ChoiceChip
                    key={invoice.id}
                    label={pendingInvoiceIds.has(invoice.id) ? `${invoiceLabel} flagged` : invoiceLabel}
                    selected={selectedInvoice?.id === invoice.id}
                    onPress={() => setSelectedInvoiceId(invoice.id)}
                  />
                );
              })}
            </View>
            {selectedInvoice ? (
              <View style={styles.inlineSection}>
                <Caption>
                  The exact invoice amount of {formatCurrency(selectedInvoice.amountInr)} will be sent for {selectedInvoice.periodLabel}.
                </Caption>
                <View style={styles.choiceRow}>
                  {paymentMethods.map((option) => (
                    <ChoiceChip
                      key={option.key}
                      label={option.label}
                      selected={paymentMethod === option.key}
                      onPress={() => setPaymentMethod(option.key)}
                    />
                  ))}
                </View>
                <View style={styles.formGrid}>
                  <View style={styles.formField}>
                    <InputField label="Paid on" value={paidAt} onChangeText={setPaidAt} placeholder="2026-03-20T10:30" />
                  </View>
                  <View style={styles.formField}>
                    <InputField
                      label="Reference / note"
                      value={referenceNote}
                      onChangeText={setReferenceNote}
                      placeholder="UPI ref, cheque no, or bank note"
                    />
                  </View>
                </View>
                <ActionButton
                  label={state.isSyncing ? 'Submitting...' : 'Send payment for admin review'}
                  onPress={handleSubmitPayment}
                  disabled={state.isSyncing || pendingInvoiceIds.has(selectedInvoice.id)}
                />
                {pendingInvoiceIds.has(selectedInvoice.id) ? (
                  <Caption>A payment flag is already pending for this invoice.</Caption>
                ) : null}
              </View>
            ) : null}
          </>
        ) : (
          <Caption>No unpaid maintenance invoices are linked to your units right now.</Caption>
        )}
      </SurfaceCard>

      <SectionHeader title="Outstanding invoices" />
      {overview.outstandingInvoices.length > 0 ? overview.outstandingInvoices.map((invoice) => {
        const relatedPayment = paymentHistory.find(({ invoice: paymentInvoice }) => paymentInvoice.id === invoice.id);
        return (
          <SurfaceCard key={invoice.id}>
            <View style={styles.rowBetween}>
              <Text style={styles.cardTitle}>{invoice.periodLabel}</Text>
              <Pill label={humanizeInvoiceStatus(invoice.status)} tone={invoice.status === 'overdue' ? 'warning' : 'accent'} />
            </View>
            <Caption>Due on {formatLongDate(invoice.dueDate)} - {formatCurrency(invoice.amountInr)}</Caption>
            {relatedPayment ? (
              <Caption>
                Latest payment flag: {humanizePaymentStatus(relatedPayment.payment.status)} via {humanizePaymentMethod(relatedPayment.payment.method)}
              </Caption>
            ) : (
              <Caption>No payment has been flagged yet for this invoice.</Caption>
            )}
          </SurfaceCard>
        );
      }) : (
        <SurfaceCard><Caption>No outstanding maintenance invoices.</Caption></SurfaceCard>
      )}

      <SectionHeader title="Payment history" />
      {paymentHistory.length > 0 ? paymentHistory.map(({ payment, invoice, unit, receipt, reviewedBy }) => (
        <SurfaceCard key={payment.id}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>{invoice.periodLabel}</Text>
            <Pill label={humanizePaymentStatus(payment.status)} tone={getPaymentStatusTone(payment.status)} />
          </View>
          <Caption>{unit?.code ?? 'Unit'} - {formatCurrency(payment.amountInr)} via {humanizePaymentMethod(payment.method)}</Caption>
          <Caption>Paid on {formatLongDate(payment.paidAt)}</Caption>
          {payment.referenceNote ? <Caption>Reference: {payment.referenceNote}</Caption> : null}
          {receipt ? <Caption>Receipt: {receipt.number}</Caption> : null}
          {reviewedBy && payment.reviewedAt ? <Caption>Reviewed by {reviewedBy.name} on {formatLongDate(payment.reviewedAt)}</Caption> : null}
        </SurfaceCard>
      )) : (
        <SurfaceCard><Caption>No payment history yet.</Caption></SurfaceCard>
      )}
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
  const { state, actions } = useApp();
  const membership = getMembershipForSociety(state.data, userId, societyId);
  const units = getUnitsForSociety(state.data, societyId).filter((unit) => membership?.unitIds.includes(unit.id));
  const amenities = getAmenitiesForSociety(state.data, societyId);
  const bookings = getBookingsForUserSociety(state.data, userId, societyId);
  const bookableAmenities = amenities.filter((amenity) => amenity.bookingType !== 'info');
  const [selectedAmenityId, setSelectedAmenityId] = useState<string | null>(bookableAmenities[0]?.id ?? null);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(units[0]?.id ?? null);
  const [bookingDate, setBookingDate] = useState(todayString());
  const [startTime, setStartTime] = useState('18:00');
  const [endTime, setEndTime] = useState('20:00');
  const [guests, setGuests] = useState('4');
  const selectedAmenity = bookableAmenities.find((amenity) => amenity.id === selectedAmenityId) ?? null;
  const selectedAmenityRules = state.data.amenityScheduleRules.filter(
    (rule) => rule.amenityId === selectedAmenity?.id,
  );

  async function handleCreateBooking() {
    if (!selectedAmenity) {
      return;
    }

    const saved = await actions.createAmenityBooking(societyId, {
      amenityId: selectedAmenity.id,
      unitId: selectedUnitId ?? undefined,
      date: bookingDate,
      startTime,
      endTime,
      guests,
    });

    if (saved) {
      setGuests('4');
    }
  }

  return (
    <>
      <SectionHeader
        title="Raise an amenity booking"
        description="Choose the amenity, slot, and linked unit here. The same request then appears in the admin amenities module for review."
      />
      <SurfaceCard>
        {bookableAmenities.length > 0 ? (
          <View style={styles.inlineSection}>
            <Text style={styles.compactTitle}>Amenity</Text>
            <View style={styles.choiceRow}>
              {bookableAmenities.map((amenity) => (
                <ChoiceChip
                  key={amenity.id}
                  label={amenity.name}
                  selected={selectedAmenity?.id === amenity.id}
                  onPress={() => setSelectedAmenityId(amenity.id)}
                />
              ))}
            </View>
            <Text style={styles.compactTitle}>Linked resident number</Text>
            <View style={styles.choiceRow}>
              {units.map((unit) => (
                <ChoiceChip
                  key={unit.id}
                  label={unit.code}
                  selected={selectedUnitId === unit.id}
                  onPress={() => setSelectedUnitId(unit.id)}
                />
              ))}
            </View>
            <View style={styles.formGrid}>
              <View style={styles.formField}>
                <InputField label="Booking date" value={bookingDate} onChangeText={setBookingDate} placeholder="2026-03-24" />
              </View>
              <View style={styles.formField}>
                <InputField label="Start time" value={startTime} onChangeText={setStartTime} placeholder="18:00" />
              </View>
              <View style={styles.formField}>
                <InputField label="End time" value={endTime} onChangeText={setEndTime} placeholder="20:00" />
              </View>
              <View style={styles.formField}>
                <InputField label="Guests" value={guests} onChangeText={setGuests} keyboardType="numeric" placeholder="4" />
              </View>
            </View>
            {selectedAmenity ? (
              <>
                <Caption>
                  Approval mode: {selectedAmenity.approvalMode === 'committee' ? 'Chairman review' : 'Auto confirm if the slot is free'}.
                </Caption>
                {selectedAmenityRules.length > 0 ? (
                  <Caption>
                    Configured slots: {selectedAmenityRules.map((rule) => `${rule.slotLabel} (${rule.startTime}-${rule.endTime})`).join(', ')}
                  </Caption>
                ) : null}
              </>
            ) : null}
            <ActionButton
              label={state.isSyncing ? 'Submitting...' : 'Submit booking request'}
              onPress={handleCreateBooking}
              disabled={state.isSyncing || !selectedAmenity || !selectedUnitId}
            />
          </View>
        ) : (
          <Caption>No bookable amenities are configured yet. Info-only amenities remain visible below but cannot be reserved.</Caption>
        )}
      </SurfaceCard>

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
      {bookings.length > 0 ? bookings.map((booking) => {
        const amenity = amenities.find((item) => item.id === booking.amenityId);

        return (
          <SurfaceCard key={booking.id}>
            <View style={styles.rowBetween}>
              <Text style={styles.cardTitle}>{amenity?.name ?? 'Amenity booking'}</Text>
              <Pill label={humanizeBookingStatus(booking.status)} tone={getBookingTone(booking.status)} />
            </View>
            <Caption>
              {formatLongDate(booking.date)} - {booking.startTime} to {booking.endTime}
            </Caption>
            <Caption>Guests: {booking.guests}</Caption>
          </SurfaceCard>
        );
      }) : (
        <SurfaceCard><Caption>No amenity bookings raised yet.</Caption></SurfaceCard>
      )}
    </>
  );
}

function ResidentHelpdesk({ societyId, userId }: { societyId: string; userId: string }) {
  const { state, actions } = useApp();
  const membership = getMembershipForSociety(state.data, userId, societyId);
  const userUnits = getUnitsForSociety(state.data, societyId).filter((unit) =>
    membership?.unitIds.includes(unit.id),
  );
  const complaints = getComplaintsForUserSociety(state.data, userId, societyId);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(userUnits[0]?.id ?? null);
  const [category, setCategory] = useState<ComplaintCategory>('general');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  async function handleRaiseComplaint() {
    if (!selectedUnitId) {
      return;
    }

    const saved = await actions.createComplaintTicket(societyId, {
      unitId: selectedUnitId,
      category,
      title,
      description,
    });

    if (saved) {
      setCategory('general');
      setTitle('');
      setDescription('');
    }
  }

  return (
    <>
      <SectionHeader
        title="Helpdesk tickets"
        description="Raise a ticket here and it flows into the chairman helpdesk queue with the linked unit and issue details."
      />
      <SurfaceCard>
        <View style={styles.inlineSection}>
          <Text style={styles.compactTitle}>Raise a new ticket</Text>
          <View style={styles.choiceRow}>
            {userUnits.map((unit) => (
              <ChoiceChip
                key={unit.id}
                label={unit.code}
                selected={selectedUnitId === unit.id}
                onPress={() => setSelectedUnitId(unit.id)}
              />
            ))}
          </View>
          <View style={styles.choiceRow}>
            {complaintCategories.map((option) => (
              <ChoiceChip
                key={option.key}
                label={option.label}
                selected={category === option.key}
                onPress={() => setCategory(option.key)}
              />
            ))}
          </View>
          <View style={styles.formGrid}>
            <View style={styles.formField}>
              <InputField label="Ticket title" value={title} onChangeText={setTitle} placeholder="Leakage near kitchen sink" />
            </View>
          </View>
          <InputField
            label="Details"
            value={description}
            onChangeText={setDescription}
            multiline
            placeholder="Explain the issue, when it started, and anything the chairman should know before assigning it."
          />
          <ActionButton
            label={state.isSyncing ? 'Submitting...' : 'Raise helpdesk ticket'}
            onPress={handleRaiseComplaint}
            disabled={state.isSyncing || !selectedUnitId}
          />
        </View>
      </SurfaceCard>
      {complaints.length > 0 ? complaints.map((complaint) => (
        <SurfaceCard key={complaint.id}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>{complaint.title}</Text>
            <Pill
              label={humanizeComplaintStatus(complaint.status)}
              tone={getComplaintTone(complaint.status)}
            />
          </View>
          <Caption>
            {humanizeComplaintCategory(complaint.category)} - Raised on {formatLongDate(complaint.createdAt)}
          </Caption>
          {complaint.description ? <Caption>{complaint.description}</Caption> : null}
          <Caption>Assigned to: {complaint.assignedTo ?? 'Awaiting assignment'}</Caption>
        </SurfaceCard>
      )) : (
        <SurfaceCard><Caption>No helpdesk tickets raised yet.</Caption></SurfaceCard>
      )}
    </>
  );
}

function ResidentProfile({ societyId, userId }: { societyId: string; userId: string }) {
  const { state, actions } = useApp();
  const membership = getMembershipForSociety(state.data, userId, societyId);
  const units = getUnitsForSociety(state.data, societyId).filter((unit) => membership?.unitIds.includes(unit.id));
  const allowedUnitIds = new Set(units.map((unit) => unit.id));
  const staff = getStaffVerificationDirectory(state.data, societyId).filter(
    ({ staff, employerUnits }) =>
      staff.requestedByUserId === userId || employerUnits.some((unit) => allowedUnitIds.has(unit.id)),
  );
  const canSubmitStaffRequest = membership?.roles.some((role) => role === 'owner' || role === 'tenant') ?? false;
  const [staffName, setStaffName] = useState('');
  const [staffPhone, setStaffPhone] = useState('');
  const [staffCategory, setStaffCategory] = useState<'domesticHelp' | 'cook' | 'driver' | 'vendor'>('domesticHelp');
  const [serviceLabel, setServiceLabel] = useState('');
  const [visitsPerWeek, setVisitsPerWeek] = useState('6');
  const [selectedUnitCodes, setSelectedUnitCodes] = useState<string[]>(() =>
    units.length === 1 ? [units[0].code] : [],
  );

  function toggleUnitCode(unitCode: string) {
    setSelectedUnitCodes((currentSelection) =>
      currentSelection.includes(unitCode)
        ? currentSelection.filter((code) => code !== unitCode)
        : [...currentSelection, unitCode],
    );
  }

  async function handleSubmitStaffRequest() {
    const saved = await actions.submitResidentStaffVerification(societyId, {
      name: staffName,
      phone: staffPhone,
      category: staffCategory,
      employerUnitCodes: selectedUnitCodes,
      serviceLabel,
      visitsPerWeek,
    });

    if (saved) {
      setStaffName('');
      setStaffPhone('');
      setStaffCategory('domesticHelp');
      setServiceLabel('');
      setVisitsPerWeek('6');
      setSelectedUnitCodes(units.length === 1 ? [units[0].code] : []);
    }
  }

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
        <Caption>
          Owners and tenants can register a domestic staff request here. The chairman reviews it before the record becomes verified for society security and occupancy tracking.
        </Caption>
        {canSubmitStaffRequest ? (
          <View style={styles.inlineSection}>
            <Text style={styles.compactTitle}>Add domestic staff request</Text>
            <View style={styles.choiceRow}>
              {staffCategories.map((option) => (
                <ChoiceChip
                  key={option.key}
                  label={option.label}
                  selected={staffCategory === option.key}
                  onPress={() => setStaffCategory(option.key)}
                />
              ))}
            </View>
            <View style={styles.formGrid}>
              <View style={styles.formField}>
                <InputField label="Staff name" value={staffName} onChangeText={setStaffName} placeholder="Sarita Ben" />
              </View>
              <View style={styles.formField}>
                <InputField label="Phone" value={staffPhone} onChangeText={setStaffPhone} keyboardType="phone-pad" placeholder="+91 98980 55555" />
              </View>
              <View style={styles.formField}>
                <InputField label="Service label" value={serviceLabel} onChangeText={setServiceLabel} placeholder="Cleaning and utensils" />
              </View>
              <View style={styles.formField}>
                <InputField label="Visits per week" value={visitsPerWeek} onChangeText={setVisitsPerWeek} keyboardType="numeric" placeholder="6" />
              </View>
            </View>
            <Text style={styles.compactTitle}>Select linked unit numbers</Text>
            <Caption>Choose one or more units already linked to your membership.</Caption>
            <View style={styles.choiceRow}>
              {units.map((unit) => (
                <ChoiceChip
                  key={unit.id}
                  label={unit.code}
                  selected={selectedUnitCodes.includes(unit.code)}
                  onPress={() => toggleUnitCode(unit.code)}
                />
              ))}
            </View>
            <ActionButton
              label={state.isSyncing ? 'Submitting...' : 'Send for chairman approval'}
              onPress={handleSubmitStaffRequest}
              disabled={state.isSyncing || units.length === 0 || selectedUnitCodes.length === 0}
            />
          </View>
        ) : (
          <View style={styles.inlineSection}>
            <Caption>
              Only an owner or tenant can initiate a domestic staff request. Family and occupant profiles can still see the records already linked to their units.
            </Caption>
          </View>
        )}
        {staff.length > 0 ? (
          staff.map(({ staff, assignments, employerUnits, reviewedBy }) => (
            <View key={staff.id} style={styles.inlineSection}>
              <View style={styles.compactRow}>
                <View style={styles.compactText}>
                  <Text style={styles.compactTitle}>{staff.name}</Text>
                  <Caption>{humanizeStaffCategory(staff.category)} - {staff.phone}</Caption>
                  <Caption>Works for {employerUnits.map((unit) => unit.code).join(', ') || 'your household'}</Caption>
                  {getAssignmentSummaries(assignments).map((summary) => (
                    <Caption key={`${staff.id}-${summary}`}>{summary}</Caption>
                  ))}
                  <Caption>
                    Submitted {staff.requestedAt ? formatLongDate(staff.requestedAt) : 'recently'}
                  </Caption>
                  <Caption>
                    {reviewedBy && staff.reviewedAt
                      ? `Reviewed by ${reviewedBy.name} on ${formatLongDate(staff.reviewedAt)}`
                      : 'Awaiting chairman approval'}
                  </Caption>
                </View>
                <Pill
                  label={humanizeVerificationState(staff.verificationState)}
                  tone={getVerificationTone(staff.verificationState)}
                />
              </View>
            </View>
          ))
        ) : (
          <View style={styles.inlineSection}>
            <Caption>No domestic staff or vendor records are linked to your units yet.</Caption>
          </View>
        )}
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
  inlineSection: {
    gap: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#EFE5D9',
  },
  choiceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  formGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  formField: {
    flexGrow: 1,
    flexBasis: 220,
  },
});

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

function humanizePaymentMethod(method: PaymentMethod) {
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

function humanizeComplaintCategory(category: ComplaintCategory) {
  switch (category) {
    case 'plumbing':
      return 'Plumbing';
    case 'cleaning':
      return 'Cleaning';
    case 'billing':
      return 'Billing';
    case 'security':
      return 'Security';
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

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function nowDateTimeInputValue() {
  const value = new Date();
  value.setSeconds(0, 0);
  return value.toISOString().slice(0, 16);
}
