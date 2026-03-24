import { useEffect, useMemo, useState } from 'react';
import { Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

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
import { MaintenanceReceiptCard } from '../../components/MaintenanceReceiptCard';
import { useApp } from '../../state/AppContext';
import { palette, spacing } from '../../theme/tokens';
import {
  openWebDataUrlInNewTab,
  pickWebFileAsDataUrl,
  tryDetectVehicleRegistrationFromDataUrl,
} from '../../utils/fileUploads';
import { buildMaintenanceReceiptDetails, openMaintenanceReceiptPdf } from '../../utils/receipts';
import {
  deriveProfiles,
  formatCurrency,
  formatLongDate,
  formatShortDate,
  getAmenitiesForSociety,
  getAnnouncementsForSociety,
  getBookingsForUserSociety,
  getComplaintUpdatesForComplaint,
  getComplaintsForUserSociety,
  getCommunityMembersForSociety,
  getCurrentUser,
  getEntryLogsForSociety,
  getGuardRosterForSociety,
  getImportantContactsForSociety,
  getMembershipForSociety,
  getPaymentRemindersForUser,
  getPaymentsForUserSociety,
  getResidenceProfileForUserSociety,
  getResidentOverview,
  getRulesForSociety,
  getSelectedSociety,
  getStaffVerificationDirectory,
  getUnitsForSociety,
  getVehicleDirectoryForSociety,
  humanizeRole,
} from '../../utils/selectors';
import {
  ComplaintCategory,
  ImportantContactCategory,
  PaymentMethod,
  SeedData,
  VehicleType,
} from '../../types/domain';

type ResidentTab = 'home' | 'community' | 'billing' | 'notices' | 'bookings' | 'helpdesk' | 'profile';
type ResidentCommunitySection = 'members' | 'vehicles' | 'contacts' | 'staff';
type EditableVehicleDraft = {
  id: string;
  unitId: string;
  registrationNumber: string;
  vehicleType: VehicleType;
  color: string;
  parkingSlot: string;
  photoDataUrl: string;
  statusMessage: string;
};

const residentTabs: Array<{ key: ResidentTab; label: string }> = [
  { key: 'home', label: 'Home' },
  { key: 'community', label: 'Community' },
  { key: 'billing', label: 'Billing' },
  { key: 'notices', label: 'Notices' },
  { key: 'bookings', label: 'Bookings' },
  { key: 'helpdesk', label: 'Helpdesk' },
  { key: 'profile', label: 'Profile' },
];

const residentCommunitySections: Array<{ key: ResidentCommunitySection; label: string }> = [
  { key: 'members', label: 'Members' },
  { key: 'vehicles', label: 'Vehicles' },
  { key: 'contacts', label: 'Important contacts' },
  { key: 'staff', label: 'Staff and security' },
];

function createEditableVehicleDraft(unitId = ''): EditableVehicleDraft {
  return {
    id: `vehicle-draft-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    unitId,
    registrationNumber: '',
    vehicleType: 'car',
    color: '',
    parkingSlot: '',
    photoDataUrl: '',
    statusMessage: '',
  };
}

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

type ComplaintTemplate = {
  category: ComplaintCategory;
  title: string;
  description: string;
};

const defaultComplaintTemplates: Record<ComplaintCategory, ComplaintTemplate[]> = {
  general: [
    {
      category: 'general',
      title: 'Power issue in unit',
      description: 'There is a power-related issue affecting {unitCode}. Please check and share the next step.',
    },
    {
      category: 'general',
      title: 'Lift not working',
      description: 'The lift or common facility serving {unitCode} needs attention. Please arrange support.',
    },
    {
      category: 'general',
      title: 'Noise disturbance complaint',
      description: 'There is a repeated disturbance affecting {unitCode}. Please review and help resolve it.',
    },
  ],
  plumbing: [
    {
      category: 'plumbing',
      title: 'Leakage near sink',
      description: 'There is a water leakage near the sink in {unitCode}. Please inspect and confirm the next step.',
    },
    {
      category: 'plumbing',
      title: 'Blocked drain',
      description: 'The drain is blocked in {unitCode}. Please help with cleaning and plumber support.',
    },
    {
      category: 'plumbing',
      title: 'Low water pressure',
      description: 'Water pressure is low in {unitCode}. Please check the line and update me.',
    },
  ],
  cleaning: [
    {
      category: 'cleaning',
      title: 'Common area cleaning missed',
      description: 'Cleaning was missed around {unitCode}. Please arrange housekeeping support.',
    },
    {
      category: 'cleaning',
      title: 'Garbage pickup pending',
      description: 'Garbage pickup is pending near {unitCode}. Please help clear it today.',
    },
    {
      category: 'cleaning',
      title: 'Washroom cleaning required',
      description: 'Cleaning near {unitCode} needs attention. Please schedule housekeeping.',
    },
  ],
  billing: [
    {
      category: 'billing',
      title: 'Maintenance charge clarification',
      description: 'Please share the breakup or clarification for the maintenance charge linked to {unitCode}.',
    },
    {
      category: 'billing',
      title: 'Payment not reflected',
      description: 'My maintenance payment for {unitCode} is not reflected yet. Please verify and update the ledger.',
    },
    {
      category: 'billing',
      title: 'Receipt requested',
      description: 'Please share the maintenance receipt for the recent payment linked to {unitCode}.',
    },
  ],
  security: [
    {
      category: 'security',
      title: 'Visitor entry issue',
      description: 'There was an issue with visitor entry for {unitCode}. Please review the guard desk update.',
    },
    {
      category: 'security',
      title: 'Access not working',
      description: 'Access for {unitCode} is not working properly. Please help restore entry access.',
    },
    {
      category: 'security',
      title: 'Suspicious activity report',
      description: 'Please review a security concern reported near {unitCode} and update me after checking.',
    },
  ],
};

function normalizeComplaintTitle(title: string) {
  return title.trim().toLowerCase().replace(/\s+/g, ' ');
}

function getComplaintTemplateDescription(
  category: ComplaintCategory,
  title: string,
  description: string | undefined,
  unitCode: string,
) {
  const trimmedDescription = description?.trim();

  if (trimmedDescription) {
    return trimmedDescription.replace(/\{unitCode\}/g, unitCode);
  }

  const matchingDefault = defaultComplaintTemplates[category].find(
    (template) => normalizeComplaintTitle(template.title) === normalizeComplaintTitle(title),
  );

  if (matchingDefault) {
    return matchingDefault.description.replace(/\{unitCode\}/g, unitCode);
  }

  return `Please review this ${humanizeComplaintCategory(category).toLowerCase()} issue for ${unitCode} and share the next step.`;
}

function getComplaintTemplatesForSociety(
  data: SeedData,
  societyId: string,
  category: ComplaintCategory,
  unitCode: string,
) {
  const rankedTemplates = new Map<
    string,
    { template: ComplaintTemplate; count: number; latestCreatedAt: string }
  >();

  data.complaints
    .filter((complaint) => complaint.societyId === societyId && complaint.category === category)
    .forEach((complaint) => {
      const normalizedTitle = normalizeComplaintTitle(complaint.title);

      if (!normalizedTitle) {
        return;
      }

      const nextTemplate: ComplaintTemplate = {
        category,
        title: complaint.title.trim(),
        description: getComplaintTemplateDescription(
          category,
          complaint.title,
          complaint.description,
          unitCode,
        ),
      };
      const existingTemplate = rankedTemplates.get(normalizedTitle);

      if (!existingTemplate) {
        rankedTemplates.set(normalizedTitle, {
          template: nextTemplate,
          count: 1,
          latestCreatedAt: complaint.createdAt,
        });
        return;
      }

      existingTemplate.count += 1;

      if (complaint.createdAt.localeCompare(existingTemplate.latestCreatedAt) > 0) {
        existingTemplate.template = nextTemplate;
        existingTemplate.latestCreatedAt = complaint.createdAt;
      }
    });

  const defaultTemplates = defaultComplaintTemplates[category].map((template) => ({
    ...template,
    description: template.description.replace(/\{unitCode\}/g, unitCode),
  }));
  const mergedTemplates: ComplaintTemplate[] = [];
  const seenTitles = new Set<string>();

  const commonTemplates = [...rankedTemplates.values()]
    .sort(
      (left, right) =>
        right.count - left.count || right.latestCreatedAt.localeCompare(left.latestCreatedAt),
    )
    .map((entry) => entry.template);

  for (const template of [...commonTemplates, ...defaultTemplates]) {
    const normalizedTitle = normalizeComplaintTitle(template.title);

    if (!normalizedTitle || seenTitles.has(normalizedTitle)) {
      continue;
    }

    seenTitles.add(normalizedTitle);
    mergedTemplates.push(template);
  }

  return mergedTemplates.slice(0, 6);
}

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
          <MetricCard
            label="Unread notices"
            value={String(overview.unreadAnnouncements.length)}
            tone="blue"
            onPress={() => setActiveTab('notices')}
          />
          <MetricCard
            label="Open tickets"
            value={String(overview.myComplaints.filter((item) => item.status !== 'resolved').length)}
            onPress={() => setActiveTab('helpdesk')}
          />
        </View>
      </HeroCard>

      <NavigationStrip items={residentTabs} activeKey={activeTab} onChange={setActiveTab} />

      {activeTab === 'home' ? <ResidentHome societyId={society.id} userId={user.id} onOpenTab={setActiveTab} /> : null}
      {activeTab === 'community' ? <ResidentCommunity societyId={society.id} userId={user.id} /> : null}
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
          <ActionButton label="Community" onPress={() => onOpenTab('community')} variant="secondary" />
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

function ResidentCommunity({ societyId, userId }: { societyId: string; userId: string }) {
  const { state } = useApp();
  const [activeSection, setActiveSection] = useState<ResidentCommunitySection>('members');
  const members = getCommunityMembersForSociety(state.data, societyId);
  const vehicles = getVehicleDirectoryForSociety(state.data, societyId);
  const contacts = getImportantContactsForSociety(state.data, societyId);
  const guards = getGuardRosterForSociety(state.data, societyId);
  const staffDirectory = getStaffVerificationDirectory(state.data, societyId);
  const myMembership = getMembershipForSociety(state.data, userId, societyId);

  return (
    <>
      <SectionHeader
        title="Community hub"
        description="Browse resident contacts, registered vehicles, important society numbers, and staff coverage from one place."
      />
      <SurfaceCard>
        <View style={styles.metricGrid}>
          <MetricCard label="Members" value={String(members.length)} />
          <MetricCard label="Vehicles" value={String(vehicles.length)} tone="accent" />
          <MetricCard label="Important contacts" value={String(contacts.length)} tone="blue" />
          <MetricCard label="Staff and guards" value={String(staffDirectory.length + guards.length)} />
        </View>
        <View style={styles.inlineSection}>
          <Text style={styles.compactTitle}>Browse sections</Text>
          <View style={styles.choiceRow}>
            {residentCommunitySections.map((section) => (
              <ChoiceChip
                key={section.key}
                label={section.label}
                selected={activeSection === section.key}
                onPress={() => setActiveSection(section.key)}
              />
            ))}
          </View>
          <Caption>
            Your access is based on the current society membership for {myMembership?.unitIds.length ? 'linked units and shared society records.' : 'shared society records.'}
          </Caption>
        </View>
      </SurfaceCard>

      {activeSection === 'members' ? (
        members.length > 0 ? (
          members.map((member) => (
            <SurfaceCard key={member.membership.id}>
              <View style={styles.rowBetween}>
                <Text style={styles.cardTitle}>{member.user.name}</Text>
                <Pill
                  label={member.units.map((unit) => unit.code).join(', ') || 'Unit pending'}
                  tone="accent"
                />
              </View>
              <View style={styles.pillRow}>
                {member.membership.roles.map((role) => (
                  <Pill key={`${member.membership.id}-${role}`} label={humanizeRole(role)} tone="primary" />
                ))}
              </View>
              <Caption>{member.user.phone}</Caption>
              <Caption>{member.residenceProfile?.email ?? member.user.email}</Caption>
              {member.residenceProfile?.alternatePhone ? (
                <Caption>Alternate mobile: {member.residenceProfile.alternatePhone}</Caption>
              ) : null}
            </SurfaceCard>
          ))
        ) : (
          <SurfaceCard>
            <Caption>No resident directory entries are available yet.</Caption>
          </SurfaceCard>
        )
      ) : null}

      {activeSection === 'vehicles' ? (
        vehicles.length > 0 ? (
          vehicles.map(({ vehicle, user, unit }) => (
            <SurfaceCard key={vehicle.id}>
              <View style={styles.rowBetween}>
                <Text style={styles.cardTitle}>{vehicle.registrationNumber}</Text>
                <Pill label={humanizeVehicleType(vehicle.vehicleType)} tone="primary" />
              </View>
              <Caption>{user?.name ?? 'Resident not linked'}{unit ? ` · ${unit.code}` : ''}</Caption>
              <Caption>{vehicle.color ?? 'Color not recorded'}{vehicle.parkingSlot ? ` · ${vehicle.parkingSlot}` : ''}</Caption>
            </SurfaceCard>
          ))
        ) : (
          <SurfaceCard>
            <Caption>No vehicle details are registered for this society yet.</Caption>
          </SurfaceCard>
        )
      ) : null}

      {activeSection === 'contacts' ? (
        contacts.length > 0 ? (
          contacts.map((contact) => (
            <SurfaceCard key={contact.id}>
              <View style={styles.rowBetween}>
                <Text style={styles.cardTitle}>{contact.name}</Text>
                <Pill
                  label={humanizeImportantContactCategory(contact.category)}
                  tone={getImportantContactTone(contact.category)}
                />
              </View>
              <Caption>{contact.roleLabel}</Caption>
              <Caption>{contact.phone}</Caption>
              {contact.availability ? <Caption>{contact.availability}</Caption> : null}
              {contact.notes ? <Caption>{contact.notes}</Caption> : null}
            </SurfaceCard>
          ))
        ) : (
          <SurfaceCard>
            <Caption>No important contacts have been published yet.</Caption>
          </SurfaceCard>
        )
      ) : null}

      {activeSection === 'staff' ? (
        <>
          <SurfaceCard>
            <Text style={styles.cardTitle}>Security roster</Text>
            {guards.length > 0 ? guards.map(({ guard, latestShift }) => (
              <View key={guard.id} style={styles.inlineSection}>
                <View style={styles.rowBetween}>
                  <Text style={styles.inlineTitle}>{guard.name}</Text>
                  <Pill label={guard.shiftLabel} tone="warning" />
                </View>
                <Caption>{guard.phone}</Caption>
                <Caption>{guard.vendorName ? `${guard.vendorName} · ` : ''}{latestShift?.gate ?? 'Gate not assigned'}</Caption>
                {latestShift ? <Caption>Latest shift: {formatLongDate(latestShift.start)}</Caption> : null}
              </View>
            )) : <Caption>No security roster has been shared yet.</Caption>}
          </SurfaceCard>
          <SurfaceCard>
            <Text style={styles.cardTitle}>Domestic staff and vendors</Text>
            {staffDirectory.length > 0 ? staffDirectory.map(({ staff, assignments, employerUnits }) => (
              <View key={staff.id} style={styles.inlineSection}>
                <View style={styles.rowBetween}>
                  <Text style={styles.inlineTitle}>{staff.name}</Text>
                  <Pill
                    label={humanizeVerificationState(staff.verificationState)}
                    tone={getVerificationTone(staff.verificationState)}
                  />
                </View>
                <Caption>{humanizeStaffCategory(staff.category)} · {staff.phone}</Caption>
                {employerUnits.length > 0 ? (
                  <Caption>Serving: {employerUnits.map((unit) => unit.code).join(', ')}</Caption>
                ) : null}
                {assignments.map((assignment) => (
                  <Caption key={`${staff.id}-${assignment.id}`}>
                    {assignment.serviceLabel} · {assignment.visitsPerWeek} visits/week
                  </Caption>
                ))}
              </View>
            )) : <Caption>No society staff records are available yet.</Caption>}
          </SurfaceCard>
        </>
      ) : null}
    </>
  );
}

function ResidentBilling({ societyId, userId }: { societyId: string; userId: string }) {
  const { state, actions } = useApp();
  const overview = getResidentOverview(state.data, userId, societyId);
  const paymentHistory = getPaymentsForUserSociety(state.data, userId, societyId);
  const reminders = getPaymentRemindersForUser(state.data, userId, societyId);
  const plan = state.data.maintenancePlans.find((item) => item.societyId === societyId);
  const society = getSelectedSociety(state.data, societyId);
  const membership = getMembershipForSociety(state.data, userId, societyId);
  const residentUnits = getUnitsForSociety(state.data, societyId).filter((unit) => membership?.unitIds.includes(unit.id));
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(overview.outstandingInvoices[0]?.id ?? null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [manualPaidAt, setManualPaidAt] = useState(nowDateTimeInputValue());
  const [manualReferenceNote, setManualReferenceNote] = useState('');
  const [upiPaidAt, setUpiPaidAt] = useState(nowDateTimeInputValue());
  const [upiReferenceNote, setUpiReferenceNote] = useState('');
  const [upiProofImageDataUrl, setUpiProofImageDataUrl] = useState('');
  const [upiHelperText, setUpiHelperText] = useState('');
  const [receiptActionMessage, setReceiptActionMessage] = useState('');
  const hasUpiSetup = Boolean(plan?.upiId || plan?.upiMobileNumber || plan?.upiQrCodeDataUrl);

  const pendingInvoiceIds = new Set(
    paymentHistory
      .filter(({ payment }) => payment.status === 'pending')
      .map(({ invoice }) => invoice.id),
  );
  const selectedInvoice = overview.outstandingInvoices.find((invoice) => invoice.id === selectedInvoiceId)
    ?? overview.outstandingInvoices.find((invoice) => !pendingInvoiceIds.has(invoice.id))
    ?? overview.outstandingInvoices[0]
    ?? null;
  const upiPayeeName = plan?.upiPayeeName?.trim() || society?.name || 'Society billing';
  const selectedInvoiceUnit = selectedInvoice
    ? state.data.units.find((unit) => unit.id === selectedInvoice.unitId)
    : undefined;
  const residentNumber = selectedInvoiceUnit?.code || residentUnits[0]?.code || '';
  const receiverNote = [society?.name || 'Society', 'maintenance', residentNumber || null]
    .filter(Boolean)
    .join(' - ');
  const invoiceNote = [society?.name || 'Society', 'maintenance', residentNumber || null, selectedInvoice?.periodLabel || null]
    .filter(Boolean)
    .join(' - ');

  async function handleSubmitPayment() {
    if (!selectedInvoice) {
      return;
    }

    const saved = await actions.submitResidentPayment(societyId, {
      invoiceId: selectedInvoice.id,
      amountInr: String(selectedInvoice.amountInr),
      method: paymentMethod,
      paidAt: manualPaidAt,
      referenceNote: manualReferenceNote,
    });

    if (saved) {
      setManualReferenceNote('');
      setManualPaidAt(nowDateTimeInputValue());
      const nextInvoice = overview.outstandingInvoices.find((invoice) => invoice.id !== selectedInvoice.id && !pendingInvoiceIds.has(invoice.id));
      setSelectedInvoiceId(nextInvoice?.id ?? null);
    }
  }

  async function handleConfirmUpiPayment() {
    if (!selectedInvoice) {
      return;
    }

    const saved = await actions.submitResidentPayment(societyId, {
      invoiceId: selectedInvoice.id,
      amountInr: String(selectedInvoice.amountInr),
      method: 'upi',
      paidAt: upiPaidAt,
      referenceNote: upiReferenceNote,
      proofImageDataUrl: upiProofImageDataUrl,
    });

    if (saved) {
      setUpiReferenceNote('');
      setUpiPaidAt(nowDateTimeInputValue());
      setUpiProofImageDataUrl('');
      setUpiHelperText('');
      const nextInvoice = overview.outstandingInvoices.find((invoice) => invoice.id !== selectedInvoice.id && !pendingInvoiceIds.has(invoice.id));
      setSelectedInvoiceId(nextInvoice?.id ?? null);
    }
  }

  async function handleUpiProofUpload() {
    try {
      const selectedImage = await pickWebImageAsDataUrl();

      if (!selectedImage) {
        return;
      }

      setUpiProofImageDataUrl(selectedImage);
      setUpiHelperText('Payment screenshot selected. Share it with the admin desk after the transfer.');
    } catch (error) {
      setUpiHelperText(error instanceof Error ? error.message : 'Could not load the payment screenshot.');
    }
  }

  async function handleOpenReceiptPdf(paymentId: string) {
    setReceiptActionMessage('');
    const receipt = buildMaintenanceReceiptDetails(state.data, paymentId);

    if (!receipt) {
      setReceiptActionMessage('Receipt details are not available for this payment yet.');
      return;
    }

    const opened = await openMaintenanceReceiptPdf(receipt);

    setReceiptActionMessage(
      opened
        ? `PDF-ready receipt opened for ${receipt.periodLabel}.`
        : 'Could not open the PDF receipt on this device.',
    );
  }

  return (
    <>
      <SurfaceCard>
        <SectionHeader
          title="Maintenance billing"
          description="Pay using the society QR, UPI ID, or payment mobile number, or use the manual review flow for cash and offline transfers."
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
              <Caption>
                Invoices: {invoices.length > 0
                  ? invoices.map((invoice) => invoice.periodLabel).join(', ')
                  : 'Current maintenance notice'}
              </Caption>
              <Caption>Sent on {formatLongDate(reminder.sentAt)}</Caption>
            </View>
          ))}
        </SurfaceCard>
      ) : null}

      <SurfaceCard>
        <SectionHeader
          title="Society payment details"
          description="Use these society payment details in GPay, PhonePe, Paytm, or any other UPI app. After you pay, share the UTR and screenshot below so the admin desk can verify it."
        />
        {hasUpiSetup ? (
          <View style={styles.inlineSection}>
            <Text style={styles.compactTitle}>Pay to the society account</Text>
            <Caption>Receiver name: {upiPayeeName}</Caption>
            {plan?.upiId ? <Caption>UPI ID: {plan.upiId}</Caption> : null}
            {plan?.upiMobileNumber ? <Caption>Payment mobile number: {plan.upiMobileNumber}</Caption> : null}
            {residentNumber ? <Caption>Your resident / unit number: {residentNumber}</Caption> : null}
            <Caption>Suggested payment note: {receiverNote}</Caption>
            {plan?.upiQrCodeDataUrl ? (
              <View style={styles.qrSection}>
                <Text style={styles.compactTitle}>Scan QR to pay</Text>
                <Caption>Open your UPI app and scan this QR code to pay the maintenance bill.</Caption>
                <View style={styles.qrCard}>
                  <Image source={{ uri: plan?.upiQrCodeDataUrl }} style={styles.qrImage} />
                </View>
              </View>
            ) : (
              <Caption>The admin has not uploaded a QR image yet, so please use the UPI ID or mobile number above in your UPI app.</Caption>
            )}

            {overview.outstandingInvoices.length > 0 ? (
              <>
                <View style={styles.inlineSection}>
                  <Text style={styles.compactTitle}>Select unpaid invoice</Text>
                  <Caption>Choose the pending maintenance bill you are paying so the proof reaches the correct invoice.</Caption>
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
                </View>
                {selectedInvoice ? (
                  <View style={styles.inlineSection}>
                    <Text style={styles.compactTitle}>Payment reference for this invoice</Text>
                    <Caption>Amount to pay: {formatCurrency(selectedInvoice.amountInr)}</Caption>
                    <Caption>Billing period: {selectedInvoice.periodLabel}</Caption>
                    <Caption>Use this note while paying if your UPI app supports remarks: {invoiceNote}</Caption>
                    {pendingInvoiceIds.has(selectedInvoice.id) ? (
                      <Caption>A payment update is already pending review for this invoice.</Caption>
                    ) : null}
                  </View>
                ) : null}
                {selectedInvoice ? (
                  <>
                    <View style={styles.inlineSection}>
                      <Text style={styles.compactTitle}>Share your payment confirmation</Text>
                      <Caption>After you complete the payment in your UPI app, add the UTR or note and upload the payment screenshot here.</Caption>
                    </View>
                    <View style={styles.formGrid}>
                      <View style={styles.formField}>
                        <InputField label="Paid on" value={upiPaidAt} onChangeText={setUpiPaidAt} placeholder="2026-03-20T10:30" />
                      </View>
                      <View style={styles.formField}>
                        <InputField
                          label="UPI reference / note"
                          value={upiReferenceNote}
                          onChangeText={setUpiReferenceNote}
                          placeholder="UPI ref no. or note"
                        />
                      </View>
                    </View>
                    <View style={styles.inlineSection}>
                      <Text style={styles.compactTitle}>Payment proof</Text>
                      <Caption>Upload the payment screenshot or UPI success page so the admin can verify it quickly.</Caption>
                      <View style={styles.heroActions}>
                        <ActionButton
                          label={upiProofImageDataUrl ? 'Replace payment screenshot' : 'Upload payment screenshot'}
                          onPress={handleUpiProofUpload}
                          variant="secondary"
                          disabled={state.isSyncing}
                        />
                        {upiProofImageDataUrl ? (
                          <ActionButton
                            label="Remove screenshot"
                            onPress={() => {
                              setUpiProofImageDataUrl('');
                              setUpiHelperText('Payment screenshot removed.');
                            }}
                            variant="secondary"
                            disabled={state.isSyncing}
                          />
                        ) : null}
                      </View>
                      {Platform.OS !== 'web' ? (
                        <Caption>Screenshot upload is available from the web workspace right now.</Caption>
                      ) : null}
                      {upiProofImageDataUrl ? (
                        <View style={styles.proofCard}>
                          <Image source={{ uri: upiProofImageDataUrl }} style={styles.proofImage} />
                        </View>
                      ) : null}
                    </View>
                    <ActionButton
                      label={state.isSyncing ? 'Sharing...' : 'Send payment proof for verification'}
                      onPress={handleConfirmUpiPayment}
                      disabled={state.isSyncing || pendingInvoiceIds.has(selectedInvoice.id)}
                    />
                    {upiHelperText ? <Caption>{upiHelperText}</Caption> : null}
                  </>
                ) : null}
              </>
            ) : (
              <Caption>No unpaid maintenance invoices are linked to your units right now, but the society payment details remain visible here.</Caption>
            )}
          </View>
        ) : (
          <Caption>The admin has not configured a society UPI receiver yet. Use the manual payment review flow below for now.</Caption>
        )}
      </SurfaceCard>

      <SurfaceCard>
        <SectionHeader
          title="Flag cash or offline payment for review"
          description="Use this when you paid in cash, by cheque, netbanking, or any transfer that still needs admin confirmation."
        />
        {overview.outstandingInvoices.length > 0 ? (
          <>
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
            {selectedInvoice ? (
              <View style={styles.inlineSection}>
                <Caption>
                  This sends {formatCurrency(selectedInvoice.amountInr)} for {selectedInvoice.periodLabel} to the chairman for review.
                </Caption>
                <View style={styles.formGrid}>
                  <View style={styles.formField}>
                    <InputField label="Paid on" value={manualPaidAt} onChangeText={setManualPaidAt} placeholder="2026-03-20T10:30" />
                  </View>
                  <View style={styles.formField}>
                    <InputField
                      label="Reference / note"
                      value={manualReferenceNote}
                      onChangeText={setManualReferenceNote}
                      placeholder="Cash note, UPI ref, cheque no, or bank note"
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
      {receiptActionMessage ? <Caption>{receiptActionMessage}</Caption> : null}
      {paymentHistory.length > 0 ? paymentHistory.map(({ payment, invoice, unit, receipt, reviewedBy }) => {
        const receiptDetails = receipt ? buildMaintenanceReceiptDetails(state.data, payment.id) : null;

        return (
          <SurfaceCard key={payment.id}>
            <View style={styles.rowBetween}>
              <Text style={styles.cardTitle}>{invoice.periodLabel}</Text>
              <Pill label={humanizePaymentStatus(payment.status)} tone={getPaymentStatusTone(payment.status)} />
            </View>
            <Caption>{unit?.code ?? 'Unit'} - {formatCurrency(payment.amountInr)} via {humanizePaymentMethod(payment.method)}</Caption>
            <Caption>Paid on {formatLongDate(payment.paidAt)}</Caption>
            {payment.referenceNote ? <Caption>Reference: {payment.referenceNote}</Caption> : null}
            {payment.proofImageDataUrl ? (
              <View style={styles.proofCard}>
                <Image source={{ uri: payment.proofImageDataUrl }} style={styles.proofImage} />
              </View>
            ) : null}
            {receiptDetails ? (
              <MaintenanceReceiptCard
                receipt={receiptDetails}
                onOpenPdf={() => handleOpenReceiptPdf(payment.id)}
              />
            ) : null}
            {!receiptDetails && receipt ? <Caption>Receipt: {receipt.number}</Caption> : null}
            {!receipt && payment.status === 'captured' ? (
              <Caption>The receipt will appear here once it is synced from the billing ledger.</Caption>
            ) : null}
            {reviewedBy && payment.reviewedAt ? <Caption>Reviewed by {reviewedBy.name} on {formatLongDate(payment.reviewedAt)}</Caption> : null}
          </SurfaceCard>
        );
      }) : (
        <SurfaceCard><Caption>No payment history yet.</Caption></SurfaceCard>
      )}
    </>
  );
}

function ResidentNotices({ societyId, userId }: { societyId: string; userId: string }) {
  const { state, actions } = useApp();
  const membership = getMembershipForSociety(state.data, userId, societyId);
  const announcements = getAnnouncementsForSociety(state.data, societyId, membership?.roles);
  const rules = getRulesForSociety(state.data, societyId);

  return (
    <>
      <SectionHeader
        title="Announcements"
        description="Important society communication should support audience targeting, read receipts, and priority labels."
      />
      {announcements.map((announcement) => {
        const isUnread = !announcement.readByUserIds.includes(userId);

        return (
          <Pressable
            key={announcement.id}
            onPress={() => {
              if (isUnread && !state.isSyncing) {
                void actions.markAnnouncementRead(societyId, announcement.id);
              }
            }}
            style={({ pressed }) => [
              styles.interactiveCard,
              isUnread ? styles.noticeUnreadCard : null,
              pressed ? styles.interactiveCardPressed : null,
            ]}
          >
            <View style={styles.rowBetween}>
              <Text style={styles.cardTitle}>{announcement.title}</Text>
              <Pill label={announcement.priority} tone={announcement.priority === 'high' ? 'warning' : 'primary'} />
            </View>
            <Caption>{announcement.body}</Caption>
            {announcement.photoDataUrl ? (
              <View style={styles.announcementMediaCard}>
                <Image source={{ uri: announcement.photoDataUrl }} style={styles.announcementMediaImage} />
              </View>
            ) : null}
            <Caption>{isUnread ? 'Unread - tap to mark read' : 'Read'} · {formatShortDate(announcement.createdAt)}</Caption>
          </Pressable>
        );
      })}

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
  const selectedUnit = userUnits.find((unit) => unit.id === selectedUnitId) ?? userUnits[0] ?? null;
  const complaintTemplates = getComplaintTemplatesForSociety(
    state.data,
    societyId,
    category,
    selectedUnit?.code ?? 'your unit',
  );

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
          <Caption>Choose a common complaint template to prefill the ticket, then edit anything you want.</Caption>
          <View style={styles.choiceRow}>
            {complaintTemplates.map((template) => (
              <ChoiceChip
                key={`${template.category}-${template.title}`}
                label={template.title}
                selected={normalizeComplaintTitle(title) === normalizeComplaintTitle(template.title)}
                onPress={() => {
                  setTitle(template.title);
                  setDescription(template.description);
                }}
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
          <View style={styles.inlineSection}>
            <Text style={styles.inlineTitle}>Progress updates</Text>
            {getComplaintUpdatesForComplaint(state.data, complaint.id).length > 0 ? (
              getComplaintUpdatesForComplaint(state.data, complaint.id).map(({ update, user: updateUser }, index) => (
                <View
                  key={update.id}
                  style={[styles.helpdeskUpdateCard, index === 0 ? styles.helpdeskLatestUpdateCard : null]}
                >
                  <View style={styles.rowBetween}>
                    <Caption>{updateUser?.name ?? 'Society team'} · {formatLongDate(update.createdAt)}</Caption>
                    <View style={styles.helpdeskUpdateHeader}>
                      {index === 0 ? <Text style={styles.helpdeskLatestUpdateLabel}>Latest update</Text> : null}
                      <Pill
                        label={humanizeComplaintStatus(update.status)}
                        tone={getComplaintTone(update.status)}
                      />
                    </View>
                  </View>
                  {update.assignedTo ? <Caption>Assigned to: {update.assignedTo}</Caption> : null}
                  {update.message ? (
                    index === 0 ? (
                      <View style={styles.helpdeskLatestMessageCard}>
                        <Text style={styles.helpdeskLatestMessageText}>{update.message}</Text>
                      </View>
                    ) : (
                      <Caption>{update.message}</Caption>
                    )
                  ) : null}
                  {update.photoDataUrl ? (
                    <View style={styles.proofCard}>
                      <Image source={{ uri: update.photoDataUrl }} style={styles.helpdeskUpdateImage} />
                    </View>
                  ) : null}
                </View>
              ))
            ) : (
              <Caption>No progress updates shared yet.</Caption>
            )}
          </View>
        </SurfaceCard>
      )) : (
        <SurfaceCard><Caption>No helpdesk tickets raised yet.</Caption></SurfaceCard>
      )}
    </>
  );
}

function ResidentProfile({ societyId, userId }: { societyId: string; userId: string }) {
  const { state, actions } = useApp();
  const currentUser = getCurrentUser(state.data, userId);
  const membership = getMembershipForSociety(state.data, userId, societyId);
  const residenceProfile = getResidenceProfileForUserSociety(state.data, userId, societyId);
  const units = getUnitsForSociety(state.data, societyId).filter((unit) => membership?.unitIds.includes(unit.id));
  const userVehicles = useMemo(
    () =>
      state.data.vehicleRegistrations.filter(
        (vehicle) => vehicle.societyId === societyId && vehicle.userId === userId,
      ),
    [societyId, state.data.vehicleRegistrations, userId],
  );
  const allowedUnitIds = new Set(units.map((unit) => unit.id));
  const staff = getStaffVerificationDirectory(state.data, societyId).filter(
    ({ staff, employerUnits }) =>
      staff.requestedByUserId === userId || employerUnits.some((unit) => allowedUnitIds.has(unit.id)),
  );
  const canSubmitStaffRequest = membership?.roles.some((role) => role === 'owner' || role === 'tenant') ?? false;
  const residentType =
    residenceProfile?.residentType ??
    (membership?.roles.includes('committee')
      ? 'committee'
      : membership?.roles.includes('tenant')
        ? 'tenant'
        : 'owner');
  const [staffName, setStaffName] = useState('');
  const [staffPhone, setStaffPhone] = useState('');
  const [staffCategory, setStaffCategory] = useState<'domesticHelp' | 'cook' | 'driver' | 'vendor'>('domesticHelp');
  const [serviceLabel, setServiceLabel] = useState('');
  const [visitsPerWeek, setVisitsPerWeek] = useState('6');
  const [selectedUnitCodes, setSelectedUnitCodes] = useState<string[]>(() =>
    units.length === 1 ? [units[0].code] : [],
  );
  const [profileFullName, setProfileFullName] = useState(residenceProfile?.fullName ?? currentUser?.name ?? '');
  const [profileEmail, setProfileEmail] = useState(residenceProfile?.email ?? currentUser?.email ?? '');
  const [profileAlternatePhone, setProfileAlternatePhone] = useState(residenceProfile?.alternatePhone ?? '');
  const [profileEmergencyContactName, setProfileEmergencyContactName] = useState(
    residenceProfile?.emergencyContactName ?? '',
  );
  const [profileEmergencyContactPhone, setProfileEmergencyContactPhone] = useState(
    residenceProfile?.emergencyContactPhone ?? '',
  );
  const [profileSecondaryEmergencyContactName, setProfileSecondaryEmergencyContactName] = useState(
    residenceProfile?.secondaryEmergencyContactName ?? '',
  );
  const [profileSecondaryEmergencyContactPhone, setProfileSecondaryEmergencyContactPhone] = useState(
    residenceProfile?.secondaryEmergencyContactPhone ?? '',
  );
  const [profileMoveInDate, setProfileMoveInDate] = useState(
    residenceProfile?.moveInDate ?? todayString(),
  );
  const [profileConsent, setProfileConsent] = useState(Boolean(residenceProfile?.dataProtectionConsentAt));
  const [rentAgreementFileName, setRentAgreementFileName] = useState(
    residenceProfile?.rentAgreementFileName ?? '',
  );
  const [rentAgreementDataUrl, setRentAgreementDataUrl] = useState(
    residenceProfile?.rentAgreementDataUrl ?? '',
  );
  const [profileVehicles, setProfileVehicles] = useState<EditableVehicleDraft[]>(() =>
    userVehicles.length > 0
      ? userVehicles.map((vehicle) => ({
          id: vehicle.id,
          unitId: vehicle.unitId,
          registrationNumber: vehicle.registrationNumber,
          vehicleType: vehicle.vehicleType,
          color: vehicle.color ?? '',
          parkingSlot: vehicle.parkingSlot ?? '',
          photoDataUrl: vehicle.photoDataUrl ?? '',
          statusMessage: '',
        }))
      : [],
  );
  const [profileActionMessage, setProfileActionMessage] = useState('');
  const hasIncompleteProfileVehicle = profileVehicles.some(
    (vehicle) =>
      (vehicle.registrationNumber.trim() ||
        vehicle.photoDataUrl ||
        vehicle.color.trim() ||
        vehicle.parkingSlot.trim()) &&
      (!vehicle.registrationNumber.trim() || !vehicle.unitId),
  );

  useEffect(() => {
    setProfileFullName(residenceProfile?.fullName ?? currentUser?.name ?? '');
    setProfileEmail(residenceProfile?.email ?? currentUser?.email ?? '');
    setProfileAlternatePhone(residenceProfile?.alternatePhone ?? '');
    setProfileEmergencyContactName(residenceProfile?.emergencyContactName ?? '');
    setProfileEmergencyContactPhone(residenceProfile?.emergencyContactPhone ?? '');
    setProfileSecondaryEmergencyContactName(residenceProfile?.secondaryEmergencyContactName ?? '');
    setProfileSecondaryEmergencyContactPhone(residenceProfile?.secondaryEmergencyContactPhone ?? '');
    setProfileMoveInDate(residenceProfile?.moveInDate ?? todayString());
    setProfileConsent(Boolean(residenceProfile?.dataProtectionConsentAt));
    setRentAgreementFileName(residenceProfile?.rentAgreementFileName ?? '');
    setRentAgreementDataUrl(residenceProfile?.rentAgreementDataUrl ?? '');
    setProfileVehicles(
      userVehicles.length > 0
        ? userVehicles.map((vehicle) => ({
            id: vehicle.id,
            unitId: vehicle.unitId,
            registrationNumber: vehicle.registrationNumber,
            vehicleType: vehicle.vehicleType,
            color: vehicle.color ?? '',
            parkingSlot: vehicle.parkingSlot ?? '',
            photoDataUrl: vehicle.photoDataUrl ?? '',
            statusMessage: '',
          }))
        : [],
    );
  }, [
    currentUser?.email,
    currentUser?.name,
    residenceProfile?.alternatePhone,
    residenceProfile?.dataProtectionConsentAt,
    residenceProfile?.email,
    residenceProfile?.emergencyContactName,
    residenceProfile?.emergencyContactPhone,
    residenceProfile?.fullName,
    residenceProfile?.moveInDate,
    residenceProfile?.rentAgreementDataUrl,
    residenceProfile?.rentAgreementFileName,
    residenceProfile?.secondaryEmergencyContactName,
    residenceProfile?.secondaryEmergencyContactPhone,
    userVehicles,
  ]);

  function toggleUnitCode(unitCode: string) {
    setSelectedUnitCodes((currentSelection) =>
      currentSelection.includes(unitCode)
        ? currentSelection.filter((code) => code !== unitCode)
        : [...currentSelection, unitCode],
    );
  }

  function updateProfileVehicle(vehicleId: string, updates: Partial<EditableVehicleDraft>) {
    setProfileVehicles((currentVehicles) =>
      currentVehicles.map((vehicle) =>
        vehicle.id === vehicleId
          ? {
              ...vehicle,
              ...updates,
            }
          : vehicle,
      ),
    );
  }

  function addProfileVehicle() {
    setProfileVehicles((currentVehicles) => [
      ...currentVehicles,
      createEditableVehicleDraft(units[0]?.id ?? ''),
    ]);
  }

  function removeProfileVehicle(vehicleId: string) {
    setProfileVehicles((currentVehicles) =>
      currentVehicles.filter((vehicle) => vehicle.id !== vehicleId),
    );
  }

  async function attachProfileVehiclePhoto(vehicleId: string, capture?: 'user' | 'environment') {
    try {
      const file = await pickWebFileAsDataUrl({
        accept: 'image/png,image/jpeg,image/webp',
        capture,
        maxSizeInBytes: 4 * 1024 * 1024,
        unsupportedMessage: 'Vehicle photo capture is available from the web workspace right now.',
        tooLargeMessage: 'Choose a vehicle photo smaller than 4 MB.',
        readErrorMessage: 'Could not read the selected vehicle photo.',
      });

      if (!file) {
        return;
      }

      const currentVehicle = profileVehicles.find((vehicle) => vehicle.id === vehicleId);
      const detectedRegistrationNumber = await tryDetectVehicleRegistrationFromDataUrl(file.dataUrl);

      updateProfileVehicle(vehicleId, {
        photoDataUrl: file.dataUrl,
        registrationNumber:
          detectedRegistrationNumber ?? currentVehicle?.registrationNumber ?? '',
        statusMessage: detectedRegistrationNumber
          ? `Vehicle number ${detectedRegistrationNumber} detected from the photo.`
          : 'Photo attached. Enter the vehicle number manually if it was not detected.',
      });
    } catch (error) {
      updateProfileVehicle(vehicleId, {
        statusMessage:
          error instanceof Error ? error.message : 'Could not attach the vehicle photo.',
      });
    }
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

  async function handleUploadRentAgreement() {
    try {
      const file = await pickWebFileAsDataUrl({
        accept: 'application/pdf,image/png,image/jpeg,image/webp',
        maxSizeInBytes: 4 * 1024 * 1024,
        unsupportedMessage: 'Rent agreement upload is available from the web workspace right now.',
        tooLargeMessage: 'Choose a rent agreement file smaller than 4 MB.',
        readErrorMessage: 'Could not read the selected rent agreement file.',
      });

      if (!file) {
        return;
      }

      setRentAgreementFileName(file.fileName);
      setRentAgreementDataUrl(file.dataUrl);
      setProfileActionMessage(`${file.fileName} is ready to save.`);
    } catch (error) {
      setProfileActionMessage(error instanceof Error ? error.message : 'Could not upload the rent agreement.');
    }
  }

  async function handleSaveResidenceProfile() {
    const saved = await actions.updateResidenceProfile(societyId, {
      residentType,
      fullName: profileFullName,
      email: profileEmail,
      alternatePhone: profileAlternatePhone,
      emergencyContactName: profileEmergencyContactName,
      emergencyContactPhone: profileEmergencyContactPhone,
      secondaryEmergencyContactName: profileSecondaryEmergencyContactName,
      secondaryEmergencyContactPhone: profileSecondaryEmergencyContactPhone,
      vehicles: profileVehicles
        .filter(
          (vehicle) =>
            vehicle.registrationNumber.trim() ||
            vehicle.photoDataUrl ||
            vehicle.color.trim() ||
            vehicle.parkingSlot.trim(),
        )
        .map((vehicle) => ({
          unitId: vehicle.unitId,
          registrationNumber: vehicle.registrationNumber,
          vehicleType: vehicle.vehicleType,
          color: vehicle.color,
          parkingSlot: vehicle.parkingSlot,
          photoDataUrl: vehicle.photoDataUrl || undefined,
        })),
      moveInDate: profileMoveInDate,
      dataProtectionConsent: profileConsent,
      rentAgreementFileName: residentType === 'tenant' ? rentAgreementFileName : undefined,
      rentAgreementDataUrl: residentType === 'tenant' ? rentAgreementDataUrl : undefined,
    });

    if (saved) {
      setProfileActionMessage('Residence profile saved.');
    }
  }

  return (
    <>
      <SectionHeader title="Membership and household" />
      <SurfaceCard>
        <Text style={styles.cardTitle}>Roles in this society</Text>
        <View style={styles.pillRow}>
          {membership?.roles.map((role) => <Pill key={role} label={humanizeRole(role)} tone="primary" />)}
          <Pill
            label={residentType === 'committee' ? 'Committee profile' : residentType === 'tenant' ? 'Tenant profile' : 'Owner profile'}
            tone={residentType === 'tenant' ? 'accent' : 'primary'}
          />
        </View>
        <Caption>Unit access: {units.map((unit) => unit.code).join(', ') || 'Not assigned yet'}</Caption>
      </SurfaceCard>

      <SurfaceCard>
        <Text style={styles.cardTitle}>Residence profile and verification</Text>
        <Caption>
          Keep only the minimum society-verification details here. This section carries your resident flag and tenant document status into the workspace.
        </Caption>
        <View style={styles.inlineSection}>
          <View style={styles.pillRow}>
            <Pill label={`Verified mobile ${currentUser?.phone ?? ''}`.trim()} tone="primary" />
            {residentType === 'tenant' ? (
              <Pill
                label={rentAgreementFileName ? 'Rent agreement uploaded' : 'Rent agreement pending'}
                tone={rentAgreementFileName ? 'success' : 'warning'}
              />
            ) : null}
          </View>
          <View style={styles.formGrid}>
            <View style={styles.formField}>
              <InputField
                label="Resident full name"
                value={profileFullName}
                onChangeText={setProfileFullName}
                placeholder="Enter full name"
                autoCapitalize="words"
              />
            </View>
            <View style={styles.formField}>
              <InputField
                label="Move-in date"
                value={profileMoveInDate}
                onChangeText={setProfileMoveInDate}
                placeholder="YYYY-MM-DD"
                autoCapitalize="none"
                nativeType="date"
              />
            </View>
            <View style={styles.formField}>
              <InputField
                label="Email for notices (optional)"
                value={profileEmail}
                onChangeText={setProfileEmail}
                placeholder="name@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                nativeType="email"
              />
            </View>
            <View style={styles.formField}>
              <InputField
                label="Alternate mobile (optional)"
                value={profileAlternatePhone}
                onChangeText={setProfileAlternatePhone}
                placeholder="+91 98765 43210"
                keyboardType="phone-pad"
              />
            </View>
          </View>
          <Text style={styles.compactTitle}>Emergency contacts</Text>
          <View style={styles.formGrid}>
            <View style={styles.formField}>
              <InputField
                label="Primary emergency contact name"
                value={profileEmergencyContactName}
                onChangeText={setProfileEmergencyContactName}
                placeholder="Family contact"
                autoCapitalize="words"
              />
            </View>
            <View style={styles.formField}>
              <InputField
                label="Primary emergency contact mobile"
                value={profileEmergencyContactPhone}
                onChangeText={setProfileEmergencyContactPhone}
                placeholder="+91 98980 55555"
                keyboardType="phone-pad"
              />
            </View>
            <View style={styles.formField}>
              <InputField
                label="Secondary emergency contact name (optional)"
                value={profileSecondaryEmergencyContactName}
                onChangeText={setProfileSecondaryEmergencyContactName}
                placeholder="Neighbour or relative"
                autoCapitalize="words"
              />
            </View>
            <View style={styles.formField}>
              <InputField
                label="Secondary emergency contact mobile (optional)"
                value={profileSecondaryEmergencyContactPhone}
                onChangeText={setProfileSecondaryEmergencyContactPhone}
                placeholder="+91 98980 66666"
                keyboardType="phone-pad"
              />
            </View>
          </View>
          <View style={styles.inlineSection}>
            <Text style={styles.compactTitle}>Vehicle details</Text>
            <Caption>
              Keep your registered vehicles current for society security, gate visibility, and the resident directory.
            </Caption>
            <View style={styles.heroActions}>
              <ActionButton label="Add vehicle" onPress={addProfileVehicle} variant="secondary" />
            </View>
            {profileVehicles.length > 0 ? profileVehicles.map((vehicle, index) => (
              <View key={vehicle.id} style={styles.profileVehicleCard}>
                <View style={styles.rowBetween}>
                  <Text style={styles.inlineTitle}>Vehicle {index + 1}</Text>
                  <ActionButton
                    label="Remove"
                    variant="danger"
                    onPress={() => removeProfileVehicle(vehicle.id)}
                  />
                </View>
                <View style={styles.choiceRow}>
                  {([
                    { key: 'car' as const, label: 'Car' },
                    { key: 'bike' as const, label: 'Bike' },
                    { key: 'scooter' as const, label: 'Scooter' },
                  ]).map((option) => (
                    <ChoiceChip
                      key={`${vehicle.id}-${option.key}`}
                      label={option.label}
                      selected={vehicle.vehicleType === option.key}
                      onPress={() => updateProfileVehicle(vehicle.id, { vehicleType: option.key })}
                    />
                  ))}
                </View>
                <View style={styles.choiceRow}>
                  {units.map((unit) => (
                    <ChoiceChip
                      key={`${vehicle.id}-${unit.id}`}
                      label={unit.code}
                      selected={vehicle.unitId === unit.id}
                      onPress={() => updateProfileVehicle(vehicle.id, { unitId: unit.id })}
                    />
                  ))}
                </View>
                <View style={styles.formGrid}>
                  <View style={styles.formField}>
                    <InputField
                      label="Vehicle number"
                      value={vehicle.registrationNumber}
                      onChangeText={(value) =>
                        updateProfileVehicle(vehicle.id, {
                          registrationNumber: value.toUpperCase(),
                          statusMessage: '',
                        })}
                      placeholder="GJ01AB1234"
                      autoCapitalize="characters"
                    />
                  </View>
                  <View style={styles.formField}>
                    <InputField
                      label="Color (optional)"
                      value={vehicle.color}
                      onChangeText={(value) => updateProfileVehicle(vehicle.id, { color: value })}
                      placeholder="Pearl white"
                    />
                  </View>
                  <View style={styles.formField}>
                    <InputField
                      label="Parking slot (optional)"
                      value={vehicle.parkingSlot}
                      onChangeText={(value) => updateProfileVehicle(vehicle.id, { parkingSlot: value })}
                      placeholder="Basement P1-12"
                    />
                  </View>
                </View>
                <View style={styles.heroActions}>
                  <ActionButton
                    label="Take vehicle photo"
                    onPress={() => {
                      void attachProfileVehiclePhoto(vehicle.id, 'environment');
                    }}
                    variant="secondary"
                  />
                  <ActionButton
                    label={vehicle.photoDataUrl ? 'Replace photo' : 'Upload photo'}
                    onPress={() => {
                      void attachProfileVehiclePhoto(vehicle.id);
                    }}
                    variant="secondary"
                  />
                </View>
                {vehicle.statusMessage ? <Caption>{vehicle.statusMessage}</Caption> : null}
                {vehicle.photoDataUrl ? (
                  <View style={styles.proofCard}>
                    <Image source={{ uri: vehicle.photoDataUrl }} style={styles.profileVehicleImage} />
                  </View>
                ) : null}
              </View>
            )) : (
              <Caption>No vehicle saved in your profile yet.</Caption>
            )}
          </View>
          <Text style={styles.compactTitle}>Privacy confirmation</Text>
          <Caption>
            These details should only be used for society access, occupancy verification, emergency contact, and tenancy review.
          </Caption>
          <View style={styles.choiceRow}>
            <ChoiceChip
              label="Privacy notice accepted"
              selected={profileConsent}
              onPress={() => setProfileConsent((currentValue) => !currentValue)}
            />
          </View>
          {residentType === 'tenant' ? (
            <View style={styles.inlineSection}>
              <Text style={styles.compactTitle}>Tenant rent agreement</Text>
              <Caption>Upload or replace the current rent agreement from here whenever it changes.</Caption>
              <View style={styles.heroActions}>
                <ActionButton
                  label={rentAgreementFileName ? 'Replace agreement' : 'Upload agreement'}
                  onPress={handleUploadRentAgreement}
                  variant="secondary"
                />
                {rentAgreementDataUrl ? (
                  <ActionButton
                    label="Open uploaded file"
                    onPress={() => {
                      try {
                        openWebDataUrlInNewTab(rentAgreementDataUrl);
                      } catch (error) {
                        setProfileActionMessage(
                          error instanceof Error ? error.message : 'Could not open the uploaded rent agreement.',
                        );
                      }
                    }}
                    variant="secondary"
                  />
                ) : null}
              </View>
              {rentAgreementFileName ? <Caption>Current file: {rentAgreementFileName}</Caption> : null}
            </View>
          ) : null}
          {profileActionMessage ? <Caption>{profileActionMessage}</Caption> : null}
          <ActionButton
            label={state.isSyncing ? 'Saving...' : 'Save residence profile'}
            onPress={handleSaveResidenceProfile}
            disabled={
              state.isSyncing ||
              !profileFullName.trim() ||
              !profileMoveInDate ||
              hasIncompleteProfileVehicle ||
              !profileConsent
            }
          />
        </View>
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
  interactiveCard: {
    backgroundColor: palette.surface,
    borderRadius: 24,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: palette.border,
  },
  interactiveCardPressed: {
    opacity: 0.92,
  },
  noticeUnreadCard: {
    borderColor: palette.blue,
    backgroundColor: '#F6FBFF',
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
  inlineTitle: {
    fontSize: 15,
    fontWeight: '800',
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
  qrSection: {
    gap: spacing.sm,
  },
  qrCard: {
    alignSelf: 'flex-start',
    padding: spacing.sm,
    borderRadius: 18,
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.border,
  },
  qrImage: {
    width: 220,
    height: 220,
    borderRadius: 16,
    backgroundColor: '#F4F1EB',
  },
  proofCard: {
    alignSelf: 'flex-start',
    padding: spacing.xs,
    borderRadius: 18,
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.border,
  },
  proofImage: {
    width: 180,
    height: 220,
    borderRadius: 14,
    backgroundColor: '#F4F1EB',
  },
  helpdeskUpdateHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: spacing.xs,
  },
  helpdeskUpdateCard: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E6DED2',
    backgroundColor: '#FCFAF6',
  },
  helpdeskLatestUpdateCard: {
    borderColor: '#F2B66C',
    backgroundColor: '#FFF4DF',
  },
  helpdeskLatestUpdateLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#A65A00',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  helpdeskLatestMessageCard: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: 14,
    backgroundColor: '#FFD89A',
    borderWidth: 1,
    borderColor: '#F2B66C',
  },
  helpdeskLatestMessageText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#5F3400',
  },
  helpdeskUpdateImage: {
    width: 220,
    height: 160,
    borderRadius: 14,
    backgroundColor: '#F4F1EB',
  },
  profileVehicleCard: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surfaceMuted,
  },
  profileVehicleImage: {
    width: 200,
    height: 150,
    borderRadius: 14,
    backgroundColor: '#F4F1EB',
  },
  announcementMediaCard: {
    marginTop: spacing.sm,
    alignSelf: 'stretch',
    maxWidth: 420,
    padding: spacing.xs,
    borderRadius: 18,
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.border,
  },
  announcementMediaImage: {
    width: '100%',
    height: 220,
    borderRadius: 14,
    backgroundColor: '#F4F1EB',
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

function humanizeVehicleType(vehicleType: VehicleType) {
  switch (vehicleType) {
    case 'bike':
      return 'Bike';
    case 'scooter':
      return 'Scooter';
    case 'car':
    default:
      return 'Car';
  }
}

function humanizeImportantContactCategory(category: ImportantContactCategory) {
  switch (category) {
    case 'management':
      return 'Management';
    case 'security':
      return 'Security';
    case 'maintenance':
      return 'Maintenance';
    case 'emergency':
      return 'Emergency';
    case 'amenity':
    default:
      return 'Amenity';
  }
}

function getImportantContactTone(category: ImportantContactCategory) {
  switch (category) {
    case 'security':
      return 'warning' as const;
    case 'emergency':
      return 'accent' as const;
    case 'maintenance':
      return 'success' as const;
    case 'management':
    case 'amenity':
    default:
      return 'primary' as const;
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

async function pickWebImageAsDataUrl() {
  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    throw new Error('Payment screenshot upload is available from the web workspace right now.');
  }

  return new Promise<string | null>((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg,image/webp';

    input.onchange = () => {
      const file = input.files?.[0];

      if (!file) {
        resolve(null);
        return;
      }

      if (file.size > 2 * 1024 * 1024) {
        reject(new Error('Choose a payment screenshot smaller than 2 MB.'));
        return;
      }

      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => reject(new Error('Could not read the selected payment screenshot.'));
      reader.readAsDataURL(file);
    };

    input.click();
  });
}

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function nowDateTimeInputValue() {
  const value = new Date();
  value.setSeconds(0, 0);
  return value.toISOString().slice(0, 16);
}
