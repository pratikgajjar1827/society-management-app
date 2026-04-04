import { useEffect, useState } from 'react';
import { Image, Linking, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import {
  ActionButton,
  Caption,
  ChoiceChip,
  DateTimeField,
  DetailRow,
  InputField,
  MetricCard,
  NavigationStrip,
  PageFrame,
  Pill,
  SectionHeader,
  SurfaceCard,
} from '../../components/ui';
import { MaintenanceReceiptCard } from '../../components/MaintenanceReceiptCard';
import { AdminHomeExperience } from './AdminHomeExperience';
import { useApp } from '../../state/AppContext';
import { palette, shadow, spacing } from '../../theme/tokens';
import { openUploadedFileDataUrl, pickWebFileAsDataUrl } from '../../utils/fileUploads';
import {
  buildMaintenanceReceiptDetails,
  buildMaintenanceReceiptWhatsappMessage,
  downloadMaintenanceReceiptPdf,
  openMaintenanceReceiptPdf,
  shareMaintenanceReceiptPdfWithMessage,
} from '../../utils/receipts';
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
  getComplaintUpdatesForComplaint,
  getComplaintsForSociety,
  getCommunityMembersForSociety,
  getCurrentUser,
  getEntryLogsForSociety,
  getExpenseRecordsForSociety,
  getGuardRosterForSociety,
  getInvoiceCollectionDirectory,
  getInvoicesForSociety,
  getJoinRequestsForSociety,
  getLeadershipProfilesForSociety,
  getMeetingAgendaItems,
  getMeetingSignatures,
  getMeetingsForSociety,
  getMeetingVotesForItem,
  getMembershipForSociety,
  getPaymentRemindersForSociety,
  getPaymentsForSociety,
  getResidentsDirectory,
  getEnabledStructures,
  getUnitsForSociety,
  getSocietyUnitCollectionLabel,
  getRulesForSociety,
  getPendingSocietyDocumentDownloadRequests,
  getSelectedSociety,
  getSocietyDocuments,
  getStaffVerificationDirectory,
  getVisitorPassesForSociety,
  humanizeMeetingStatus,
  humanizeMeetingType,
  getMeetingStatusTone,
  societySupportsOfficeSpaces,
  humanizeJoinRequestRole,
  humanizeRole,
} from '../../utils/selectors';
import { AnnouncementAudience, AnnouncementPriority, PaymentMethod, SocietyDocumentCategory } from '../../types/domain';

type AdminTab = 'home' | AdminRecommendationTab | 'ledger' | 'meetings' | 'documents';
type OfficeMaintenanceState = 'paid' | 'pending' | 'overdue' | 'unbilled';

const adminTabs: Array<{ key: AdminTab; label: string }> = [
  { key: 'home', label: 'Admin Home' },
  { key: 'residents', label: 'Residents' },
  { key: 'billing', label: 'Billing' },
  { key: 'collections', label: 'Collections' },
  { key: 'ledger', label: 'Payment ledger' },
  { key: 'amenities', label: 'Amenities' },
  { key: 'helpdesk', label: 'Helpdesk' },
  { key: 'security', label: 'Security' },
  { key: 'announcements', label: 'Announcements' },
  { key: 'documents', label: 'Documents' },
  { key: 'meetings', label: 'Meetings' },
  { key: 'audit', label: 'Audit' },
];

function getAdminTabDescription(activeTab: AdminTab) {
  switch (activeTab) {
    case 'home':
      return 'Monitor approvals, collections, complaints, and daily society operations from one elegant control center.';
    case 'residents':
      return 'Review occupancy, residents, unit snapshots, and linked household data with better clarity.';
    case 'billing':
      return 'Manage cycles, invoices, reminders, UPI settings, and collection health from one billing desk.';
    case 'collections':
      return 'Track incoming payments, review proofs, receipts, and pending maintenance collections.';
    case 'ledger':
      return 'Audit payment movement, reconciliation records, and maintenance collection history.';
    case 'amenities':
      return 'Control amenity inventory, booking approvals, and day-to-day service planning.';
    case 'helpdesk':
      return 'Resolve resident complaints faster and keep every operational update visible.';
    case 'security':
      return 'Coordinate guards, staff verification, visitor access, and entry records from one security workspace.';
    case 'announcements':
      return 'Publish notices, resident communication, and policy updates in the new premium admin flow.';
    case 'documents':
      return 'Upload society records, review resident download approvals, and manage compliance files from a dedicated document workspace.';
    case 'meetings':
      return 'Create society meetings, manage agenda items, enable resident voting, and collect digital signatures.';
    case 'audit':
      return 'Review durable logs for money movement, complaints, announcements, and security actions.';
    default:
      return 'Run society operations with a cleaner and more modern admin experience.';
  }
}

const expenseTypes = [
  { key: 'maintenance' as const, label: 'Maintenance' },
  { key: 'adhoc' as const, label: 'Ad hoc' },
];

const paymentMethodOptions = [
  { key: 'upi' as const, label: 'UPI' },
  { key: 'netbanking' as const, label: 'Netbanking' },
  { key: 'cash' as const, label: 'Cash' },
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

const announcementAudienceOptions = [
  { key: 'all' as const, label: 'All members' },
  { key: 'residents' as const, label: 'Residents' },
  { key: 'owners' as const, label: 'Owners' },
  { key: 'tenants' as const, label: 'Tenants' },
  { key: 'committee' as const, label: 'Committee' },
];

const announcementPriorityOptions = [
  { key: 'normal' as const, label: 'Normal' },
  { key: 'high' as const, label: 'High' },
  { key: 'critical' as const, label: 'Critical' },
];

const societyDocumentCategoryOptions: Array<{ key: SocietyDocumentCategory; label: string }> = [
  { key: 'liftLicense', label: 'Lift license' },
  { key: 'commonLightBill', label: 'Common light bill' },
  { key: 'waterBill', label: 'Water bill' },
  { key: 'fireSafety', label: 'Fire safety' },
  { key: 'insurance', label: 'Insurance' },
  { key: 'auditReport', label: 'Audit report' },
  { key: 'other', label: 'Other document' },
];

const announcementTemplates = [
  {
    key: 'water-shutdown',
    title: 'Water supply shutdown',
    summary: 'Planned water tank cleaning or line maintenance notice.',
    audience: 'all' as const,
    priority: 'high' as const,
    buildBody: (societyName: string) =>
      `Water supply in ${societyName} will remain unavailable on [date and time] due to tank cleaning / plumbing maintenance. Please store enough water in advance. Supply will resume once the work is completed.`,
  },
  {
    key: 'lift-maintenance',
    title: 'Lift maintenance notice',
    summary: 'Temporary elevator shutdown for service or repair.',
    audience: 'residents' as const,
    priority: 'high' as const,
    buildBody: (societyName: string) =>
      `One of the lifts in ${societyName} will remain under maintenance on [date and time]. Please plan movement accordingly and support senior citizens during the service window.`,
  },
  {
    key: 'society-meeting',
    title: 'Society meeting notice',
    summary: 'AGM, SGM, or committee briefing for members.',
    audience: 'all' as const,
    priority: 'normal' as const,
    buildBody: (societyName: string) =>
      `A society meeting has been scheduled in ${societyName} on [date and time] at [venue / online link]. Agenda: [add agenda]. Members are requested to attend on time.`,
  },
  {
    key: 'pest-control',
    title: 'Pest control drive',
    summary: 'Common-area pest control or fumigation update.',
    audience: 'residents' as const,
    priority: 'normal' as const,
    buildBody: (societyName: string) =>
      `Pest control activity has been planned in ${societyName} on [date and time]. Please keep windows closed where required and cooperate with the housekeeping / vendor team during the treatment window.`,
  },
  {
    key: 'security-advisory',
    title: 'Security advisory',
    summary: 'Important gate, visitor, or suspicious activity alert.',
    audience: 'all' as const,
    priority: 'critical' as const,
    buildBody: (societyName: string) =>
      `Important security advisory for ${societyName}: [describe the issue]. Residents are requested to follow gate instructions, verify visitors properly, and report anything unusual immediately.`,
  },
  {
    key: 'parking-discipline',
    title: 'Parking discipline reminder',
    summary: 'Wrong parking, visitor parking, or towing reminder.',
    audience: 'residents' as const,
    priority: 'normal' as const,
    buildBody: (societyName: string) =>
      `This is a parking discipline reminder for ${societyName}. Please use only your allotted parking space, avoid blocking driveways, and ensure visitor parking is used only as instructed by security.`,
  },
  {
    key: 'fire-drill',
    title: 'Fire drill / mock drill',
    summary: 'Emergency preparedness drill for all members.',
    audience: 'all' as const,
    priority: 'high' as const,
    buildBody: (societyName: string) =>
      `A fire and emergency preparedness drill has been scheduled in ${societyName} on [date and time]. Residents are requested to stay calm, follow the security team's instructions, and participate if asked.`,
  },
  {
    key: 'housekeeping-delay',
    title: 'Housekeeping delay notice',
    summary: 'Cleaning or support services running late today.',
    audience: 'residents' as const,
    priority: 'normal' as const,
    buildBody: (societyName: string) =>
      `Housekeeping services in ${societyName} may run behind schedule on [date] due to staffing or vendor constraints. We appreciate your patience while the team completes pending areas.`,
  },
  {
    key: 'garbage-segregation',
    title: 'Garbage segregation reminder',
    summary: 'Wet and dry waste instructions for residents.',
    audience: 'residents' as const,
    priority: 'normal' as const,
    buildBody: (societyName: string) =>
      `Residents of ${societyName} are requested to follow waste segregation strictly. Please separate wet, dry, and hazardous waste as per society instructions so collection can happen smoothly.`,
  },
  {
    key: 'festival-guidelines',
    title: 'Festival guidelines and quiet hours',
    summary: 'Celebration timing, decor, and sound-level guidance.',
    audience: 'residents' as const,
    priority: 'normal' as const,
    buildBody: (societyName: string) =>
      `Festival celebrations in ${societyName} are welcome. Please follow quiet hours, use common spaces responsibly, and avoid blocking passages or emergency access while decorating or gathering.`,
  },
  {
    key: 'common-repair',
    title: 'Common area repair work',
    summary: 'Repair work update for lobby, gate, or pathway areas.',
    audience: 'all' as const,
    priority: 'high' as const,
    buildBody: (societyName: string) =>
      `Repair work is planned in a common area of ${societyName} on [date and time]. Temporary movement restrictions or noise may occur near [location]. We appreciate your cooperation until the work is completed.`,
  },
  {
    key: 'amenity-closure',
    title: 'Amenity closure notice',
    summary: 'Temporary closure of clubhouse, gym, pool, or hall.',
    audience: 'residents' as const,
    priority: 'normal' as const,
    buildBody: (societyName: string) =>
      `[Amenity name] in ${societyName} will remain closed on [date and time] for cleaning, maintenance, or a private event. Please plan bookings and visits accordingly.`,
  },
];

export function AdminShell() {
  const { state, actions } = useApp();
  const [activeTab, setActiveTab] = useState<AdminTab>('home');
  const { width } = useWindowDimensions();
  const isCompact = width < 768;

  if (!state.session.userId || !state.session.selectedSocietyId) {
    return null;
  }

  const user = getCurrentUser(state.data, state.session.userId);
  const society = getSelectedSociety(state.data, state.session.selectedSocietyId);

  if (!user || !society) {
    return null;
  }

  const overview = getAdminOverview(state.data, society.id);
  const activeTabLabel = adminTabs.find((item) => item.key === activeTab)?.label ?? 'Admin Home';
  const canReturnToResident = state.session.accountRole !== 'superUser';

  return (
    <PageFrame>
      {isCompact ? (
        <SurfaceCard style={styles.compactWorkspaceCard}>
          <View style={styles.compactWorkspaceTopRow}>
            <View style={styles.compactWorkspaceTitleWrap}>
              <Pill label="Admin" tone="accent" />
              <Text style={styles.compactWorkspaceTitle}>{society.name}</Text>
              <Caption>{activeTabLabel} | {getAdminTabDescription(activeTab)}</Caption>
            </View>
            <View style={styles.compactWorkspaceStatsRow}>
              <View style={styles.compactWorkspaceStat}>
                <Text style={styles.compactWorkspaceStatValue}>{overview.collectionRate}%</Text>
                <Caption>Collect</Caption>
              </View>
              <View style={styles.compactWorkspaceStat}>
                <Text style={styles.compactWorkspaceStatValue}>{overview.pendingApprovals}</Text>
                <Caption>Queue</Caption>
              </View>
            </View>
          </View>
          <View style={styles.compactWorkspaceActionRow}>
            {activeTab !== 'home' ? (
              <ActionButton label="← Back" onPress={() => setActiveTab('home')} variant="secondary" />
            ) : null}
            {canReturnToResident ? (
              <ActionButton label="Resident" onPress={actions.goToRoleSelection} variant="secondary" />
            ) : null}
            <ActionButton label="Societies" onPress={actions.goToWorkspaces} variant="secondary" />
          </View>
          <NavigationStrip items={adminTabs} activeKey={activeTab} onChange={setActiveTab} />
        </SurfaceCard>
      ) : null}

      {activeTab === 'home' ? (
        <AdminHomeExperience
          societyId={society.id}
          userId={user.id}
          canReturnToResident={canReturnToResident}
          onOpenTab={setActiveTab}
          onOpenWorkspaces={actions.goToWorkspaces}
          onSwitchResident={actions.goToRoleSelection}
        />
      ) : !isCompact ? (
        <>
          <SurfaceCard style={styles.moduleHeroCard}>
            <View style={styles.moduleHeroTopRow}>
              <View style={styles.moduleHeroTitleWrap}>
                <Pill label="Admin workspace" tone="accent" />
                <Text style={styles.moduleHeroTitle}>{activeTabLabel}</Text>
                <Caption>
                  {society.name} | {getAdminTabDescription(activeTab)}
                </Caption>
              </View>
              <View style={styles.moduleHeroStats}>
                <View style={styles.moduleHeroStatChip}>
                  <Text style={styles.moduleHeroStatValue}>{overview.collectionRate}%</Text>
                  <Text style={styles.moduleHeroStatLabel}>Collection</Text>
                </View>
                <View style={styles.moduleHeroStatChip}>
                  <Text style={styles.moduleHeroStatValue}>{overview.pendingApprovals}</Text>
                  <Text style={styles.moduleHeroStatLabel}>Approvals</Text>
                </View>
                <View style={styles.moduleHeroStatChip}>
                  <Text style={styles.moduleHeroStatValue}>{overview.openComplaints}</Text>
                  <Text style={styles.moduleHeroStatLabel}>Complaints</Text>
                </View>
              </View>
            </View>
            <View style={styles.metricGrid}>
              <MetricCard label="Collection rate" value={`${overview.collectionRate}%`} onPress={() => setActiveTab('collections')} />
              <MetricCard label="Pending approvals" value={String(overview.pendingApprovals)} tone="accent" onPress={() => setActiveTab('residents')} />
              <MetricCard
                label="Open complaints"
                value={String(overview.openComplaints)}
                tone="blue"
                onPress={() => setActiveTab('helpdesk')}
              />
            </View>
            <View style={styles.heroActions}>
              <ActionButton label="← Back" onPress={() => setActiveTab('home')} variant="secondary" />
              {canReturnToResident ? (
                <ActionButton label="Resident view" onPress={actions.goToRoleSelection} variant="secondary" />
              ) : null}
              <ActionButton label="Workspaces" onPress={actions.goToWorkspaces} variant="primary" />
            </View>
          </SurfaceCard>

          <SurfaceCard style={styles.adminNavigationCard}>
            <SectionHeader
              title={activeTabLabel}
              description={getAdminTabDescription(activeTab)}
            />
            <NavigationStrip items={adminTabs} activeKey={activeTab} onChange={setActiveTab} />
          </SurfaceCard>
        </>
      ) : null}

      {activeTab === 'residents' ? <AdminResidents societyId={society.id} /> : null}
      {activeTab === 'billing' ? <AdminBilling societyId={society.id} /> : null}
      {activeTab === 'collections' ? <AdminCollections societyId={society.id} /> : null}
      {activeTab === 'ledger' ? <AdminPaymentLedger societyId={society.id} /> : null}
      {activeTab === 'amenities' ? <AdminAmenities societyId={society.id} /> : null}
      {activeTab === 'helpdesk' ? <AdminHelpdesk societyId={society.id} /> : null}
      {activeTab === 'security' ? <AdminSecurity societyId={society.id} /> : null}
      {activeTab === 'announcements' ? <AdminAnnouncements societyId={society.id} /> : null}
      {activeTab === 'documents' ? <AdminDocuments societyId={society.id} /> : null}
      {activeTab === 'meetings' ? <AdminMeetings societyId={society.id} userId={user.id} /> : null}
      {activeTab === 'audit' ? <AdminAudit societyId={society.id} /> : null}
    </PageFrame>
  );
}

function PendingAccessApprovalsPanel({ societyId }: { societyId: string }) {
  const { state, actions } = useApp();
  const pendingJoinRequests = getJoinRequestsForSociety(state.data, societyId, 'pending');
  const isSuperUser = state.session.accountRole === 'superUser';
  const currentMembership = state.session.userId
    ? getMembershipForSociety(state.data, state.session.userId, societyId)
    : undefined;
  const canReviewResidentClaims = Boolean(currentMembership?.roles.includes('chairman'));
  const hasChairman = state.data.memberships.some(
    (membership) => membership.societyId === societyId && membership.roles.includes('chairman'),
  );
  const pendingChairmanClaims = pendingJoinRequests.filter(
    (request) => request.joinRequest.residentType === 'chairman',
  ).length;

  if (!pendingJoinRequests.length && !(isSuperUser && !hasChairman)) {
    return null;
  }

  return (
    <>
      {isSuperUser && !hasChairman ? (
        <SurfaceCard style={styles.adminFocusPanel}>
          <SectionHeader
            title="Chairman setup pending"
            description="This society has been created by the platform, but no local chairman has been approved yet."
          />
          <Caption>
            Next step: ask the intended chairman to use Join Society and submit a first-chairman claim for the correct unit or space.
          </Caption>
          <View style={styles.pillRow}>
            <Pill label="Super user workflow" tone="accent" />
            <Pill label={pendingChairmanClaims > 0 ? `${pendingChairmanClaims} claim pending` : 'No claim yet'} tone="warning" />
            <Pill label="Resident approvals wait for chairman setup" tone="primary" />
          </View>
        </SurfaceCard>
      ) : null}

      {pendingJoinRequests.length > 0 ? (
        <SurfaceCard style={styles.adminFocusPanel}>
          <SectionHeader
            title="Pending access approvals"
            description="Review each claim here with claimant details, selected unit, and the correct reviewer route."
          />
          <Caption>
            First-chairman claims are reviewed by the super user. Owner and tenant requests are reviewed by the active chairman after the first chairman is approved.
          </Caption>
          {pendingJoinRequests.map((request) => {
            const isChairmanClaim = request.joinRequest.residentType === 'chairman';
            const canReviewRequest = isChairmanClaim ? isSuperUser : canReviewResidentClaims;
            const unitSummary = request.units.map((unit) => unit?.code).filter(Boolean).join(', ') || 'No unit selected';
            const mobileNumber = request.residenceProfile?.phone ?? request.user?.phone ?? 'Not shared';

            return (
              <View key={request.joinRequest.id} style={styles.requestCard}>
                <View style={styles.compactText}>
                  <Text style={styles.cardTitle}>
                    {request.residenceProfile?.fullName ?? request.user?.name ?? 'Resident request'}
                  </Text>
                  <Caption>
                    Requested as {humanizeJoinRequestRole(request.joinRequest.residentType)} on {formatLongDate(request.joinRequest.createdAt)}
                  </Caption>
                </View>
                <View style={styles.pillRow}>
                  <Pill label={humanizeJoinRequestRole(request.joinRequest.residentType)} tone={isChairmanClaim ? 'warning' : 'primary'} />
                  <Pill
                    label={
                      isChairmanClaim
                        ? 'Reviewed by super user'
                        : hasChairman
                          ? 'Reviewed by chairman'
                          : 'Waiting for chairman'
                    }
                    tone={isChairmanClaim ? 'accent' : hasChairman ? 'accent' : 'warning'}
                  />
                </View>
                <View style={styles.compactText}>
                  <Caption>Mobile: {mobileNumber}</Caption>
                  <Caption>Selected unit or space: {unitSummary}</Caption>
                  {request.residenceProfile?.email ? <Caption>Email: {request.residenceProfile.email}</Caption> : null}
                  {request.residenceProfile?.businessName ? (
                    <Caption>Business name: {request.residenceProfile.businessName}</Caption>
                  ) : null}
                  {request.residenceProfile?.businessDetails ? (
                    <Caption>Business details: {request.residenceProfile.businessDetails}</Caption>
                  ) : null}
                  {request.residenceProfile?.alternatePhone ? (
                    <Caption>Alternate mobile: {request.residenceProfile.alternatePhone}</Caption>
                  ) : null}
                  {request.residenceProfile ? (
                    <Caption>
                      Move-in date: {formatLongDate(request.residenceProfile.moveInDate)}
                      {request.residenceProfile.emergencyContactName
                        ? ` | Emergency contact: ${request.residenceProfile.emergencyContactName}${request.residenceProfile.emergencyContactPhone ? ` (${request.residenceProfile.emergencyContactPhone})` : ''}`
                        : ''}
                    </Caption>
                  ) : null}
                  {isChairmanClaim ? (
                    <Caption>This person will become the first chairman for this society after approval.</Caption>
                  ) : !hasChairman ? (
                    <Caption>This resident request cannot move forward until the first chairman claim is approved by the super user.</Caption>
                  ) : null}
                  {request.joinRequest.residentType === 'tenant' ? (
                    <Caption>
                      Rent agreement: {request.residenceProfile?.rentAgreementFileName ? 'Attached' : 'Pending upload'}
                    </Caption>
                  ) : null}
                  {!canReviewRequest ? (
                    <Caption>
                      {isChairmanClaim
                        ? 'Only the super user can approve this claim.'
                        : 'Only the current chairman of this society can approve this resident request.'}
                    </Caption>
                  ) : null}
                </View>
                <View style={styles.heroActions}>
                  <ActionButton
                    label={state.isSyncing ? 'Processing...' : 'Approve'}
                    onPress={() => actions.reviewJoinRequest(request.joinRequest.id, 'approve')}
                    disabled={state.isSyncing || !canReviewRequest}
                  />
                  <ActionButton
                    label={state.isSyncing ? 'Processing...' : 'Reject'}
                    onPress={() => actions.reviewJoinRequest(request.joinRequest.id, 'reject')}
                    disabled={state.isSyncing || !canReviewRequest}
                    variant="secondary"
                  />
                </View>
              </View>
            );
          })}
        </SurfaceCard>
      ) : null}
    </>
  );
}

function AdminHome({ societyId, onOpenTab }: { societyId: string; onOpenTab: (tab: AdminRecommendationTab) => void }) {
  const { state, actions } = useApp();
  const overview = getAdminOverview(state.data, societyId);
  const pendingJoinRequests = getJoinRequestsForSociety(state.data, societyId, 'pending');
  const recommendations = getAdminRecommendations(state.data, societyId);
  const society = getSelectedSociety(state.data, societyId);
  const units = getUnitsForSociety(state.data, societyId);
  const isSuperUser = state.session.accountRole === 'superUser';
  const currentMembership = state.session.userId
    ? getMembershipForSociety(state.data, state.session.userId, societyId)
    : undefined;
  const canReviewResidentClaims = Boolean(currentMembership?.roles.includes('chairman'));
  const hasChairman = state.data.memberships.some(
    (membership) => membership.societyId === societyId && membership.roles.includes('chairman'),
  );
  const pendingChairmanClaims = pendingJoinRequests.filter(
    (request) => request.joinRequest.residentType === 'chairman',
  ).length;
  const [societyName, setSocietyName] = useState('');
  const [country, setCountry] = useState('');
  const [regionState, setRegionState] = useState('');
  const [city, setCity] = useState('');
  const [area, setArea] = useState('');
  const [address, setAddress] = useState('');
  const [tagline, setTagline] = useState('');
  const [confirmDeleteSociety, setConfirmDeleteSociety] = useState(false);

  useEffect(() => {
    setSocietyName(society?.name ?? '');
    setCountry(society?.country ?? '');
    setRegionState(society?.state ?? '');
    setCity(society?.city ?? '');
    setArea(society?.area ?? '');
    setAddress(society?.address ?? '');
    setTagline(society?.tagline ?? '');
  }, [
    society?.address,
    society?.area,
    society?.city,
    society?.country,
    society?.id,
    society?.name,
    society?.state,
    society?.tagline,
  ]);

  async function handleSaveSocietyProfile() {
    await actions.updateSocietyProfile(societyId, {
      name: societyName,
      country,
      state: regionState,
      city,
      area,
      address,
      tagline,
    });
  }

  async function handleDeleteSociety() {
    const deleted = await actions.deleteSocietyWorkspace(societyId);

    if (deleted) {
      setConfirmDeleteSociety(false);
    }
  }

  const quickLaunches: Array<{
    title: string;
    summary: string;
    metric: string;
    tone: 'accent' | 'blue' | 'gold' | 'primary';
    tab: AdminRecommendationTab;
  }> = [
    {
      title: 'Residents',
      summary: 'Occupancy, directory, and join approvals.',
      metric: `${units.length} ${society ? getSocietyUnitCollectionLabel(society) : 'units'}`,
      tone: 'primary',
      tab: 'residents',
    },
    {
      title: 'Billing',
      summary: 'Maintenance due cycles and reminders.',
      metric: `${overview.overdueInvoices} overdue`,
      tone: 'accent',
      tab: 'billing',
    },
    {
      title: 'Helpdesk',
      summary: 'Complaints, updates, and service follow-ups.',
      metric: `${overview.openComplaints} open`,
      tone: 'blue',
      tab: 'helpdesk',
    },
    {
      title: 'Security',
      summary: 'Guards, visitors, staff, and entry control.',
      metric: `${overview.activeGuards} guards`,
      tone: 'gold',
      tab: 'security',
    },
  ];

  const profilePills = society
    ? [
        `${society.city}, ${society.state}`,
        `${units.length} ${getSocietyUnitCollectionLabel(society)}`,
        societySupportsOfficeSpaces(society) ? 'Commercial-ready' : 'Residential flow',
      ]
    : [];

  return (
    <>
      {isSuperUser && !hasChairman ? (
        <SurfaceCard style={styles.adminFocusPanel}>
          <SectionHeader
            title="Chairman setup pending"
            description="This society has been created by the platform, but no local chairman has been approved yet."
          />
          <Caption>
            Next step: ask the intended chairman to use Join Society and submit a first-chairman claim for the correct unit or space.
          </Caption>
          <View style={styles.pillRow}>
            <Pill label="Super user workflow" tone="accent" />
            <Pill label={pendingChairmanClaims > 0 ? `${pendingChairmanClaims} claim pending` : 'No claim yet'} tone="warning" />
            <Pill label="Resident approvals locked until chairman exists" tone="primary" />
          </View>
        </SurfaceCard>
      ) : null}

      {pendingJoinRequests.length > 0 ? (
        <SurfaceCard style={styles.adminFocusPanel}>
          <SectionHeader title="Pending access approvals" description="Approve owner, tenant, or first-chairman claims before access is linked." />
          {pendingJoinRequests.map((request) => {
            const canReviewRequest =
              request.joinRequest.residentType === 'chairman'
                ? isSuperUser
                : canReviewResidentClaims;

            return (
              <View key={request.joinRequest.id} style={styles.requestCard}>
              <Text style={styles.cardTitle}>
                {request.residenceProfile?.fullName ?? request.user?.name ?? 'Resident request'}
              </Text>
              <Caption>
                Requested as {humanizeJoinRequestRole(request.joinRequest.residentType)} on {formatLongDate(request.joinRequest.createdAt)}
              </Caption>
              <Caption>Units: {request.units.map((unit) => unit?.code).filter(Boolean).join(', ')}</Caption>
              {request.joinRequest.residentType === 'chairman' ? (
                <Caption>This request must be reviewed by the super user because the society does not have a chairman yet.</Caption>
              ) : null}
              {request.residenceProfile?.businessName ? (
                <Caption>Business name: {request.residenceProfile.businessName}</Caption>
              ) : null}
              {request.residenceProfile?.businessDetails ? (
                <Caption>Business details: {request.residenceProfile.businessDetails}</Caption>
              ) : null}
              {request.residenceProfile ? (
                <Caption>
                  Move-in date: {formatLongDate(request.residenceProfile.moveInDate)}
                  {request.residenceProfile.emergencyContactName
                    ? ` · Emergency contact ${request.residenceProfile.emergencyContactName}`
                    : ''}
                </Caption>
              ) : null}
              {request.joinRequest.residentType === 'tenant' ? (
                <Caption>
                  Rent agreement: {request.residenceProfile?.rentAgreementFileName ? 'Attached' : 'Pending upload'}
                </Caption>
              ) : null}
              {!canReviewRequest ? (
                <Caption>
                  {request.joinRequest.residentType === 'chairman'
                    ? 'Only the super user can approve this claim.'
                    : 'Only the current chairman of this society can approve this resident request.'}
                </Caption>
              ) : null}
              <View style={styles.heroActions}>
                <ActionButton
                  label={state.isSyncing ? 'Processing...' : 'Approve'}
                  onPress={() => actions.reviewJoinRequest(request.joinRequest.id, 'approve')}
                  disabled={state.isSyncing || !canReviewRequest}
                />
                <ActionButton
                  label={state.isSyncing ? 'Processing...' : 'Reject'}
                  onPress={() => actions.reviewJoinRequest(request.joinRequest.id, 'reject')}
                  disabled={state.isSyncing || !canReviewRequest}
                  variant="secondary"
                />
              </View>
              </View>
            );
          })}
        </SurfaceCard>
      ) : null}

      <SurfaceCard style={styles.adminDashboardHero}>
        <View style={styles.adminDashboardTop}>
          <View style={styles.adminDashboardCopy}>
            <Pill label="Operations cockpit" tone="warning" />
            <Text style={styles.adminDashboardTitle}>Run daily society operations with better visibility</Text>
            <Caption style={styles.adminDashboardDescription}>
              Monitor collections, approvals, complaints, and security readiness from one polished admin dashboard.
            </Caption>
          </View>
          <View style={styles.adminDashboardMeta}>
            <Text style={styles.adminDashboardMetaValue}>{recommendations.length}</Text>
            <Caption style={styles.adminDashboardMetaText}>recommended module jumps</Caption>
          </View>
        </View>

        <View style={styles.adminSignalGrid}>
          <View style={styles.adminSignalCard}>
            <Text style={styles.adminSignalLabel}>Overdue invoices</Text>
            <Text style={styles.adminSignalValue}>{overview.overdueInvoices}</Text>
            <Caption>Residents waiting for collection follow-up.</Caption>
          </View>
          <View style={styles.adminSignalCard}>
            <Text style={styles.adminSignalLabel}>Pending approvals</Text>
            <Text style={styles.adminSignalValue}>{overview.pendingApprovals}</Text>
            <Caption>Approvals across joins, staff, payments, and bookings.</Caption>
          </View>
          <View style={styles.adminSignalCard}>
            <Text style={styles.adminSignalLabel}>Active guards</Text>
            <Text style={styles.adminSignalValue}>{overview.activeGuards}</Text>
            <Caption>Security coverage active for access operations.</Caption>
          </View>
        </View>

        <View style={styles.adminQuickLaunchGrid}>
          {quickLaunches.map((item) => (
            <Pressable
              key={item.title}
              onPress={() => onOpenTab(item.tab)}
              style={({ pressed }) => [
                styles.adminQuickLaunchCard,
                pressed ? styles.interactiveCardPressed : null,
              ]}
            >
              <Pill label={item.metric} tone={item.tone === 'gold' ? 'warning' : item.tone === 'blue' ? 'primary' : item.tone} />
              <Text style={styles.adminQuickLaunchTitle}>{item.title}</Text>
              <Caption>{item.summary}</Caption>
              <Text style={styles.adminQuickLaunchLink}>Open module</Text>
            </Pressable>
          ))}
        </View>
      </SurfaceCard>

      {society ? (
        <SurfaceCard style={styles.adminFocusPanel}>
          <View style={styles.adminPanelHeader}>
            <View style={styles.adminPanelHeaderCopy}>
              <SectionHeader
                title="Society profile"
                description="Update the society name and location here after setup. Structure, unit count, and space layout stay locked so existing records remain stable."
              />
            </View>
            <View style={styles.pillRow}>
              {profilePills.map((label) => (
                <Pill key={label} label={label} tone="primary" />
              ))}
            </View>
          </View>
          <View style={styles.formGrid}>
            <View style={styles.formField}>
              <InputField
                label="Society name"
                value={societyName}
                onChangeText={setSocietyName}
                placeholder="Green Valley Residency"
              />
            </View>
            <View style={styles.formField}>
              <InputField
                label="Country"
                value={country}
                onChangeText={setCountry}
                placeholder="India"
                autoCapitalize="words"
              />
            </View>
            <View style={styles.formField}>
              <InputField
                label="State"
                value={regionState}
                onChangeText={setRegionState}
                placeholder="Gujarat"
                autoCapitalize="words"
              />
            </View>
            <View style={styles.formField}>
              <InputField
                label="City"
                value={city}
                onChangeText={setCity}
                placeholder="Ahmedabad"
                autoCapitalize="words"
              />
            </View>
            <View style={styles.formField}>
              <InputField
                label="Area"
                value={area}
                onChangeText={setArea}
                placeholder="Prahladnagar"
                autoCapitalize="words"
              />
            </View>
          </View>
          <InputField
            label="Address"
            value={address}
            onChangeText={setAddress}
            placeholder="Prahladnagar Road, Ahmedabad"
            multiline
          />
          <InputField
            label="Tagline"
            value={tagline}
            onChangeText={setTagline}
            placeholder="Short summary shown in society discovery"
          />
          <ActionButton
            label={state.isSyncing ? 'Saving...' : 'Save society profile'}
            onPress={handleSaveSocietyProfile}
            disabled={state.isSyncing}
          />

          {isSuperUser ? (
            <View style={styles.deleteZone}>
              <SectionHeader
                title="Danger zone"
                description="Delete this society workspace permanently. This removes linked units, announcements, billing records, complaints, bookings, and approvals for this society."
              />
              {confirmDeleteSociety ? (
                <>
                  <Caption style={styles.deleteWarningText}>
                    This action cannot be undone. After deletion, this workspace will disappear from the super-user portfolio immediately.
                  </Caption>
                  <View style={styles.heroActions}>
                    <ActionButton
                      label="Cancel"
                      onPress={() => setConfirmDeleteSociety(false)}
                      variant="secondary"
                      disabled={state.isSyncing}
                    />
                    <ActionButton
                      label={state.isSyncing ? 'Deleting...' : 'Confirm delete society'}
                      onPress={() => {
                        void handleDeleteSociety();
                      }}
                      variant="danger"
                      disabled={state.isSyncing}
                    />
                  </View>
                </>
              ) : (
                <ActionButton
                  label="Delete this society"
                  onPress={() => setConfirmDeleteSociety(true)}
                  variant="danger"
                  disabled={state.isSyncing}
                />
              )}
            </View>
          ) : null}
        </SurfaceCard>
      ) : null}

      <SurfaceCard style={styles.adminFocusPanel}>
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
  const { width } = useWindowDimensions();
  const isCompact = width < 768;
  const useWideDetailGrid = width >= 1120;
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [chairmanResidentType, setChairmanResidentType] = useState<'owner' | 'tenant'>('owner');
  const currentUserId = state.session.userId;
  const society = getSelectedSociety(state.data, societyId);
  const chairmanMembership = currentUserId
    ? getMembershipForSociety(state.data, currentUserId, societyId)
    : undefined;
  const [selectedChairmanUnitIds, setSelectedChairmanUnitIds] = useState<string[]>(
    chairmanMembership?.unitIds ?? [],
  );
  const residents = getResidentsDirectory(state.data, societyId);
  const communityMembers = getCommunityMembersForSociety(state.data, societyId);
  const leadershipDirectory = getLeadershipProfilesForSociety(state.data, societyId);
  const currentChairmanMember =
    communityMembers.find(({ membership }) => membership.roles.includes('chairman')) ?? null;
  const committeeMembers = communityMembers.filter(
    ({ membership }) => membership.roles.includes('committee') && !membership.roles.includes('chairman'),
  );
  const leadershipCandidates = communityMembers.filter(
    ({ membership }) =>
      membership.userId !== currentChairmanMember?.user.id && !membership.roles.includes('security'),
  );
  const [selectedLeadershipUserId, setSelectedLeadershipUserId] = useState<string>(
    leadershipCandidates[0]?.user.id ?? '',
  );
  const activeUnitId = residents.some((entry) => entry.unit.id === selectedUnitId) ? selectedUnitId : null;
  const activeResidentEntry = activeUnitId
    ? residents.find((entry) => entry.unit.id === activeUnitId) ?? null
    : null;
  const currentChairmanUnitIds = new Set(chairmanMembership?.unitIds ?? []);
  const currentLeadershipProfile = leadershipDirectory.find(({ user }) => user.id === currentUserId)?.leadershipProfile;
  const canEditLeadershipProfile = Boolean(
    chairmanMembership?.roles.includes('chairman') || chairmanMembership?.roles.includes('committee'),
  );
  const residentRoleLabels = chairmanMembership?.roles
    .filter((role) => role === 'owner' || role === 'tenant')
    .map((role) => humanizeRole(role)) ?? [];
  const currentChairmanUnits = residents
    .filter((entry) => currentChairmanUnitIds.has(entry.unit.id))
    .map((entry) => entry.unit.code);
  const occupiedUnits = residents.filter((entry) => entry.residents.length > 0).length;
  const vacantUnits = residents.length - occupiedUnits;
  const currentUserProfile = currentUserId ? getCurrentUser(state.data, currentUserId) : undefined;
  const defaultLeadershipRoleLabel = chairmanMembership?.roles.includes('chairman') ? 'Chairman' : 'Committee member';
  const [leadershipDisplayName, setLeadershipDisplayName] = useState(
    currentLeadershipProfile?.displayName ?? currentUserProfile?.name ?? '',
  );
  const [leadershipRoleLabel, setLeadershipRoleLabel] = useState(
    currentLeadershipProfile?.roleLabel ?? defaultLeadershipRoleLabel,
  );
  const [leadershipPhone, setLeadershipPhone] = useState(
    currentLeadershipProfile?.phone ?? currentUserProfile?.phone ?? '',
  );
  const [leadershipEmail, setLeadershipEmail] = useState(
    currentLeadershipProfile?.email ?? currentUserProfile?.email ?? '',
  );
  const [leadershipAvailability, setLeadershipAvailability] = useState(
    currentLeadershipProfile?.availability ?? '',
  );
  const [leadershipBio, setLeadershipBio] = useState(currentLeadershipProfile?.bio ?? '');
  const [leadershipPhotoDataUrl, setLeadershipPhotoDataUrl] = useState(
    currentLeadershipProfile?.photoDataUrl ?? '',
  );
  const [leadershipProfileMessage, setLeadershipProfileMessage] = useState('');

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

  useEffect(() => {
    if (selectedLeadershipUserId && leadershipCandidates.some(({ user }) => user.id === selectedLeadershipUserId)) {
      return;
    }

    setSelectedLeadershipUserId(leadershipCandidates[0]?.user.id ?? '');
  }, [leadershipCandidates, selectedLeadershipUserId]);

  useEffect(() => {
    setLeadershipDisplayName(currentLeadershipProfile?.displayName ?? currentUserProfile?.name ?? '');
    setLeadershipRoleLabel(currentLeadershipProfile?.roleLabel ?? defaultLeadershipRoleLabel);
    setLeadershipPhone(currentLeadershipProfile?.phone ?? currentUserProfile?.phone ?? '');
    setLeadershipEmail(currentLeadershipProfile?.email ?? currentUserProfile?.email ?? '');
    setLeadershipAvailability(currentLeadershipProfile?.availability ?? '');
    setLeadershipBio(currentLeadershipProfile?.bio ?? '');
    setLeadershipPhotoDataUrl(currentLeadershipProfile?.photoDataUrl ?? '');
  }, [
    currentLeadershipProfile?.availability,
    currentLeadershipProfile?.bio,
    currentLeadershipProfile?.displayName,
    currentLeadershipProfile?.email,
    currentLeadershipProfile?.phone,
    currentLeadershipProfile?.photoDataUrl,
    currentLeadershipProfile?.roleLabel,
    currentUserProfile?.email,
    currentUserProfile?.name,
    currentUserProfile?.phone,
    defaultLeadershipRoleLabel,
  ]);

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

  function getLeadershipMemberLabel(member: (typeof communityMembers)[number]) {
    const primaryUnit = member.units[0]?.code ?? 'No unit linked';
    return `${member.user.name} · ${primaryUnit}`;
  }

  async function handleAssignChairman() {
    if (!selectedLeadershipUserId) {
      return;
    }

    await actions.updateLeadershipRole(societyId, {
      targetUserId: selectedLeadershipUserId,
      role: 'chairman',
      enabled: true,
    });
  }

  async function handleCommitteeToggle(targetUserId: string, enabled: boolean) {
    await actions.updateLeadershipRole(societyId, {
      targetUserId,
      role: 'committee',
      enabled,
    });
  }

  async function handleLeadershipPhotoSelection(capture?: 'user' | 'environment') {
    try {
      const selectedPhoto = await pickWebFileAsDataUrl({
        accept: 'image/png,image/jpeg,image/webp',
        capture,
        maxSizeInBytes: 4 * 1024 * 1024,
        unsupportedMessage: 'Leadership photo upload is currently available from the web workspace.',
        tooLargeMessage: 'Choose a profile photo smaller than 4 MB.',
        readErrorMessage: 'Could not read the selected leadership photo.',
      });

      if (!selectedPhoto) {
        return;
      }

      setLeadershipPhotoDataUrl(selectedPhoto.dataUrl);
      setLeadershipProfileMessage(`${selectedPhoto.fileName} is ready for the resident directory.`);
    } catch (error) {
      setLeadershipProfileMessage(error instanceof Error ? error.message : 'Could not attach the leadership photo.');
    }
  }

  async function handleSaveLeadershipProfile() {
    const saved = await actions.updateLeadershipProfile(societyId, {
      displayName: leadershipDisplayName,
      roleLabel: leadershipRoleLabel,
      phone: leadershipPhone,
      email: leadershipEmail || undefined,
      availability: leadershipAvailability || undefined,
      bio: leadershipBio || undefined,
      photoDataUrl: leadershipPhotoDataUrl || undefined,
    });

    if (saved) {
      setLeadershipProfileMessage('Resident-facing leadership profile saved.');
    }
  }

  return (
    <>
      <SectionHeader
        title="Residents hub"
        description="Monitor occupancy, unit mapping, resident links, and domestic staff visibility from the same summary-led admin layout used across the workspace."
      />
      <PendingAccessApprovalsPanel societyId={societyId} />
      <SurfaceCard>
        <View style={styles.metricGrid}>
          <MetricCard
            label="Total units"
            value={String(residents.length)}
            tone="primary"
            onPress={() => setSelectedUnitId(activeUnitId ?? residents[0]?.unit.id ?? null)}
          />
          <MetricCard
            label="Occupied"
            value={String(occupiedUnits)}
            tone="accent"
            onPress={() => setSelectedUnitId(residents.find((entry) => entry.residents.length > 0)?.unit.id ?? null)}
          />
          <MetricCard
            label="Vacant"
            value={String(vacantUnits)}
            tone="blue"
            onPress={() => setSelectedUnitId(residents.find((entry) => entry.residents.length === 0)?.unit.id ?? null)}
          />
          <MetricCard
            label="Chairman links"
            value={String(currentChairmanUnits.length)}
            tone="primary"
            onPress={() => setSelectedUnitId(residents.find((entry) => currentChairmanUnitIds.has(entry.unit.id))?.unit.id ?? null)}
          />
        </View>
        <View style={styles.inlineSection}>
          <Caption>
            Open any unit below to review resident details, occupancy, domestic staff records, and current payment visibility.
          </Caption>
        </View>
      </SurfaceCard>
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
      {society && chairmanMembership?.roles.includes('chairman') ? (
        <SurfaceCard>
          <SectionHeader
            title="Leadership and committee"
            description="Transfer chairman ownership to another linked member and manage committee access without leaving the residents hub."
          />
          <Caption>
            Current chairman: {currentChairmanMember
              ? `${currentChairmanMember.user.name}${currentChairmanMember.units[0]?.code ? ` · ${currentChairmanMember.units[0].code}` : ''}`
              : 'Not assigned yet'}
          </Caption>
          <View style={styles.inlineSection}>
            <Text style={styles.compactTitle}>Assign another chairman</Text>
            <Caption>
              Choose an existing resident or committee member already linked to this society. The previous chairman will remain a committee member.
            </Caption>
            <View style={styles.choiceRow}>
              {leadershipCandidates.map((member) => (
                <ChoiceChip
                  key={member.user.id}
                  label={getLeadershipMemberLabel(member)}
                  selected={selectedLeadershipUserId === member.user.id}
                  onPress={() => setSelectedLeadershipUserId(member.user.id)}
                />
              ))}
            </View>
            <ActionButton
              label={state.isSyncing ? 'Saving...' : 'Make selected member chairman'}
              onPress={handleAssignChairman}
              disabled={state.isSyncing || !selectedLeadershipUserId}
            />
          </View>
          <View style={styles.inlineSection}>
            <Text style={styles.compactTitle}>Committee members</Text>
            <Caption>
              Grant or remove committee access for linked residents. Committee members can use the admin workspace but do not replace the active chairman.
            </Caption>
            {communityMembers.length > 0 ? (
              <View style={styles.leadershipRoster}>
                {communityMembers
                  .filter(({ membership }) => !membership.roles.includes('security'))
                  .map((member) => {
                    const isChairman = member.membership.roles.includes('chairman');
                    const isCommittee = member.membership.roles.includes('committee');

                    return (
                      <View key={member.user.id} style={styles.leadershipMemberCard}>
                        <View style={styles.compactText}>
                          <Text style={styles.inlineTitle}>{member.user.name}</Text>
                          <Caption>
                            {member.units.map((unit) => unit.code).join(', ') || 'No unit linked yet'}
                          </Caption>
                          <View style={styles.pillRow}>
                            {member.membership.roles.map((role) => (
                              <Pill
                                key={`${member.user.id}-${role}`}
                                label={humanizeRole(role)}
                                tone={role === 'chairman' ? 'warning' : 'primary'}
                              />
                            ))}
                          </View>
                        </View>
                        {isChairman ? (
                          <Pill label="Chairman" tone="warning" />
                        ) : (
                          <ActionButton
                            label={isCommittee ? 'Remove committee' : 'Make committee'}
                            onPress={() => {
                              void handleCommitteeToggle(member.user.id, !isCommittee);
                            }}
                            variant={isCommittee ? 'secondary' : 'primary'}
                            disabled={state.isSyncing}
                          />
                        )}
                      </View>
                    );
                  })}
              </View>
            ) : (
              <Caption>No linked members are available yet. Approve at least one resident first.</Caption>
            )}
            {committeeMembers.length === 0 ? (
              <Caption>No additional committee members assigned yet.</Caption>
            ) : null}
          </View>
        </SurfaceCard>
      ) : null}
      {canEditLeadershipProfile ? (
        <SurfaceCard>
          <SectionHeader
            title="Resident-facing leadership profile"
            description="This public card appears in the resident community workspace so every household can see who runs the society and how to reach them."
          />
          <Caption>
            Residents usually expect a clean committee directory with photo, role, phone, email, and availability. Update your own public details here.
          </Caption>
          <View style={styles.formGrid}>
            <View style={styles.formField}>
              <InputField
                label="Public name"
                value={leadershipDisplayName}
                onChangeText={setLeadershipDisplayName}
                placeholder="Aarav Mehta"
              />
            </View>
            <View style={styles.formField}>
              <InputField
                label="Public role"
                value={leadershipRoleLabel}
                onChangeText={setLeadershipRoleLabel}
                placeholder="Chairman"
              />
            </View>
            <View style={styles.formField}>
              <InputField
                label="Public mobile"
                value={leadershipPhone}
                onChangeText={setLeadershipPhone}
                placeholder="+91 98980 11111"
                keyboardType="phone-pad"
                autoCapitalize="none"
              />
            </View>
            <View style={styles.formField}>
              <InputField
                label="Public email"
                value={leadershipEmail}
                onChangeText={setLeadershipEmail}
                placeholder="committee@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            <View style={styles.formField}>
              <InputField
                label="Availability"
                value={leadershipAvailability}
                onChangeText={setLeadershipAvailability}
                placeholder="Mon-Sat, 9:00 AM - 7:00 PM"
              />
            </View>
          </View>
          <InputField
            label="Resident-facing summary"
            value={leadershipBio}
            onChangeText={setLeadershipBio}
            multiline
            placeholder="Tell residents what you handle, when to contact you, and what kind of requests you usually coordinate."
          />
          <View style={styles.inlineSection}>
            <Text style={styles.inlineTitle}>Photo</Text>
            <View style={styles.choiceRow}>
              <ActionButton
                label="Take photo"
                variant="secondary"
                onPress={() => {
                  void handleLeadershipPhotoSelection('environment');
                }}
              />
              <ActionButton
                label={leadershipPhotoDataUrl ? 'Replace photo' : 'Upload photo'}
                variant="secondary"
                onPress={() => {
                  void handleLeadershipPhotoSelection();
                }}
              />
              {leadershipPhotoDataUrl ? (
                <ActionButton
                  label="Remove photo"
                  variant="danger"
                  onPress={() => {
                    setLeadershipPhotoDataUrl('');
                    setLeadershipProfileMessage('Photo removed. Save to update the resident directory.');
                  }}
                />
              ) : null}
            </View>
            {leadershipProfileMessage ? <Caption>{leadershipProfileMessage}</Caption> : null}
            {leadershipPhotoDataUrl ? (
              <View style={styles.announcementMediaCard}>
                <Image source={{ uri: leadershipPhotoDataUrl }} style={styles.announcementMediaImage} />
              </View>
            ) : null}
          </View>
          <ActionButton
            label={state.isSyncing ? 'Saving...' : 'Save public leadership profile'}
            onPress={handleSaveLeadershipProfile}
            disabled={state.isSyncing || !leadershipDisplayName.trim() || !leadershipRoleLabel.trim() || !leadershipPhone.trim()}
          />
          {leadershipDirectory.length > 0 ? (
            <View style={styles.inlineSection}>
              <Text style={styles.inlineTitle}>Resident directory preview</Text>
              <View style={styles.leadershipRoster}>
                {leadershipDirectory.map((entry) => (
                  <View key={entry.user.id} style={styles.leadershipMemberCard}>
                    <View style={styles.compactText}>
                      <Text style={styles.inlineTitle}>
                        {entry.leadershipProfile?.displayName ?? entry.user.name}
                      </Text>
                      <Caption>{entry.leadershipProfile?.roleLabel ?? humanizeRole(entry.membership.roles.includes('chairman') ? 'chairman' : 'committee')}</Caption>
                      <Caption>{entry.leadershipProfile?.phone ?? entry.user.phone}</Caption>
                      {entry.leadershipProfile?.email ? <Caption>{entry.leadershipProfile.email}</Caption> : null}
                    </View>
                    <Pill
                      label={entry.membership.roles.includes('chairman') ? 'Chairman' : 'Committee'}
                      tone={entry.membership.roles.includes('chairman') ? 'warning' : 'primary'}
                    />
                  </View>
                ))}
              </View>
            </View>
          ) : null}
        </SurfaceCard>
      ) : null}
      <View style={styles.residentUnitGrid}>
        {residents.map((entry) => {
          const isSelected = entry.unit.id === activeUnitId;
          const residentSummary = entry.residents.length > 0
            ? entry.residents.map((resident) => resident.user.name).join(', ')
            : 'No resident linked';

          return (
            <Pressable
              key={entry.unit.id}
              onPress={() => setSelectedUnitId(isSelected ? null : entry.unit.id)}
              style={({ pressed }) => [
                styles.residentUnitTile,
                isSelected ? styles.residentUnitTileActive : null,
                pressed ? styles.residentUnitTilePressed : null,
              ]}
            >
              <View style={styles.residentUnitTileHeader}>
                <Text style={styles.residentUnitCode}>{entry.unit.code}</Text>
                <Pill
                  label={entry.residents.length > 0 ? `${entry.residents.length}` : '0'}
                  tone={entry.residents.length > 0 ? 'primary' : 'warning'}
                />
              </View>
              {!isCompact && entry.building?.name ? (
                <Caption style={styles.residentUnitBuilding}>{entry.building.name}</Caption>
              ) : null}
              <Text style={styles.residentUnitResidents} numberOfLines={2}>
                {residentSummary}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {activeResidentEntry ? (
        <SurfaceCard style={styles.residentExpandedCard}>
          <SectionHeader
            title={`${activeResidentEntry.unit.code} details`}
            description="Selected unit details are shown here so the grid above stays compact."
          />
          <View style={[styles.residentDetailGrid, useWideDetailGrid ? styles.residentDetailGridWide : null]}>
            <View style={[styles.residentDetailPanel, useWideDetailGrid ? styles.residentDetailPanelWide : null]}>
              <Text style={styles.detailTitle}>Unit snapshot</Text>
              <DetailRow label="Unit type" value={activeResidentEntry.unit.unitType} />
              <DetailRow label="Building / block" value={activeResidentEntry.building?.name ?? 'Direct unit mapping'} />
              <DetailRow label="Outstanding dues" value={activeResidentEntry.outstandingAmount > 0 ? formatCurrency(activeResidentEntry.outstandingAmount) : 'None'} />
              <DetailRow label="Last payment" value={activeResidentEntry.latestPayment ? formatLongDate(activeResidentEntry.latestPayment.paidAt) : 'No payment recorded'} />
            </View>

            <View style={[styles.residentDetailPanel, useWideDetailGrid ? styles.residentDetailPanelWide : null]}>
              <Text style={styles.detailTitle}>Resident detail</Text>
              {activeResidentEntry.residents.length > 0 ? (
                <View style={styles.residentDetailList}>
                  {activeResidentEntry.residents.map((resident) => (
                    <View key={`${activeResidentEntry.unit.id}-${resident.user.id}`} style={styles.residentDetailItem}>
                      <Text style={styles.inlineTitle}>{resident.user.name}</Text>
                      <Caption>{resident.category}{resident.roles.length > 0 ? ` - ${resident.roles.map(humanizeRole).join(', ')}` : ''}</Caption>
                      {resident.residenceProfile?.businessName ? (
                        <Caption>Business: {resident.residenceProfile.businessName}</Caption>
                      ) : null}
                      {resident.residenceProfile?.businessDetails ? (
                        <Caption>{resident.residenceProfile.businessDetails}</Caption>
                      ) : null}
                      <Caption>{resident.user.phone}</Caption>
                      <Caption>{resident.user.email}</Caption>
                      <Caption>Started on {formatLongDate(resident.startDate)}</Caption>
                    </View>
                  ))}
                </View>
              ) : (
                <Caption>No resident detail is linked yet.</Caption>
              )}
            </View>

            <View style={[styles.residentDetailPanel, useWideDetailGrid ? styles.residentDetailPanelWide : null]}>
              <Text style={styles.detailTitle}>Domestic staff linked to this unit</Text>
              {activeResidentEntry.unitStaffRecords.length > 0 ? (
                <View style={styles.residentDetailList}>
                  {activeResidentEntry.unitStaffRecords.map(({ staff, assignments, requestedBy, reviewedBy }) => (
                    <View key={`${activeResidentEntry.unit.id}-${staff.id}`} style={styles.residentDetailItem}>
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
                  ))}
                </View>
              ) : (
                <Caption>No domestic staff is linked to this unit.</Caption>
              )}
            </View>
          </View>
        </SurfaceCard>
      ) : null}
    </>
  );
}

type AdminBillingFocus = 'all' | 'plan' | 'manual' | 'expenses';

function AdminBilling({ societyId }: { societyId: string }) {
  const { state, actions } = useApp();
  const [billingFocus, setBillingFocus] = useState<AdminBillingFocus>('all');
  const [expenseType, setExpenseType] = useState<'maintenance' | 'adhoc'>('maintenance');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [incurredOn, setIncurredOn] = useState(todayString());
  const [notes, setNotes] = useState('');
  const [planFrequency, setPlanFrequency] = useState<'monthly' | 'quarterly'>('monthly');
  const [planDueDay, setPlanDueDay] = useState('');
  const [planAmountInr, setPlanAmountInr] = useState('');
  const [receiptPrefix, setReceiptPrefix] = useState('');
  const [upiId, setUpiId] = useState('');
  const [upiMobileNumber, setUpiMobileNumber] = useState('');
  const [upiPayeeName, setUpiPayeeName] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankIfscCode, setBankIfscCode] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankBranchName, setBankBranchName] = useState('');
  const [upiQrCodeDataUrl, setUpiQrCodeDataUrl] = useState('');
  const [upiQrPayload, setUpiQrPayload] = useState('');
  const [qrUploadMessage, setQrUploadMessage] = useState('');
  const [manualInvoiceId, setManualInvoiceId] = useState<string | null>(null);
  const [manualPaymentMethod, setManualPaymentMethod] = useState<PaymentMethod>('cash');
  const [manualPaidAt, setManualPaidAt] = useState(nowDateTimeString(10));
  const [manualReferenceNote, setManualReferenceNote] = useState('');
  const society = getSelectedSociety(state.data, societyId);
  const plan = state.data.maintenancePlans.find((item) => item.societyId === societyId);
  const expenses = getExpenseRecordsForSociety(state.data, societyId);
  const payments = getPaymentsForSociety(state.data, societyId);
  const invoiceCollection = getInvoiceCollectionDirectory(state.data, societyId);
  const unpaidInvoices = invoiceCollection.filter(({ invoice }) => invoice.status !== 'paid');
  const pendingPaymentInvoiceIds = new Set(
    payments.filter((payment) => payment.status === 'pending').map((payment) => payment.invoiceId),
  );
  const selectedManualInvoice = unpaidInvoices.find(({ invoice }) => invoice.id === manualInvoiceId)
    ?? unpaidInvoices[0]
    ?? null;
  const capturedPayments = payments.filter((payment) => payment.status === 'captured').length;

  useEffect(() => {
    setPlanFrequency(plan?.frequency === 'quarterly' ? 'quarterly' : 'monthly');
    setPlanDueDay(plan?.dueDay ? String(plan.dueDay) : '');
    setPlanAmountInr(plan?.amountInr ? String(plan.amountInr) : '');
    setReceiptPrefix(plan?.receiptPrefix ?? '');
    setUpiId(plan?.upiId?.trim() ?? '');
    setUpiMobileNumber(plan?.upiMobileNumber?.trim() ?? '');
    setUpiPayeeName(plan?.upiPayeeName?.trim() || society?.name || '');
    setBankAccountName(plan?.bankAccountName?.trim() || society?.name || '');
    setBankAccountNumber(plan?.bankAccountNumber?.trim() ?? '');
    setBankIfscCode(plan?.bankIfscCode?.trim() ?? '');
    setBankName(plan?.bankName?.trim() ?? '');
    setBankBranchName(plan?.bankBranchName?.trim() ?? '');
    setUpiQrCodeDataUrl(plan?.upiQrCodeDataUrl?.trim() ?? '');
    setUpiQrPayload(plan?.upiQrPayload?.trim() ?? '');
    setQrUploadMessage('');
  }, [
    plan?.amountInr,
    plan?.dueDay,
    plan?.frequency,
    plan?.id,
    plan?.receiptPrefix,
    plan?.upiId,
    plan?.upiMobileNumber,
    plan?.upiPayeeName,
    plan?.bankAccountName,
    plan?.bankAccountNumber,
    plan?.bankIfscCode,
    plan?.bankName,
    plan?.bankBranchName,
    plan?.upiQrCodeDataUrl,
    plan?.upiQrPayload,
    society?.name,
  ]);

  useEffect(() => {
    if (manualInvoiceId && !unpaidInvoices.some(({ invoice }) => invoice.id === manualInvoiceId)) {
      setManualInvoiceId(unpaidInvoices[0]?.invoice.id ?? null);
      return;
    }

    if (!manualInvoiceId && unpaidInvoices.length > 0) {
      setManualInvoiceId(unpaidInvoices[0].invoice.id);
    }
  }, [manualInvoiceId, unpaidInvoices]);

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

  async function handleSaveBillingConfig() {
    if (!plan) {
      return;
    }

    await actions.updateMaintenanceBillingConfig(societyId, plan.id, {
      upiId,
      upiMobileNumber,
      upiPayeeName,
      upiQrCodeDataUrl,
      upiQrPayload,
      bankAccountName,
      bankAccountNumber,
      bankIfscCode,
      bankName,
      bankBranchName,
    });
  }

  async function handleSavePlanSettings() {
    if (!plan) {
      return;
    }

    await actions.updateMaintenancePlanSettings(societyId, plan.id, {
      frequency: planFrequency,
      dueDay: planDueDay,
      amountInr: planAmountInr,
      receiptPrefix,
    });
  }

  async function handleQrCodeUpload() {
    try {
      const selectedImage = await pickWebImageAsDataUrl();

      if (!selectedImage) {
        return;
      }

      setUpiQrCodeDataUrl(selectedImage);
      const decodedPayload = await tryDecodeQrPayloadFromDataUrl(selectedImage);
      setUpiQrPayload(decodedPayload ?? '');
      setQrUploadMessage(
        decodedPayload
          ? 'QR image selected and decoded. Save the billing setup to publish the exact UPI payload to residents.'
          : 'QR image selected. Save the billing setup to publish it to residents.',
      );
    } catch (error) {
      setQrUploadMessage(error instanceof Error ? error.message : 'Could not load the selected QR image.');
    }
  }

  async function handleManualPaymentCapture() {
    if (!selectedManualInvoice) {
      return;
    }

    const saved = await actions.recordManualPayment(societyId, {
      invoiceId: selectedManualInvoice.invoice.id,
      amountInr: String(selectedManualInvoice.invoice.amountInr),
      method: manualPaymentMethod,
      paidAt: manualPaidAt,
      referenceNote: manualReferenceNote,
    });

    if (saved) {
      setManualReferenceNote('');
      setManualPaidAt(nowDateTimeString(10));
      setManualPaymentMethod('cash');
      const nextInvoice = unpaidInvoices.find(({ invoice }) => invoice.id !== selectedManualInvoice.invoice.id);
      setManualInvoiceId(nextInvoice?.invoice.id ?? null);
    }
  }

  const showBillingPlan = billingFocus === 'all' || billingFocus === 'plan';
  const showBillingManual = billingFocus === 'all' || billingFocus === 'manual';
  const showBillingExpenses = billingFocus === 'all' || billingFocus === 'expenses';

  return (
    <>
      <SectionHeader
        title="Billing hub"
        description="Manage the maintenance plan, payment receivers, manual captures, and expense tracking from one summary-led billing module."
      />
      <SurfaceCard>
        <View style={styles.metricGrid}>
          <MetricCard
            label={billingFocus === 'manual' ? 'Unpaid invoices - selected' : 'Unpaid invoices'}
            value={String(unpaidInvoices.length)}
            tone="accent"
            onPress={() => {
              setManualInvoiceId(unpaidInvoices[0]?.invoice.id ?? null);
              setBillingFocus((current) => (current === 'manual' ? 'all' : 'manual'));
            }}
          />
          <MetricCard
            label={billingFocus === 'manual' ? 'Captured payments - selected' : 'Captured payments'}
            value={String(capturedPayments)}
            tone="primary"
            onPress={() => setBillingFocus((current) => (current === 'manual' ? 'all' : 'manual'))}
          />
          <MetricCard
            label={billingFocus === 'expenses' ? 'Expenses - selected' : 'Expenses'}
            value={String(expenses.length)}
            tone="blue"
            onPress={() => setBillingFocus((current) => (current === 'expenses' ? 'all' : 'expenses'))}
          />
          <MetricCard
            label={billingFocus === 'plan' ? 'Receivers configured - selected' : 'Receivers configured'}
            value={plan?.upiId || plan?.upiMobileNumber || plan?.upiQrCodeDataUrl || plan?.bankAccountNumber ? 'Yes' : 'No'}
            tone="primary"
            onPress={() => setBillingFocus((current) => (current === 'plan' ? 'all' : 'plan'))}
          />
        </View>
        <View style={styles.inlineSection}>
          <Caption>
            Use the cards below to update recurring billing, publish resident payment setup, capture offline payments, and maintain the expense register.
          </Caption>
        </View>
      </SurfaceCard>
      {plan && showBillingPlan ? (
        <SurfaceCard>
          <SectionHeader
            title="Maintenance plan"
            description="Change the recurring maintenance settings here. This updates the master plan for future billing cycles while leaving existing captured receipts untouched."
          />
          <View style={styles.choiceRow}>
            <ChoiceChip
              label="Monthly"
              selected={planFrequency === 'monthly'}
              onPress={() => setPlanFrequency('monthly')}
            />
            <ChoiceChip
              label="Quarterly"
              selected={planFrequency === 'quarterly'}
              onPress={() => setPlanFrequency('quarterly')}
            />
          </View>
          <View style={styles.formGrid}>
            <View style={styles.formField}>
              <InputField
                label="Due day"
                value={planDueDay}
                onChangeText={setPlanDueDay}
                keyboardType="numeric"
                placeholder="10"
              />
            </View>
            <View style={styles.formField}>
              <InputField
                label="Amount (INR)"
                value={planAmountInr}
                onChangeText={setPlanAmountInr}
                keyboardType="numeric"
                placeholder="6500"
              />
            </View>
            <View style={styles.formField}>
              <InputField
                label="Receipt prefix"
                value={receiptPrefix}
                onChangeText={setReceiptPrefix}
                autoCapitalize="characters"
                placeholder="GVA"
              />
            </View>
          </View>
          <ActionButton
            label={state.isSyncing ? 'Saving...' : 'Save maintenance plan'}
            onPress={handleSavePlanSettings}
            disabled={state.isSyncing}
          />
          <View style={styles.inlineSection}>
            <Text style={styles.inlineTitle}>UPI billing setup</Text>
            <Caption>Configure the receiver details once so residents can pay through GPay, PhonePe, Paytm, or any other UPI app. You can also add an experimental UPI mobile number if that receiver account supports phone-number payments.</Caption>
            <View style={styles.formGrid}>
              <View style={styles.formField}>
                <InputField
                  label="UPI ID"
                  value={upiId}
                  onChangeText={setUpiId}
                  autoCapitalize="none"
                  placeholder="society@upi"
                />
              </View>
              <View style={styles.formField}>
                <InputField
                  label="UPI mobile number"
                  value={upiMobileNumber}
                  onChangeText={setUpiMobileNumber}
                  keyboardType="phone-pad"
                  placeholder="9876543210"
                />
              </View>
              <View style={styles.formField}>
                <InputField
                  label="Receiver name"
                  value={upiPayeeName}
                  onChangeText={setUpiPayeeName}
                  placeholder="Society billing desk"
                />
              </View>
            </View>
            <View style={styles.inlineSection}>
              <Text style={styles.inlineTitle}>Bank transfer details</Text>
              <Caption>Add the receiver bank details residents can use for NEFT, RTGS, or IMPS transfers.</Caption>
              <View style={styles.formGrid}>
                <View style={styles.formField}>
                  <InputField
                    label="Account holder name"
                    value={bankAccountName}
                    onChangeText={setBankAccountName}
                    placeholder="Society billing account"
                  />
                </View>
                <View style={styles.formField}>
                  <InputField
                    label="Account number"
                    value={bankAccountNumber}
                    onChangeText={setBankAccountNumber}
                    keyboardType="numeric"
                    placeholder="123456789012"
                  />
                </View>
                <View style={styles.formField}>
                  <InputField
                    label="IFSC code"
                    value={bankIfscCode}
                    onChangeText={(value) => setBankIfscCode(value.toUpperCase())}
                    autoCapitalize="characters"
                    placeholder="HDFC0001234"
                  />
                </View>
                <View style={styles.formField}>
                  <InputField
                    label="Bank name"
                    value={bankName}
                    onChangeText={setBankName}
                    placeholder="HDFC Bank"
                  />
                </View>
                <View style={styles.formField}>
                  <InputField
                    label="Branch name (optional)"
                    value={bankBranchName}
                    onChangeText={setBankBranchName}
                    placeholder="Odhav Branch"
                  />
                </View>
              </View>
            </View>
            <View style={styles.inlineSection}>
              <Text style={styles.inlineTitle}>UPI QR code</Text>
              <Caption>Upload a QR image so residents can scan it directly from their billing screen.</Caption>
              <View style={styles.heroActions}>
                <ActionButton
                  label={upiQrCodeDataUrl ? 'Replace QR image' : 'Upload QR image'}
                  onPress={handleQrCodeUpload}
                  variant="secondary"
                  disabled={state.isSyncing}
                />
                {upiQrCodeDataUrl ? (
                  <ActionButton
                    label="Remove QR image"
                    onPress={() => {
                      setUpiQrCodeDataUrl('');
                      setUpiQrPayload('');
                      setQrUploadMessage('QR image removed. Save the billing setup to update residents.');
                    }}
                    variant="secondary"
                    disabled={state.isSyncing}
                  />
                ) : null}
              </View>
              {Platform.OS !== 'web' ? (
                <Caption>QR upload is available from the web workspace right now.</Caption>
              ) : null}
              {upiQrCodeDataUrl ? (
                <View style={styles.qrPreviewPanel}>
                  <Image source={{ uri: upiQrCodeDataUrl }} style={styles.qrPreviewImage} />
                </View>
              ) : null}
              {qrUploadMessage ? <Caption>{qrUploadMessage}</Caption> : null}
              {upiQrPayload ? <Caption>Decoded QR payload is ready and will be used for direct app-open payments.</Caption> : null}
            </View>
            <ActionButton
              label={state.isSyncing ? 'Saving...' : 'Save payment receiver setup'}
              onPress={handleSaveBillingConfig}
              disabled={state.isSyncing}
            />
          </View>
        </SurfaceCard>
      ) : null}

      {showBillingManual ? (
      <SurfaceCard>
        <SectionHeader
          title="Record manual payment"
          description="Use this for cash collection or any offline payment that the billing desk wants to capture directly without waiting for a resident review request."
        />
        {unpaidInvoices.length > 0 ? (
          <>
            <View style={styles.choiceRow}>
              {unpaidInvoices.map(({ invoice, unit }) => (
                <ChoiceChip
                  key={invoice.id}
                  label={`${unit?.code ?? 'Unit'} - ${invoice.periodLabel}`}
                  selected={selectedManualInvoice?.invoice.id === invoice.id}
                  onPress={() => setManualInvoiceId(invoice.id)}
                />
              ))}
            </View>
            {selectedManualInvoice ? (
              <View style={styles.inlineSection}>
                <Caption>
                  {selectedManualInvoice.unit?.code ?? 'Unit'} - {selectedManualInvoice.invoice.periodLabel} - {formatCurrency(selectedManualInvoice.invoice.amountInr)}
                </Caption>
                <View style={styles.choiceRow}>
                  {paymentMethodOptions.map((option) => (
                    <ChoiceChip
                      key={option.key}
                      label={option.label}
                      selected={manualPaymentMethod === option.key}
                      onPress={() => setManualPaymentMethod(option.key)}
                    />
                  ))}
                </View>
                <View style={styles.formGrid}>
                  <View style={styles.formField}>
                    <DateTimeField label="Paid on" value={manualPaidAt} onChangeText={setManualPaidAt} placeholder="2026-03-21T10:00" mode="datetime" />
                  </View>
                  <View style={styles.formField}>
                    <InputField
                      label="Reference / note"
                      value={manualReferenceNote}
                      onChangeText={setManualReferenceNote}
                      placeholder="Cash collected at desk, UPI ref, or bank note"
                    />
                  </View>
                </View>
                <ActionButton
                  label={state.isSyncing ? 'Saving...' : 'Mark payment as paid'}
                  onPress={handleManualPaymentCapture}
                  disabled={state.isSyncing || pendingPaymentInvoiceIds.has(selectedManualInvoice.invoice.id)}
                />
                {pendingPaymentInvoiceIds.has(selectedManualInvoice.invoice.id) ? (
                  <Caption>A resident payment flag is already waiting for review on this invoice. Approve or reject that request first.</Caption>
                ) : null}
              </View>
            ) : null}
          </>
        ) : (
          <Caption>No unpaid invoices are available for manual capture.</Caption>
        )}
      </SurfaceCard>
      ) : null}

      {showBillingExpenses ? (
        <>
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
                <DateTimeField label="Date" value={incurredOn} onChangeText={setIncurredOn} placeholder="2026-03-20" mode="date" />
              </View>
            </View>
            <InputField label="Notes" value={notes} onChangeText={setNotes} multiline placeholder="Vendor note or work summary" />
            <ActionButton label={state.isSyncing ? 'Saving...' : 'Save expense'} onPress={handleSave} disabled={state.isSyncing} />
          </SurfaceCard>

          <SurfaceCard>
            <SectionHeader
              title="Expense register"
              description="Saved maintenance and ad hoc expenses are listed here in the same subsection card format used across admin operations."
            />
          </SurfaceCard>
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
        </>
      ) : null}
    </>
  );
}

type AdminCollectionsFocus = 'all' | 'approvals' | 'tracker';

function AdminCollections({ societyId }: { societyId: string }) {
  const { state, actions } = useApp();
  const [collectionsFocus, setCollectionsFocus] = useState<AdminCollectionsFocus>('all');
  const [reminderMessage, setReminderMessage] = useState('');
  const [selectedOfficeUnitId, setSelectedOfficeUnitId] = useState<string | null>(null);
  const [trackerFilter, setTrackerFilter] = useState<'all' | 'pending' | 'overdue' | 'paid'>('all');
  const [receiptActionMessage, setReceiptActionMessage] = useState('');
  const [pendingReceiptRequest, setPendingReceiptRequest] = useState<{
    paymentId: string;
    mode: 'pdf' | 'whatsappBundle';
  } | null>(null);
  const society = getSelectedSociety(state.data, societyId);
  const plan = state.data.maintenancePlans.find((item) => item.societyId === societyId);
  const payments = getPaymentsForSociety(state.data, societyId);
  const invoiceCollection = getInvoiceCollectionDirectory(state.data, societyId);
  const residentsDirectory = getResidentsDirectory(state.data, societyId);
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
  type ResidentDirectoryEntry = ReturnType<typeof getResidentsDirectory>[number];
  type InvoiceCollectionEntry = (typeof invoiceCollection)[number];
  type OfficeMaintenanceEntry = ResidentDirectoryEntry & {
    maintenanceEntries: InvoiceCollectionEntry[];
    unpaidEntries: InvoiceCollectionEntry[];
    latestReminderDate?: string;
    maintenanceState: OfficeMaintenanceState;
  };
  const officeMaintenanceCollection = residentsDirectory
    .filter(({ unit }) => unit.unitType === 'office')
    .map((entry): OfficeMaintenanceEntry => {
      const maintenanceEntries = invoiceCollection
        .filter(({ unit }) => unit?.id === entry.unit.id)
        .sort((left, right) => Date.parse(right.invoice.dueDate) - Date.parse(left.invoice.dueDate));
      const unpaidEntries = maintenanceEntries.filter(({ invoice }) => invoice.status !== 'paid');
      const latestReminderDate = maintenanceEntries
        .map(({ latestReminder }) => latestReminder?.reminder.sentAt)
        .filter((sentAt): sentAt is string => Boolean(sentAt))
        .sort((left, right) => Date.parse(right) - Date.parse(left))[0];
      let maintenanceState: OfficeMaintenanceState = 'unbilled';

      if (maintenanceEntries.some(({ invoice }) => invoice.status === 'overdue')) {
        maintenanceState = 'overdue';
      } else if (unpaidEntries.length > 0) {
        maintenanceState = 'pending';
      } else if (maintenanceEntries.length > 0) {
        maintenanceState = 'paid';
      }

      return {
        ...entry,
        maintenanceEntries,
        unpaidEntries,
        latestReminderDate,
        maintenanceState,
      };
    })
    .sort((left, right) => {
      const buildingOrder =
        (left.building?.sortOrder ?? Number.MAX_SAFE_INTEGER) -
        (right.building?.sortOrder ?? Number.MAX_SAFE_INTEGER);

      if (buildingOrder !== 0) {
        return buildingOrder;
      }

      return left.unit.code.localeCompare(right.unit.code);
    });
  const isOfficeSociety = society ? societySupportsOfficeSpaces(society) : false;
  const contactLabel = isOfficeSociety ? 'Contacts' : 'Residents';
  const reminderAudienceLabel = isOfficeSociety ? 'offices' : 'residents';
  const rolloverAudienceLabel = isOfficeSociety ? 'offices' : 'residences';
  const totalOutstanding = unpaidInvoices.reduce((sum, entry) => sum + entry.invoice.amountInr, 0);
  const totalCaptured = payments
    .filter((payment) => payment.status === 'captured')
    .reduce((sum, payment) => sum + payment.amountInr, 0);
  const filteredInvoiceCollection = invoiceCollection.filter(({ invoice }) =>
    trackerFilter === 'all' ? true : invoice.status === trackerFilter,
  );
  const nextBillingCycle = plan ? getNextBillingCycleSummary(plan) : null;
  const selectedOfficeEntry = officeMaintenanceCollection.find(
    (entry) => entry.unit.id === selectedOfficeUnitId,
  );
  const bulkReminderUnitIds = isOfficeSociety
    ? officeMaintenanceCollection
      .filter((entry) => entry.maintenanceState !== 'paid')
      .map((entry) => entry.unit.id)
    : [];
  const hasBulkReminderTargets = unpaidInvoices.length > 0 || bulkReminderUnitIds.length > 0;

  useEffect(() => {
    if (selectedOfficeUnitId && !officeMaintenanceCollection.some((entry) => entry.unit.id === selectedOfficeUnitId)) {
      setSelectedOfficeUnitId(null);
    }
  }, [officeMaintenanceCollection, selectedOfficeUnitId]);

  useEffect(() => {
    if (!pendingReceiptRequest) {
      return;
    }

    const receipt = buildMaintenanceReceiptDetails(state.data, pendingReceiptRequest.paymentId);

    if (!receipt || receipt.paymentStatus !== 'captured') {
      return;
    }

    const pendingAction =
      pendingReceiptRequest.mode === 'whatsappBundle'
        ? prepareReceiptWhatsappBundle(receipt).then((message) => {
            setReceiptActionMessage(message);
          })
        : openMaintenanceReceiptPdf(receipt).then((opened) => {
            setReceiptActionMessage(
              opened
                ? `PDF-ready receipt opened for ${receipt.residentLabel}.`
                : 'Could not open the PDF receipt on this device. Use the button again from the payment ledger.',
            );
          });

    void pendingAction.finally(() => {
      setPendingReceiptRequest(null);
    });
  }, [pendingReceiptRequest, state.data]);

  async function handleReminder({
    invoiceIds,
    unitIds = [],
  }: {
    invoiceIds: string[];
    unitIds?: string[];
  }) {
    const sent = await actions.sendMaintenanceReminder(societyId, {
      invoiceIds,
      unitIds,
      message: reminderMessage,
    });

    if (sent) {
      setReminderMessage('');
    }
  }

  async function handleApproveAndOpenReceipt(paymentId: string) {
    setReceiptActionMessage('');
    setPendingReceiptRequest({ paymentId, mode: 'pdf' });
    const saved = await actions.reviewResidentPayment(societyId, paymentId, 'approve');

    if (!saved) {
      setPendingReceiptRequest(null);
    }
  }

  async function handleApproveAndWhatsappReceipt(paymentId: string) {
    setReceiptActionMessage('');
    setPendingReceiptRequest({ paymentId, mode: 'whatsappBundle' });
    const saved = await actions.reviewResidentPayment(societyId, paymentId, 'approve');

    if (!saved) {
      setPendingReceiptRequest(null);
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
        ? `PDF-ready receipt opened for ${receipt.residentLabel}.`
        : 'Could not open the PDF receipt on this device.',
    );
  }

  async function handlePrepareReceiptForWhatsapp(paymentId: string) {
    setReceiptActionMessage('');
    const receipt = buildMaintenanceReceiptDetails(state.data, paymentId);

    if (!receipt) {
      setReceiptActionMessage('Receipt details are not available for this payment yet.');
      return;
    }

    setReceiptActionMessage(await prepareReceiptWhatsappBundle(receipt));
  }

  const showCollectionsApprovals = collectionsFocus === 'all' || collectionsFocus === 'approvals';
  const showCollectionsTracker = collectionsFocus === 'all' || collectionsFocus === 'tracker';

  return (
    <>
      <SectionHeader
        title="Collections hub"
        description="Review dues, pending resident payment proofs, reminders, and invoice tracker health from one collections dashboard."
      />
      <SurfaceCard>
        <View style={styles.metricGrid}>
          <MetricCard
            label={collectionsFocus === 'tracker' && trackerFilter === 'pending' ? 'Outstanding dues - selected' : 'Outstanding dues'}
            value={formatCurrency(totalOutstanding)}
            tone="accent"
            onPress={() => {
              setTrackerFilter((current) => (collectionsFocus === 'tracker' && current === 'pending' ? 'all' : 'pending'));
              setCollectionsFocus((current) => (current === 'tracker' && trackerFilter === 'pending' ? 'all' : 'tracker'));
            }}
          />
          <MetricCard
            label={collectionsFocus === 'approvals' ? 'Pending approvals - selected' : 'Pending approvals'}
            value={String(pendingPaymentFlags.length)}
            tone="primary"
            onPress={() => setCollectionsFocus((current) => (current === 'approvals' ? 'all' : 'approvals'))}
          />
          <MetricCard
            label={collectionsFocus === 'tracker' && trackerFilter === 'pending' ? 'Open maintenance entries - selected' : 'Open maintenance entries'}
            value={String(unpaidInvoices.length)}
            tone="blue"
            onPress={() => {
              setTrackerFilter((current) => (collectionsFocus === 'tracker' && current === 'pending' ? 'all' : 'pending'));
              setCollectionsFocus((current) => (current === 'tracker' && trackerFilter === 'pending' ? 'all' : 'tracker'));
            }}
          />
          <MetricCard
            label={collectionsFocus === 'tracker' && trackerFilter === 'paid' ? 'Collected - selected' : 'Collected'}
            value={formatCurrency(totalCaptured)}
            onPress={() => {
              setTrackerFilter((current) => (collectionsFocus === 'tracker' && current === 'paid' ? 'all' : 'paid'));
              setCollectionsFocus((current) => (current === 'tracker' && trackerFilter === 'paid' ? 'all' : 'tracker'));
            }}
          />
        </View>
        <View style={styles.inlineSection}>
          <Caption>
            Start here for collection health, then move into billing cycle timing, reminders, approval review, and the invoice tracker below.
          </Caption>
        </View>
      </SurfaceCard>

      {nextBillingCycle && showCollectionsTracker ? (
        <SurfaceCard>
          <SectionHeader
            title="Next billing cycle"
            description="This shows when the next maintenance cycle will be opened automatically for the whole society."
          />
          <Text style={styles.cardTitle}>{nextBillingCycle.periodLabel} will auto-open as unpaid</Text>
          <Caption>
            All {rolloverAudienceLabel} will receive the next maintenance entry automatically on{' '}
            {formatLongDate(nextBillingCycle.rolloverDate)}.
          </Caption>
          <View style={styles.detailPanel}>
            <DetailRow
              label="Frequency"
              value={nextBillingCycle.frequency === 'quarterly' ? 'Quarterly' : 'Monthly'}
            />
            <DetailRow label="Auto-create date" value={formatLongDate(nextBillingCycle.rolloverDate)} />
            <DetailRow label="Due date" value={formatLongDate(nextBillingCycle.dueDate)} />
            <DetailRow label="Amount" value={formatCurrency(nextBillingCycle.amountInr)} />
          </View>
        </SurfaceCard>
      ) : null}

      {showCollectionsTracker ? (
      <SurfaceCard>
        <SectionHeader
          title={isOfficeSociety ? 'Remind unpaid offices' : 'Remind unpaid residents'}
          description={
            isOfficeSociety
              ? 'Send one billing reminder to every office with unpaid maintenance, or trigger it office by office from the tracker below.'
              : 'Send one billing reminder to every unit with unpaid maintenance, or trigger it unit by unit from the tracker below.'
          }
        />
        <InputField
          label="Reminder message"
          value={reminderMessage}
          onChangeText={setReminderMessage}
          multiline
          placeholder={
            isOfficeSociety
              ? 'March maintenance is still pending. Please share the payment proof in office billing or contact the chairman if already settled.'
              : 'March maintenance is still pending. Please share the payment proof in resident billing or contact the chairman if already settled.'
          }
        />
        <ActionButton
          label={state.isSyncing ? 'Sending...' : `Remind all unpaid ${reminderAudienceLabel}`}
          onPress={() => handleReminder({
            invoiceIds: unpaidInvoices.map(({ invoice }) => invoice.id),
            unitIds: bulkReminderUnitIds,
          })}
          disabled={state.isSyncing || !hasBulkReminderTargets}
        />
      </SurfaceCard>
      ) : null}

      {isOfficeSociety && showCollectionsTracker ? (
        <SurfaceCard>
          <SectionHeader
            title="Office maintenance status"
            description="Click any office number to open occupancy, billing, and contact details. Paid offices show in green and unpaid offices show in red."
          />
          {officeMaintenanceCollection.length > 0 ? (
            <>
              <Caption>Green office numbers are paid. Red office numbers still need maintenance action and can be reminded immediately.</Caption>
              <View style={styles.officeStatusChipGrid}>
                {officeMaintenanceCollection.map((entry) => {
                  const isSelected = entry.unit.id === selectedOfficeUnitId;
                  const chipPalette = getOfficeStatusChipPalette(entry.maintenanceState);

                  return (
                    <Pressable
                      key={entry.unit.id}
                      onPress={() => setSelectedOfficeUnitId(isSelected ? null : entry.unit.id)}
                      style={({ pressed }) => [
                        styles.officeStatusChip,
                        {
                          borderColor: isSelected ? chipPalette.selectedBackground : chipPalette.borderColor,
                          backgroundColor: isSelected ? chipPalette.selectedBackground : chipPalette.backgroundColor,
                        },
                        pressed ? styles.officeStatusChipPressed : null,
                      ]}
                    >
                      <Text
                        style={[
                          styles.officeStatusChipLabel,
                          { color: isSelected ? palette.white : chipPalette.textColor },
                        ]}
                      >
                        {entry.unit.code}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {selectedOfficeEntry ? (
                <View style={styles.detailStack}>
                  <View style={styles.detailPanel}>
                    <View style={styles.rowBetween}>
                      <Text style={styles.detailTitle}>{selectedOfficeEntry.unit.code}</Text>
                      <Pill
                        label={getOfficeMaintenanceBadgeLabel(
                          selectedOfficeEntry.maintenanceState,
                          selectedOfficeEntry.unpaidEntries.length,
                        )}
                        tone={getOfficeMaintenanceBadgeTone(selectedOfficeEntry.maintenanceState)}
                      />
                    </View>
                    <DetailRow label="Building / block" value={selectedOfficeEntry.building?.name ?? 'Direct office mapping'} />
                    <DetailRow
                      label="Maintenance status"
                      value={humanizeOfficeMaintenanceState(selectedOfficeEntry.maintenanceState)}
                    />
                    <DetailRow
                      label="Outstanding dues"
                      value={selectedOfficeEntry.outstandingAmount > 0 ? formatCurrency(selectedOfficeEntry.outstandingAmount) : 'None'}
                    />
                    <DetailRow
                      label="Latest cycle"
                      value={selectedOfficeEntry.maintenanceEntries[0]?.invoice.periodLabel ?? 'No invoice yet'}
                    />
                    <DetailRow
                      label="Last payment"
                      value={selectedOfficeEntry.latestPayment ? formatLongDate(selectedOfficeEntry.latestPayment.paidAt) : 'No payment recorded'}
                    />
                    <DetailRow
                      label="Last reminder"
                      value={selectedOfficeEntry.latestReminderDate ? formatLongDate(selectedOfficeEntry.latestReminderDate) : 'No reminder sent'}
                    />
                  </View>

                  <View style={styles.detailPanel}>
                    <Text style={styles.detailTitle}>Occupancy detail</Text>
                    {selectedOfficeEntry.residents.length > 0 ? (
                      selectedOfficeEntry.residents.map((resident) => (
                        <View key={`${selectedOfficeEntry.unit.id}-${resident.user.id}`} style={styles.inlineSection}>
                          <Text style={styles.inlineTitle}>{resident.user.name}</Text>
                          <Caption>
                            {resident.category}
                            {resident.roles.length > 0 ? ` - ${resident.roles.map(humanizeRole).join(', ')}` : ''}
                          </Caption>
                          <Caption>{resident.user.phone}</Caption>
                          <Caption>{resident.user.email}</Caption>
                          <Caption>Started on {formatLongDate(resident.startDate)}</Caption>
                        </View>
                      ))
                    ) : (
                      <Caption>No office contact details are linked yet.</Caption>
                    )}
                  </View>

                  <View style={styles.detailPanel}>
                    <Text style={styles.detailTitle}>Maintenance cycles</Text>
                    {selectedOfficeEntry.maintenanceEntries.length > 0 ? selectedOfficeEntry.maintenanceEntries.map(({ invoice, latestPayment, latestReminder }) => (
                      <View key={invoice.id} style={styles.inlineSection}>
                        <View style={styles.rowBetween}>
                          <Text style={styles.inlineTitle}>{invoice.periodLabel}</Text>
                          <Pill
                            label={humanizeInvoiceStatus(invoice.status)}
                            tone={getInvoiceStatusTone(invoice.status)}
                          />
                        </View>
                        <Caption>{formatCurrency(invoice.amountInr)} due on {formatLongDate(invoice.dueDate)}</Caption>
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
                      </View>
                    )) : (
                      <Caption>No maintenance cycles have been opened for this office yet.</Caption>
                    )}
                    {selectedOfficeEntry.maintenanceState !== 'paid' ? (
                      <ActionButton
                        label={state.isSyncing ? 'Sending...' : `Remind ${selectedOfficeEntry.unit.code}`}
                        onPress={() => handleReminder({
                          invoiceIds: selectedOfficeEntry.unpaidEntries.map(({ invoice }) => invoice.id),
                          unitIds: [selectedOfficeEntry.unit.id],
                        })}
                        disabled={state.isSyncing}
                        variant="secondary"
                      />
                    ) : selectedOfficeEntry.maintenanceEntries.length > 0 ? (
                      <Caption>All maintenance cycles for this office are paid right now.</Caption>
                    ) : null}
                  </View>
                </View>
              ) : (
                <Caption>Select an office number to open its details.</Caption>
              )}
            </>
          ) : (
            <Caption>No office numbers are linked to this society yet.</Caption>
          )}
        </SurfaceCard>
      ) : null}

      {showCollectionsApprovals ? (
      <SectionHeader
        title={isOfficeSociety ? 'Office maintenance approvals' : 'Resident maintenance approvals'}
        description="Every maintenance proof submitted from the resident workspace lands here for approval or rejection."
      />
      ) : null}
      {showCollectionsApprovals ? receiptActionMessage ? <Caption>{receiptActionMessage}</Caption> : null : null}
      {showCollectionsApprovals && pendingPaymentFlags.length > 0 ? pendingPaymentFlags.map(({ payment, invoice, unit, submitter }) => (
        <SurfaceCard key={payment.id}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>{invoice.periodLabel}</Text>
            <Pill label="Pending review" tone="warning" />
          </View>
          <Caption>{unit?.code ?? 'Unit'} - {formatCurrency(payment.amountInr)} via {humanizePaymentMethod(payment.method)}</Caption>
          <Caption>Submitted by {submitter?.name ?? 'Resident'} on {formatLongDate(payment.paidAt)}</Caption>
          {payment.referenceNote ? <Caption>Reference: {payment.referenceNote}</Caption> : null}
          {payment.proofImageDataUrl ? (
            <View style={styles.proofCard}>
              <Image source={{ uri: payment.proofImageDataUrl }} style={styles.proofImage} />
            </View>
          ) : null}
          <View style={styles.heroActions}>
            <ActionButton
              label={state.isSyncing ? 'Processing...' : 'Approve + PDF + WhatsApp'}
              onPress={() => handleApproveAndWhatsappReceipt(payment.id)}
              disabled={state.isSyncing}
            />
            <ActionButton
              label={state.isSyncing ? 'Processing...' : 'Approve + Open PDF'}
              onPress={() => handleApproveAndOpenReceipt(payment.id)}
              disabled={state.isSyncing}
              variant="secondary"
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
        showCollectionsApprovals ? <SurfaceCard><Caption>No maintenance payment confirmations are waiting right now.</Caption></SurfaceCard> : null
      )}

      {showCollectionsTracker ? (
      <SurfaceCard>
        <SectionHeader
          title={isOfficeSociety ? 'Office maintenance tracker' : 'Resident maintenance tracker'}
          description="Filter and review every maintenance invoice with its latest payment and reminder status."
        />
        <View style={styles.choiceRow}>
          <ChoiceChip label="All" selected={trackerFilter === 'all'} onPress={() => setTrackerFilter('all')} />
          <ChoiceChip label="Pending" selected={trackerFilter === 'pending'} onPress={() => setTrackerFilter('pending')} />
          <ChoiceChip label="Overdue" selected={trackerFilter === 'overdue'} onPress={() => setTrackerFilter('overdue')} />
          <ChoiceChip label="Paid" selected={trackerFilter === 'paid'} onPress={() => setTrackerFilter('paid')} />
        </View>
        <Caption>
          Showing {filteredInvoiceCollection.length} {filteredInvoiceCollection.length === 1 ? 'entry' : 'entries'} in the current view.
        </Caption>
      </SurfaceCard>
      ) : null}
      {showCollectionsTracker ? filteredInvoiceCollection.map(({ invoice, unit, residents, latestPayment, latestReminder }) => (
        <SurfaceCard key={invoice.id}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>{invoice.periodLabel}</Text>
            <Pill label={humanizeInvoiceStatus(invoice.status)} tone={getInvoiceStatusTone(invoice.status)} />
          </View>
          <Caption>{unit?.code ?? 'Unit'} - {formatCurrency(invoice.amountInr)} due on {formatLongDate(invoice.dueDate)}</Caption>
          <Caption>{contactLabel}: {residents.map((resident) => resident.name).join(', ') || 'No resident linked yet'}</Caption>
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
              onPress={() => handleReminder({ invoiceIds: [invoice.id] })}
              disabled={state.isSyncing}
              variant="secondary"
            />
          ) : null}
        </SurfaceCard>
      )) : null}
      {showCollectionsTracker && filteredInvoiceCollection.length === 0 ? (
        <SurfaceCard><Caption>No maintenance entries match this filter right now.</Caption></SurfaceCard>
      ) : null}

      {showCollectionsTracker ? (
      <SurfaceCard>
        <SectionHeader
          title="Payment reminders sent"
          description="Every reminder broadcast is preserved here so follow-up activity stays visible after the tracker actions above."
        />
      </SurfaceCard>
      ) : null}
      {showCollectionsTracker && paymentReminders.length > 0 ? paymentReminders.map(({ reminder, units, sentBy }) => (
        <SurfaceCard key={reminder.id}>
          <Text style={styles.cardTitle}>Reminder by {sentBy?.name ?? 'Admin'}</Text>
          <Caption>{reminder.message}</Caption>
          <Caption>Units: {units.map((unit) => unit.code).join(', ')}</Caption>
          <Caption>{formatLongDate(reminder.sentAt)}</Caption>
        </SurfaceCard>
      )) : (
        showCollectionsTracker ? <SurfaceCard><Caption>No maintenance reminders have been sent yet.</Caption></SurfaceCard> : null
      )}

    </>
  );
}

function AdminPaymentLedger({ societyId }: { societyId: string }) {
  const { state } = useApp();
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'captured' | 'pending' | 'rejected'>('all');
  const [receiptActionMessage, setReceiptActionMessage] = useState('');
  const payments = getPaymentsForSociety(state.data, societyId);
  const filteredPayments = payments.filter((payment) =>
    paymentFilter === 'all' ? true : payment.status === paymentFilter,
  );
  const capturedPayments = payments.filter((payment) => payment.status === 'captured');
  const pendingPayments = payments.filter((payment) => payment.status === 'pending');
  const rejectedPayments = payments.filter((payment) => payment.status === 'rejected');
  const receiptReadyCount = payments.filter((payment) =>
    state.data.receipts.some((receipt) => receipt.paymentId === payment.id),
  ).length;

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
        ? `PDF-ready receipt opened for ${receipt.residentLabel}.`
        : 'Could not open the PDF receipt on this device.',
    );
  }

  async function handlePrepareReceiptForWhatsapp(paymentId: string) {
    setReceiptActionMessage('');
    const receipt = buildMaintenanceReceiptDetails(state.data, paymentId);

    if (!receipt) {
      setReceiptActionMessage('Receipt details are not available for this payment yet.');
      return;
    }

    setReceiptActionMessage(await prepareReceiptWhatsappBundle(receipt));
  }

  return (
    <>
      <SectionHeader
        title="Ledger hub"
        description="Keep receipt-ready payment history separate from live collections follow-up while preserving the same admin module design language."
      />
      <SurfaceCard>
        <View style={styles.metricGrid}>
          <MetricCard label={paymentFilter === 'all' ? 'Total payments - selected' : 'Total payments'} value={String(payments.length)} onPress={() => setPaymentFilter('all')} />
          <MetricCard label={paymentFilter === 'captured' ? 'Captured - selected' : 'Captured'} value={String(capturedPayments.length)} tone="primary" onPress={() => setPaymentFilter('captured')} />
          <MetricCard label={paymentFilter === 'pending' ? 'Pending review - selected' : 'Pending review'} value={String(pendingPayments.length)} tone="accent" onPress={() => setPaymentFilter('pending')} />
          <MetricCard label={paymentFilter === 'captured' ? 'Receipts ready - selected' : 'Receipts ready'} value={String(receiptReadyCount)} tone="blue" onPress={() => setPaymentFilter('captured')} />
        </View>
        {rejectedPayments.length > 0 ? (
          <Caption>{rejectedPayments.length} payment {rejectedPayments.length === 1 ? 'entry is' : 'entries are'} currently rejected.</Caption>
        ) : null}
      </SurfaceCard>

      <SurfaceCard>
        <SectionHeader
          title="Ledger filters"
          description="Review all payment records here without mixing them into reminders and approval follow-up."
        />
        <View style={styles.choiceRow}>
          <ChoiceChip label="All" selected={paymentFilter === 'all'} onPress={() => setPaymentFilter('all')} />
          <ChoiceChip label="Captured" selected={paymentFilter === 'captured'} onPress={() => setPaymentFilter('captured')} />
          <ChoiceChip label="Pending" selected={paymentFilter === 'pending'} onPress={() => setPaymentFilter('pending')} />
          <ChoiceChip label="Rejected" selected={paymentFilter === 'rejected'} onPress={() => setPaymentFilter('rejected')} />
        </View>
        <Caption>
          Showing {filteredPayments.length} {filteredPayments.length === 1 ? 'payment' : 'payments'} in the current view.
        </Caption>
      </SurfaceCard>

      {receiptActionMessage ? <Caption>{receiptActionMessage}</Caption> : null}
      {filteredPayments.length > 0 ? filteredPayments.map((payment) => {
        const invoice = state.data.invoices.find((invoiceRecord) => invoiceRecord.id === payment.invoiceId);
        const unit = invoice ? state.data.units.find((unitRecord) => unitRecord.id === invoice.unitId) : undefined;
        const receiptDetails = buildMaintenanceReceiptDetails(state.data, payment.id);

        return (
          <SurfaceCard key={payment.id}>
            <View style={styles.rowBetween}>
              <Text style={styles.cardTitle}>{invoice?.periodLabel ?? 'Maintenance payment'}</Text>
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
                onOpenPdf={() => {
                  void handleOpenReceiptPdf(payment.id);
                }}
                whatsappLabel="Share PDF + WhatsApp"
                onSendWhatsapp={() => {
                  void handlePrepareReceiptForWhatsapp(payment.id);
                }}
              />
            ) : payment.status === 'captured' ? (
              <Caption>The receipt will appear here once it is synced from the billing ledger.</Caption>
            ) : null}
          </SurfaceCard>
        );
      }) : (
        <SurfaceCard><Caption>No payment records match this filter right now.</Caption></SurfaceCard>
      )}
    </>
  );
}

function AdminAmenities({ societyId }: { societyId: string }) {
  const { state, actions } = useApp();
  const [bookingFilter, setBookingFilter] = useState<'all' | 'pending' | 'waitlisted' | 'confirmed'>('all');
  const amenities = getAmenitiesForSociety(state.data, societyId);
  const bookings = getBookingsForSociety(state.data, societyId);
  const pendingBookings = bookings.filter(({ booking }) => booking.status === 'pending');
  const waitlistedBookings = bookings.filter(({ booking }) => booking.status === 'waitlisted');
  const confirmedBookings = bookings.filter(({ booking }) => booking.status === 'confirmed').length;
  const visibleBookings = bookings.filter(({ booking }) => bookingFilter === 'all' || booking.status === bookingFilter);

  return (
    <>
      <SectionHeader
        title="Amenities hub"
        description="Manage the amenity catalog and booking operations from one admin module that follows the same summary-first pattern as the rest of the workspace."
      />
      <SurfaceCard>
        <View style={styles.metricGrid}>
          <MetricCard label={bookingFilter === 'all' ? 'Amenities - selected' : 'Amenities'} value={String(amenities.length)} tone="primary" onPress={() => setBookingFilter('all')} />
          <MetricCard label={bookingFilter === 'pending' ? 'Pending - selected' : 'Pending'} value={String(pendingBookings.length)} tone="accent" onPress={() => setBookingFilter((current) => (current === 'pending' ? 'all' : 'pending'))} />
          <MetricCard label={bookingFilter === 'waitlisted' ? 'Waitlisted - selected' : 'Waitlisted'} value={String(waitlistedBookings.length)} tone="blue" onPress={() => setBookingFilter((current) => (current === 'waitlisted' ? 'all' : 'waitlisted'))} />
          <MetricCard label={bookingFilter === 'confirmed' ? 'Confirmed - selected' : 'Confirmed'} value={String(confirmedBookings)} tone="primary" onPress={() => setBookingFilter((current) => (current === 'confirmed' ? 'all' : 'confirmed'))} />
        </View>
        <View style={styles.inlineSection}>
          <Caption>
            Review the amenity catalog first, then manage booking demand, confirmations, and waitlist movement below.
          </Caption>
        </View>
      </SurfaceCard>
      <SectionHeader title="Amenity catalog" description="Support exclusive, capacity-based, and info-only amenities from day one." />
      {amenities.map((amenity) => (
        <SurfaceCard key={amenity.id}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>{amenity.name}</Text>
            <Pill label={amenity.bookingType} tone="accent" />
          </View>
          <Caption>Approval: {amenity.approvalMode}{amenity.priceInr ? ` - Fee ${formatCurrency(amenity.priceInr)}` : ''}</Caption>
          <Caption>Booking mode: {amenity.reservationScope === 'fullDay' ? 'Full-day lock' : 'Timed slots'}</Caption>
        </SurfaceCard>
      ))}

      <SurfaceCard>
        <SectionHeader
          title="Booking operations"
          description="Resident booking requests land here. Confirm or waitlist them so the resident workspace and admin queue stay in sync."
        />
        <View style={styles.metricGrid}>
          <MetricCard label={bookingFilter === 'pending' ? 'Pending review - selected' : 'Pending review'} value={String(pendingBookings.length)} tone="accent" onPress={() => setBookingFilter((current) => (current === 'pending' ? 'all' : 'pending'))} />
          <MetricCard label={bookingFilter === 'waitlisted' ? 'Waitlisted - selected' : 'Waitlisted'} value={String(waitlistedBookings.length)} tone="blue" onPress={() => setBookingFilter((current) => (current === 'waitlisted' ? 'all' : 'waitlisted'))} />
          <MetricCard label={bookingFilter === 'all' ? 'Total requests - selected' : 'Total requests'} value={String(bookings.length)} onPress={() => setBookingFilter('all')} />
        </View>
      </SurfaceCard>

      <SurfaceCard>
        <SectionHeader
          title="Pending, waitlisted, and confirmed bookings"
          description={bookingFilter === 'all' ? 'The full amenity booking queue stays grouped here after the summary cards so every status reads the same way.' : `Showing ${visibleBookings.length} ${bookingFilter} booking${visibleBookings.length === 1 ? '' : 's'} from the summary selection above.`}
        />
      </SurfaceCard>
      {visibleBookings.length > 0 ? visibleBookings.map(({ booking, amenity, unit, user }) => (
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
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'inProgress' | 'resolved'>('all');
  const [assignmentDrafts, setAssignmentDrafts] = useState<Record<string, string>>({});
  const [updateMessageDrafts, setUpdateMessageDrafts] = useState<Record<string, string>>({});
  const [updatePhotoDrafts, setUpdatePhotoDrafts] = useState<Record<string, string>>({});
  const [updatePhotoMessages, setUpdatePhotoMessages] = useState<Record<string, string>>({});
  const visibleComplaints = complaints.filter(({ complaint }) => statusFilter === 'all' || complaint.status === statusFilter);

  function getAssignedValue(complaintId: string, currentAssignedTo?: string) {
    return assignmentDrafts[complaintId] ?? currentAssignedTo ?? '';
  }

  function setAssignedValue(complaintId: string, value: string) {
    setAssignmentDrafts((currentDrafts) => ({
      ...currentDrafts,
      [complaintId]: value,
    }));
  }

  function getUpdateMessageValue(complaintId: string) {
    return updateMessageDrafts[complaintId] ?? '';
  }

  function setUpdateMessageValue(complaintId: string, value: string) {
    setUpdateMessageDrafts((currentDrafts) => ({
      ...currentDrafts,
      [complaintId]: value,
    }));
  }

  async function attachComplaintUpdatePhoto(complaintId: string, capture?: 'user' | 'environment') {
    try {
      const file = await pickWebFileAsDataUrl({
        accept: 'image/png,image/jpeg,image/webp',
        capture,
        maxSizeInBytes: 4 * 1024 * 1024,
        unsupportedMessage: 'Helpdesk update photo capture is available from the web workspace right now.',
        tooLargeMessage: 'Choose a helpdesk update photo smaller than 4 MB.',
        readErrorMessage: 'Could not read the selected helpdesk update photo.',
      });

      if (!file) {
        return;
      }

      setUpdatePhotoDrafts((currentDrafts) => ({
        ...currentDrafts,
        [complaintId]: file.dataUrl,
      }));
      setUpdatePhotoMessages((currentDrafts) => ({
        ...currentDrafts,
        [complaintId]: 'Photo attached. Post the update to publish it to the resident.',
      }));
    } catch (error) {
      setUpdatePhotoMessages((currentDrafts) => ({
        ...currentDrafts,
        [complaintId]:
          error instanceof Error ? error.message : 'Could not attach the helpdesk update photo.',
      }));
    }
  }

  async function updateComplaint(
    complaintId: string,
    status: 'open' | 'inProgress' | 'resolved',
    assignedTo?: string,
  ) {
    const message = getUpdateMessageValue(complaintId).trim();
    const photoDataUrl = updatePhotoDrafts[complaintId];
    const saved = await actions.updateComplaintTicket(societyId, complaintId, {
      status,
      assignedTo,
      message: message || undefined,
      photoDataUrl: photoDataUrl || undefined,
    });

    if (saved) {
      setAssignmentDrafts((currentDrafts) => ({
        ...currentDrafts,
        [complaintId]: assignedTo ?? '',
      }));
      setUpdateMessageDrafts((currentDrafts) => ({
        ...currentDrafts,
        [complaintId]: '',
      }));
      setUpdatePhotoDrafts((currentDrafts) => ({
        ...currentDrafts,
        [complaintId]: '',
      }));
      setUpdatePhotoMessages((currentDrafts) => ({
        ...currentDrafts,
        [complaintId]: '',
      }));
    }
  }

  return (
    <>
      <SectionHeader
        title="Helpdesk hub"
        description="Track complaint volume, assignment progress, and resolution flow from the same summary-led admin design used in the other modules."
      />
      <SurfaceCard>
        <View style={styles.metricGrid}>
          <MetricCard
            label={statusFilter === 'open' ? 'Open tickets - selected' : 'Open tickets'}
            value={String(openComplaints.length)}
            tone="accent"
            onPress={() => setStatusFilter((current) => (current === 'open' ? 'all' : 'open'))}
          />
          <MetricCard
            label={statusFilter === 'inProgress' ? 'In progress - selected' : 'In progress'}
            value={String(inProgressComplaints.length)}
            tone="primary"
            onPress={() => setStatusFilter((current) => (current === 'inProgress' ? 'all' : 'inProgress'))}
          />
          <MetricCard
            label={statusFilter === 'resolved' ? 'Resolved - selected' : 'Resolved'}
            value={String(resolvedComplaints.length)}
            tone="blue"
            onPress={() => setStatusFilter((current) => (current === 'resolved' ? 'all' : 'resolved'))}
          />
        </View>
        <View style={styles.inlineSection}>
          <Caption>
            Use the status cards above to focus the queue, then assign owners, post updates, and resolve resident tickets below.
          </Caption>
        </View>
      </SurfaceCard>

      <SectionHeader
        title="Resident helpdesk queue"
        description={
          statusFilter === 'all'
            ? `Showing all ${complaints.length} tickets. Tap a status card above to filter the queue.`
            : `Showing ${visibleComplaints.length} ${humanizeComplaintStatus(statusFilter).toLowerCase()} ticket${visibleComplaints.length === 1 ? '' : 's'}. Tap the selected status card again to show all tickets.`
        }
      />
      {visibleComplaints.length > 0 ? visibleComplaints.map(({ complaint, unit, user }) => {
        const assignedTo = getAssignedValue(complaint.id, complaint.assignedTo);
        const updates = getComplaintUpdatesForComplaint(state.data, complaint.id);
        const updatePhotoDataUrl = updatePhotoDrafts[complaint.id];
        const updatePhotoMessage = updatePhotoMessages[complaint.id];

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
            <View style={styles.inlineSection}>
              <Text style={styles.inlineTitle}>Interim update</Text>
              <InputField
                label="Progress note"
                value={getUpdateMessageValue(complaint.id)}
                onChangeText={(value) => setUpdateMessageValue(complaint.id, value)}
                multiline
                placeholder="Share what was checked, what is pending, expected next step, or what the resident should know."
              />
              <View style={styles.heroActions}>
                <ActionButton
                  label="Take photo"
                  variant="secondary"
                  onPress={() => {
                    void attachComplaintUpdatePhoto(complaint.id, 'environment');
                  }}
                />
                <ActionButton
                  label={updatePhotoDataUrl ? 'Replace photo' : 'Upload photo'}
                  variant="secondary"
                  onPress={() => {
                    void attachComplaintUpdatePhoto(complaint.id);
                  }}
                />
                {updatePhotoDataUrl ? (
                  <ActionButton
                    label="Remove photo"
                    variant="danger"
                    onPress={() => {
                      setUpdatePhotoDrafts((currentDrafts) => ({
                        ...currentDrafts,
                        [complaint.id]: '',
                      }));
                      setUpdatePhotoMessages((currentDrafts) => ({
                        ...currentDrafts,
                        [complaint.id]: '',
                      }));
                    }}
                  />
                ) : null}
              </View>
              {updatePhotoMessage ? <Caption>{updatePhotoMessage}</Caption> : null}
              {updatePhotoDataUrl ? (
                <View style={styles.proofCard}>
                  <Image source={{ uri: updatePhotoDataUrl }} style={styles.helpdeskUpdateImage} />
                </View>
              ) : null}
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
                label={state.isSyncing ? 'Saving...' : 'Post update'}
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
            <View style={styles.inlineSection}>
              <Text style={styles.inlineTitle}>Timeline</Text>
              {updates.length > 0 ? updates.map(({ update, user: updateUser }) => (
                <View key={update.id} style={styles.inlineSection}>
                  <View style={styles.rowBetween}>
                    <Caption>{updateUser?.name ?? 'Society team'} · {formatLongDate(update.createdAt)}</Caption>
                    <Pill
                      label={humanizeComplaintStatus(update.status)}
                      tone={getComplaintTone(update.status)}
                    />
                  </View>
                  {update.assignedTo ? <Caption>Assigned to: {update.assignedTo}</Caption> : null}
                  {update.message ? <Caption>{update.message}</Caption> : null}
                  {update.photoDataUrl ? (
                    <View style={styles.proofCard}>
                      <Image source={{ uri: update.photoDataUrl }} style={styles.helpdeskUpdateImage} />
                    </View>
                  ) : null}
                </View>
              )) : <Caption>No updates posted yet.</Caption>}
            </View>
          </SurfaceCard>
        );
      }) : (
        <SurfaceCard>
          <Caption>{statusFilter === 'all' ? 'No helpdesk tickets have been raised yet.' : 'No helpdesk tickets match the selected status right now.'}</Caption>
        </SurfaceCard>
      )}
    </>
  );
}

type AdminSecurityFocus = 'all' | 'guards' | 'staff' | 'visitors' | 'entries';

function AdminSecurity({ societyId }: { societyId: string }) {
  const { state, actions } = useApp();
  const [securityFocus, setSecurityFocus] = useState<AdminSecurityFocus>('all');
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
  const visitorPasses = getVisitorPassesForSociety(state.data, societyId);
  const checkedInVisitorPasses = visitorPasses.filter(({ visitorPass }) => visitorPass.status === 'checkedIn').length;

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

  const showGuardSection = securityFocus === 'all' || securityFocus === 'guards';
  const showStaffSection = securityFocus === 'all' || securityFocus === 'staff';
  const showVisitorSection = securityFocus === 'all' || securityFocus === 'visitors';
  const showEntrySection = securityFocus === 'all' || securityFocus === 'entries';

  return (
    <>
      <SectionHeader
        title="Security hub"
        description="Manage guards, staff verification, visitor passes, and entry records from one security operations hub that matches the newer admin module layout."
      />
      <SurfaceCard>
        <View style={styles.metricGrid}>
          <MetricCard label={securityFocus === 'guards' ? 'Guards - selected' : 'Guards'} value={String(guards.length)} tone="primary" onPress={() => setSecurityFocus((current) => (current === 'guards' ? 'all' : 'guards'))} />
          <MetricCard label={securityFocus === 'staff' ? 'Pending staff - selected' : 'Pending staff'} value={String(pendingStaff.length)} tone="accent" onPress={() => setSecurityFocus((current) => (current === 'staff' ? 'all' : 'staff'))} />
          <MetricCard label={securityFocus === 'visitors' ? 'Visitor passes - selected' : 'Visitor passes'} value={String(visitorPasses.length)} tone="blue" onPress={() => setSecurityFocus((current) => (current === 'visitors' ? 'all' : 'visitors'))} />
          <MetricCard label={securityFocus === 'visitors' ? 'Checked in - selected' : 'Checked in'} value={String(checkedInVisitorPasses)} tone="primary" onPress={() => setSecurityFocus((current) => (current === 'visitors' ? 'all' : 'visitors'))} />
        </View>
        <View style={styles.inlineSection}>
          <Caption>
            This module centralizes roster updates, approvals, visitor movement, and entry logs so the resident and security workspaces stay in sync.
          </Caption>
        </View>
      </SurfaceCard>

      {showGuardSection || showStaffSection || showEntrySection ? (
        <SectionHeader title="Security operations" description="Add guard, staff, and entry data here. Residents can then see the records tied to their units." />
      ) : null}

      {showGuardSection ? (
      <SurfaceCard>
        <SectionHeader title="Guard roster" />
        <View style={styles.formGrid}>
          <View style={styles.formField}><InputField label="Guard name" value={guardName} onChangeText={setGuardName} placeholder="Mahesh Yadav" /></View>
          <View style={styles.formField}><InputField label="Phone" value={guardPhone} onChangeText={setGuardPhone} keyboardType="phone-pad" placeholder="+91 98980 12345" /></View>
          <View style={styles.formField}><InputField label="Shift label" value={guardShiftLabel} onChangeText={setGuardShiftLabel} placeholder="Day or Night" /></View>
          <View style={styles.formField}><InputField label="Vendor" value={guardVendor} onChangeText={setGuardVendor} placeholder="SecureNest Services" /></View>
          <View style={styles.formField}><InputField label="Gate" value={guardGate} onChangeText={setGuardGate} placeholder="Main gate" /></View>
          <View style={styles.formField}><DateTimeField label="Shift start" value={guardShiftStart} onChangeText={setGuardShiftStart} placeholder="2026-03-20T06:00" mode="datetime" /></View>
          <View style={styles.formField}><DateTimeField label="Shift end" value={guardShiftEnd} onChangeText={setGuardShiftEnd} placeholder="2026-03-20T14:00" mode="datetime" /></View>
        </View>
        <ActionButton label={state.isSyncing ? 'Saving...' : 'Add guard'} onPress={saveGuard} disabled={state.isSyncing} />
        <Caption>
          That phone number will also receive Security workspace access for this society, so the guard can sign in and manage live gate approvals.
        </Caption>
        {guards.length > 0 ? guards.map(({ guard, latestShift }) => (
          <View key={guard.id} style={styles.inlineSection}>
            <Text style={styles.inlineTitle}>{guard.name}</Text>
            <Caption>{guard.shiftLabel}{guard.vendorName ? ` - ${guard.vendorName}` : ''}</Caption>
            <Caption>{guard.phone}</Caption>
            <Caption>{latestShift ? `Gate ${latestShift.gate} - ${formatLongDate(latestShift.start)}` : 'No shift record yet'}</Caption>
          </View>
        )) : <Caption>No guards added yet.</Caption>}
      </SurfaceCard>
      ) : null}

      {showStaffSection ? (
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
      ) : null}

      {showVisitorSection ? (
      <SurfaceCard>
        <SectionHeader
          title="Visitor passes"
          description="Residents create visitor passes from their workspace. Security or committee can check them in and out here, and every move stays synced with entry logs."
        />
        {visitorPasses.length > 0 ? visitorPasses.map(({ visitorPass, unit, createdBy }) => (
          <View key={visitorPass.id} style={styles.inlineSection}>
            <View style={styles.rowBetween}>
              <Text style={styles.inlineTitle}>{visitorPass.visitorName}</Text>
              <Pill
                label={humanizeVisitorPassStatus(visitorPass.status)}
                tone={getVisitorPassTone(visitorPass.status)}
              />
            </View>
            <Caption>
              {humanizeVisitorCategory(visitorPass.category)} for {unit?.code ?? 'Resident unit'} - pass {visitorPass.passCode}
            </Caption>
            <Caption>
              Expected {formatLongDate(visitorPass.expectedAt)}{visitorPass.phone ? ` - ${visitorPass.phone}` : ''}
            </Caption>
            <Caption>
              Purpose: {visitorPass.purpose}{visitorPass.vehicleNumber ? ` - Vehicle ${visitorPass.vehicleNumber}` : ''}
            </Caption>
            {visitorPass.notes ? <Caption>Gate note: {visitorPass.notes}</Caption> : null}
            <Caption>
              Created by {createdBy?.name ?? 'Resident'} on {formatLongDate(visitorPass.createdAt)}
            </Caption>
            {visitorPass.status === 'scheduled' ? (
              <View style={styles.heroActions}>
                <ActionButton
                  label={state.isSyncing ? 'Processing...' : 'Check in visitor'}
                  onPress={() => actions.updateVisitorPassStatus(societyId, visitorPass.id, { status: 'checkedIn' })}
                  disabled={state.isSyncing}
                />
                <ActionButton
                  label={state.isSyncing ? 'Processing...' : 'Cancel pass'}
                  onPress={() => actions.updateVisitorPassStatus(societyId, visitorPass.id, { status: 'cancelled' })}
                  disabled={state.isSyncing}
                  variant="secondary"
                />
              </View>
            ) : null}
            {visitorPass.status === 'checkedIn' ? (
              <View style={styles.heroActions}>
                <ActionButton
                  label={state.isSyncing ? 'Processing...' : 'Mark exited'}
                  onPress={() => actions.updateVisitorPassStatus(societyId, visitorPass.id, { status: 'completed' })}
                  disabled={state.isSyncing}
                />
              </View>
            ) : null}
          </View>
        )) : <Caption>No visitor passes created yet.</Caption>}
      </SurfaceCard>
      ) : null}

      {showEntrySection ? (
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
      ) : null}
    </>
  );
}

type AdminCommunicationsFocus = 'all' | 'announcements' | 'highPriority' | 'rules';

function AdminAnnouncements({ societyId }: { societyId: string }) {
  const { state, actions } = useApp();
  const [communicationsFocus, setCommunicationsFocus] = useState<AdminCommunicationsFocus>('all');
  const society = getSelectedSociety(state.data, societyId);
  const announcements = getAnnouncementsForSociety(state.data, societyId);
  const rules = getRulesForSociety(state.data, societyId);
  const [selectedTemplateKey, setSelectedTemplateKey] = useState('custom');
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementBody, setAnnouncementBody] = useState('');
  const [announcementPhotoDataUrl, setAnnouncementPhotoDataUrl] = useState('');
  const [announcementPhotoMessage, setAnnouncementPhotoMessage] = useState('');
  const [announcementAudience, setAnnouncementAudience] = useState<AnnouncementAudience>('all');
  const [announcementPriority, setAnnouncementPriority] = useState<AnnouncementPriority>('normal');
  const highPriorityAnnouncements = announcements.filter((announcement) => announcement.priority === 'high').length;
  const visibleAnnouncements = communicationsFocus === 'highPriority'
    ? announcements.filter((announcement) => announcement.priority === 'high')
    : announcements;
  const showAnnouncementSection = communicationsFocus === 'all' || communicationsFocus === 'announcements' || communicationsFocus === 'highPriority';
  const showRulesSection = communicationsFocus === 'all' || communicationsFocus === 'rules';

  async function handleSendAnnouncement() {
    const saved = await actions.createAnnouncement(societyId, {
      title: announcementTitle,
      body: announcementBody,
      photoDataUrl: announcementPhotoDataUrl || undefined,
      audience: announcementAudience,
      priority: announcementPriority,
    });

    if (saved) {
      setSelectedTemplateKey('custom');
      setAnnouncementTitle('');
      setAnnouncementBody('');
      setAnnouncementPhotoDataUrl('');
      setAnnouncementPhotoMessage('');
      setAnnouncementAudience('all');
      setAnnouncementPriority('normal');
    }
  }

  async function handleAnnouncementPhotoSelection(capture?: 'user' | 'environment') {
    try {
      const selectedPhoto = await pickWebFileAsDataUrl({
        accept: 'image/png,image/jpeg,image/webp',
        capture,
        maxSizeInBytes: 4 * 1024 * 1024,
        unsupportedMessage: 'Announcement photo capture is available from the web workspace right now.',
        tooLargeMessage: 'Choose an announcement photo smaller than 4 MB.',
        readErrorMessage: 'Could not read the selected announcement photo.',
      });

      if (!selectedPhoto) {
        return;
      }

      setAnnouncementPhotoDataUrl(selectedPhoto.dataUrl);
      setAnnouncementPhotoMessage(
        capture
          ? 'Photo attached. Publish the announcement to share it with residents.'
          : 'Image attached. Publish the announcement to share it with residents.',
      );
    } catch (error) {
      setAnnouncementPhotoMessage(
        error instanceof Error ? error.message : 'Could not attach the announcement photo.',
      );
    }
  }

  function applyAnnouncementTemplate(templateKey: string) {
    if (templateKey === 'custom') {
      setSelectedTemplateKey('custom');
      setAnnouncementTitle('');
      setAnnouncementBody('');
      setAnnouncementPhotoMessage('');
      setAnnouncementAudience('all');
      setAnnouncementPriority('normal');
      return;
    }

    const template = announcementTemplates.find((entry) => entry.key === templateKey);

    if (!template) {
      return;
    }

    setSelectedTemplateKey(template.key);
    setAnnouncementTitle(template.title);
    setAnnouncementBody(template.buildBody(society?.name ?? 'the society'));
    setAnnouncementAudience(template.audience);
    setAnnouncementPriority(template.priority);
  }

  return (
    <>
      <SectionHeader
        title="Announcements hub"
        description="Publish targeted resident communication, manage priority notices, and keep policy updates visible from one clean communications module."
      />
      <SurfaceCard>
        <View style={styles.metricGrid}>
          <MetricCard label={communicationsFocus === 'announcements' || communicationsFocus === 'all' ? 'Announcements - selected' : 'Announcements'} value={String(announcements.length)} tone="primary" onPress={() => setCommunicationsFocus((current) => (current === 'announcements' ? 'all' : 'announcements'))} />
          <MetricCard label={communicationsFocus === 'highPriority' ? 'High priority - selected' : 'High priority'} value={String(highPriorityAnnouncements)} tone="accent" onPress={() => setCommunicationsFocus((current) => (current === 'highPriority' ? 'all' : 'highPriority'))} />
          <MetricCard label={communicationsFocus === 'rules' ? 'Rules - selected' : 'Rules'} value={String(rules.length)} tone="blue" onPress={() => setCommunicationsFocus((current) => (current === 'rules' ? 'all' : 'rules'))} />
        </View>
        <View style={styles.inlineSection}>
          <Caption>
            Start with the summary above, then publish a new announcement or review the current notice feed and rule updates below.
          </Caption>
        </View>
      </SurfaceCard>

      {showAnnouncementSection ? (
      <SectionHeader
        title="Targeted communications"
        description="Choose a common society announcement template or draft a custom one, then send it to the selected audience in one shot."
      />
      ) : null}
      {showAnnouncementSection ? (
      <SurfaceCard>
        <Text style={styles.cardTitle}>Send announcement</Text>
        <Caption>
          Common notice templates are listed below for gated communities and housing societies. Pick one to prefill the message, then edit anything before publishing.
        </Caption>
        <View style={styles.choiceRow}>
          <ChoiceChip
            label="Custom message"
            selected={selectedTemplateKey === 'custom'}
            onPress={() => applyAnnouncementTemplate('custom')}
          />
          {announcementTemplates.map((template) => (
            <ChoiceChip
              key={template.key}
              label={template.title}
              selected={selectedTemplateKey === template.key}
              onPress={() => applyAnnouncementTemplate(template.key)}
            />
          ))}
        </View>
        <View style={styles.templateGrid}>
          {announcementTemplates.map((template) => (
            <Pressable
              key={template.key}
              onPress={() => applyAnnouncementTemplate(template.key)}
              style={({ pressed }) => [
                styles.interactiveCard,
                styles.templateCard,
                selectedTemplateKey === template.key ? styles.interactiveCardActive : null,
                pressed ? styles.interactiveCardPressed : null,
              ]}
            >
              <Text style={styles.inlineTitle}>{template.title}</Text>
              <Caption>{template.summary}</Caption>
              <View style={styles.pillRow}>
                <Pill label={humanizeAnnouncementAudience(template.audience)} tone="accent" />
                <Pill label={humanizeAnnouncementPriority(template.priority)} tone={getAnnouncementPriorityTone(template.priority)} />
              </View>
            </Pressable>
          ))}
        </View>
        <View style={styles.inlineSection}>
          <Text style={styles.inlineTitle}>Audience</Text>
          <View style={styles.choiceRow}>
            {announcementAudienceOptions.map((option) => (
              <ChoiceChip
                key={option.key}
                label={option.label}
                selected={announcementAudience === option.key}
                onPress={() => setAnnouncementAudience(option.key)}
              />
            ))}
          </View>
        </View>
        <View style={styles.inlineSection}>
          <Text style={styles.inlineTitle}>Priority</Text>
          <View style={styles.choiceRow}>
            {announcementPriorityOptions.map((option) => (
              <ChoiceChip
                key={option.key}
                label={option.label}
                selected={announcementPriority === option.key}
                onPress={() => setAnnouncementPriority(option.key)}
              />
            ))}
          </View>
        </View>
        <View style={styles.inlineSection}>
          <View style={styles.formGrid}>
            <View style={styles.formField}>
              <InputField
                label="Announcement title"
                value={announcementTitle}
                onChangeText={setAnnouncementTitle}
                placeholder="Water supply shutdown"
              />
            </View>
          </View>
          <InputField
            label="Message"
            value={announcementBody}
            onChangeText={setAnnouncementBody}
            multiline
            placeholder="Write the full announcement here. Residents will receive it in their notices section immediately."
          />
          <View style={styles.inlineSection}>
            <Text style={styles.inlineTitle}>Photo (optional)</Text>
            <Caption>
              Take a fresh picture from the device camera or attach one from the gallery. Residents will see the same photo with this notice.
            </Caption>
            <View style={styles.choiceRow}>
              <ActionButton
                label="Take photo"
                variant="secondary"
                onPress={() => {
                  void handleAnnouncementPhotoSelection('environment');
                }}
              />
              <ActionButton
                label={announcementPhotoDataUrl ? 'Replace photo' : 'Upload photo'}
                variant="secondary"
                onPress={() => {
                  void handleAnnouncementPhotoSelection();
                }}
              />
              {announcementPhotoDataUrl ? (
                <ActionButton
                  label="Remove photo"
                  variant="danger"
                  onPress={() => {
                    setAnnouncementPhotoDataUrl('');
                    setAnnouncementPhotoMessage('');
                  }}
                />
              ) : null}
            </View>
            {announcementPhotoMessage ? <Caption>{announcementPhotoMessage}</Caption> : null}
            {announcementPhotoDataUrl ? (
              <View style={styles.announcementMediaCard}>
                <Image source={{ uri: announcementPhotoDataUrl }} style={styles.announcementMediaImage} />
              </View>
            ) : null}
          </View>
          <ActionButton
            label={state.isSyncing ? 'Sending...' : 'Send announcement'}
            onPress={handleSendAnnouncement}
            disabled={state.isSyncing || !announcementTitle.trim() || !announcementBody.trim()}
          />
        </View>
      </SurfaceCard>
      ) : null}

      {showAnnouncementSection && visibleAnnouncements.length > 0 ? visibleAnnouncements.map((announcement) => (
        <SurfaceCard key={announcement.id}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>{announcement.title}</Text>
            <Pill
              label={humanizeAnnouncementPriority(announcement.priority)}
              tone={getAnnouncementPriorityTone(announcement.priority)}
            />
          </View>
          <Caption>
            Audience: {humanizeAnnouncementAudience(announcement.audience)} - {formatShortDate(announcement.createdAt)}
          </Caption>
          <Caption>{announcement.body}</Caption>
          {announcement.photoDataUrl ? (
            <View style={styles.announcementMediaCard}>
              <Image source={{ uri: announcement.photoDataUrl }} style={styles.announcementMediaImage} />
            </View>
          ) : null}
        </SurfaceCard>
      )) : (
        showAnnouncementSection ? <SurfaceCard>
          <Caption>No announcements published yet.</Caption>
        </SurfaceCard> : null
      )}
      {showRulesSection ? (
      <SurfaceCard>
        <SectionHeader
          title="Policy and rule documents"
          description="Published rules and society policy notes are kept in one document section beneath the communications feed."
        />
      </SurfaceCard>
      ) : null}
      {showRulesSection ? rules.map((rule) => (
        <SurfaceCard key={rule.id}>
          <Text style={styles.cardTitle}>{rule.title}</Text>
          <Caption>{rule.version} - Published {formatShortDate(rule.publishedAt)}</Caption>
          {rule.summary ? <Caption>{rule.summary}</Caption> : null}
        </SurfaceCard>
      )) : null}
    </>
  );
}

function AdminDocuments({ societyId }: { societyId: string }) {
  const { state, actions } = useApp();
  const societyDocuments = getSocietyDocuments(state.data, societyId);
  const pendingDocumentDownloadRequests = getPendingSocietyDocumentDownloadRequests(state.data, societyId);
  const [documentCategory, setDocumentCategory] = useState<SocietyDocumentCategory>('liftLicense');
  const [documentTitle, setDocumentTitle] = useState('');
  const [documentSummary, setDocumentSummary] = useState('');
  const [documentIssuedOn, setDocumentIssuedOn] = useState('');
  const [documentValidUntil, setDocumentValidUntil] = useState('');
  const [documentFileName, setDocumentFileName] = useState('');
  const [documentFileDataUrl, setDocumentFileDataUrl] = useState('');
  const [documentUploadMessage, setDocumentUploadMessage] = useState('');

  async function handleSocietyDocumentSelection() {
    try {
      const selectedFile = await pickWebFileAsDataUrl({
        accept: 'application/pdf,image/png,image/jpeg,image/webp',
        maxSizeInBytes: 5 * 1024 * 1024,
        unsupportedMessage: 'Society document upload is currently available from the web workspace.',
        tooLargeMessage: 'Choose a document smaller than 5 MB.',
        readErrorMessage: 'Could not read the selected document.',
      });

      if (!selectedFile) {
        return;
      }

      setDocumentFileName(selectedFile.fileName);
      setDocumentFileDataUrl(selectedFile.dataUrl);
      setDocumentUploadMessage(`${selectedFile.fileName} is ready to publish for residents.`);
    } catch (error) {
      setDocumentUploadMessage(error instanceof Error ? error.message : 'Could not attach the document.');
    }
  }

  async function handleCreateSocietyDocument() {
    const saved = await actions.createSocietyDocument(societyId, {
      category: documentCategory,
      title: documentTitle,
      fileName: documentFileName,
      fileDataUrl: documentFileDataUrl,
      summary: documentSummary || undefined,
      issuedOn: documentIssuedOn || undefined,
      validUntil: documentValidUntil || undefined,
    });

    if (saved) {
      setDocumentCategory('liftLicense');
      setDocumentTitle('');
      setDocumentSummary('');
      setDocumentIssuedOn('');
      setDocumentValidUntil('');
      setDocumentFileName('');
      setDocumentFileDataUrl('');
      setDocumentUploadMessage('');
    }
  }

  return (
    <>
      <SectionHeader
        title="Documents workspace"
        description="Upload society office records, keep resident-facing compliance files organized, and review download approvals from one dedicated module."
      />
      <SurfaceCard>
        <View style={styles.metricGrid}>
          <MetricCard label="Published docs" value={String(societyDocuments.length)} tone="primary" />
          <MetricCard label="Pending approvals" value={String(pendingDocumentDownloadRequests.length)} tone="accent" />
        </View>
        <View style={styles.inlineSection}>
          <Caption>
            Use this workspace for shared records like common-light bills, legal documents, certificates, and other office files that residents may view or request to download.
          </Caption>
        </View>
      </SurfaceCard>

      <SurfaceCard>
        <SectionHeader
          title="Upload document"
          description="Publish resident-visible shared records like lift licenses, common-light bills, fire safety certificates, and other society office documents."
        />
        <View style={styles.inlineSection}>
          <Text style={styles.inlineTitle}>Document type</Text>
          <View style={styles.choiceRow}>
            {societyDocumentCategoryOptions.map((option) => (
              <ChoiceChip
                key={option.key}
                label={option.label}
                selected={documentCategory === option.key}
                onPress={() => setDocumentCategory(option.key)}
              />
            ))}
          </View>
        </View>
        <View style={styles.formGrid}>
          <View style={styles.formField}>
            <InputField
              label="Document title"
              value={documentTitle}
              onChangeText={setDocumentTitle}
              placeholder="Common-area electricity bill - March 2026"
            />
          </View>
          <View style={styles.formField}>
            <InputField
              label="Issue date"
              value={documentIssuedOn}
              onChangeText={setDocumentIssuedOn}
              nativeType="date"
            />
          </View>
          <View style={styles.formField}>
            <InputField
              label="Valid until / due date"
              value={documentValidUntil}
              onChangeText={setDocumentValidUntil}
              nativeType="date"
            />
          </View>
        </View>
        <InputField
          label="Resident note"
          value={documentSummary}
          onChangeText={setDocumentSummary}
          multiline
          placeholder="Explain what this record covers and when residents may need to refer to it."
        />
        <View style={styles.inlineSection}>
          <Text style={styles.inlineTitle}>Attachment</Text>
          <View style={styles.choiceRow}>
            <ActionButton
              label={documentFileDataUrl ? 'Replace file' : 'Upload file'}
              variant="secondary"
              onPress={() => {
                void handleSocietyDocumentSelection();
              }}
            />
            {documentFileDataUrl ? (
              <ActionButton
                label="Open file"
                variant="secondary"
                onPress={() => {
                  void openUploadedFileDataUrl(documentFileDataUrl);
                }}
              />
            ) : null}
            {documentFileDataUrl ? (
              <ActionButton
                label="Remove file"
                variant="danger"
                onPress={() => {
                  setDocumentFileName('');
                  setDocumentFileDataUrl('');
                  setDocumentUploadMessage('');
                }}
              />
            ) : null}
          </View>
          {documentFileName ? <Caption>{documentFileName}</Caption> : null}
          {documentUploadMessage ? <Caption>{documentUploadMessage}</Caption> : null}
        </View>
        <ActionButton
          label={state.isSyncing ? 'Uploading...' : 'Publish society document'}
          onPress={handleCreateSocietyDocument}
          disabled={state.isSyncing || !documentTitle.trim() || !documentFileName || !documentFileDataUrl}
        />
      </SurfaceCard>

      <SurfaceCard>
        <SectionHeader
          title="Resident download approval queue"
          description="Residents can view published records anytime, but downloadable copies need approval from this queue."
        />
        {pendingDocumentDownloadRequests.length > 0 ? pendingDocumentDownloadRequests.map((entry) => (
          <View key={entry.request.id} style={styles.requestCard}>
            <View style={styles.rowBetween}>
              <Text style={styles.cardTitle}>{entry.document?.title ?? 'Document request'}</Text>
              <Pill label="Pending approval" tone="warning" />
            </View>
            <Caption>
              Requested by {entry.requester?.name ?? 'Resident'}
              {entry.units.length > 0 ? ` | ${entry.units.map((unit) => unit.code).join(', ')}` : ''}
            </Caption>
            <Caption>
              Requested on {formatLongDate(entry.request.requestedAt)}
              {entry.document ? ` | File: ${entry.document.fileName}` : ''}
            </Caption>
            {entry.request.requestNote ? <Caption>Resident note: {entry.request.requestNote}</Caption> : null}
            <View style={styles.heroActions}>
              <ActionButton
                label={state.isSyncing ? 'Approving...' : 'Approve download'}
                onPress={() => {
                  void actions.reviewSocietyDocumentDownloadRequest(societyId, entry.request.id, {
                    decision: 'approve',
                  });
                }}
                disabled={state.isSyncing}
              />
              <ActionButton
                label="Reject"
                variant="secondary"
                onPress={() => {
                  void actions.reviewSocietyDocumentDownloadRequest(societyId, entry.request.id, {
                    decision: 'reject',
                  });
                }}
                disabled={state.isSyncing}
              />
            </View>
          </View>
        )) : (
          <Caption>No resident download approvals are waiting right now.</Caption>
        )}
      </SurfaceCard>

      {societyDocuments.length > 0 ? societyDocuments.map((document) => (
        <SurfaceCard key={document.id}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>{document.title}</Text>
            <Pill label={humanizeSocietyDocumentCategory(document.category)} tone="accent" />
          </View>
          <Caption>{document.fileName}</Caption>
          {document.summary ? <Caption>{document.summary}</Caption> : null}
          <Caption>
            Uploaded {formatLongDate(document.uploadedAt)}
            {document.issuedOn ? ` | Issued ${document.issuedOn}` : ''}
            {document.validUntil ? ` | Valid until ${document.validUntil}` : ''}
          </Caption>
          <View style={styles.heroActions}>
            <ActionButton
              label="Open document"
              variant="secondary"
              onPress={() => {
                void openUploadedFileDataUrl(document.fileDataUrl);
              }}
            />
          </View>
        </SurfaceCard>
      )) : (
        <SurfaceCard>
          <Caption>No compliance or utility records uploaded yet.</Caption>
        </SurfaceCard>
      )}
    </>
  );
}

type AdminAuditFocus = 'all' | 'today' | 'latest';

function AdminAudit({ societyId }: { societyId: string }) {
  const { state } = useApp();
  const [auditFocus, setAuditFocus] = useState<AdminAuditFocus>('all');
  const events = getAuditEvents(state.data, societyId);
  const todayPrefix = new Date().toISOString().slice(0, 10);
  const todayEvents = events.filter((event) => event.createdAt.slice(0, 10) === todayPrefix).length;
  const visibleEvents = auditFocus === 'today'
    ? events.filter((event) => event.createdAt.slice(0, 10) === todayPrefix)
    : auditFocus === 'latest'
      ? events.slice(0, 1)
      : events;

  return (
    <>
      <SectionHeader
        title="Audit hub"
        description="Review durable logs for announcements, money movement, complaints, and security activity from one summarized audit timeline."
      />
      <SurfaceCard>
        <View style={styles.metricGrid}>
          <MetricCard label={auditFocus === 'all' ? 'Total events - selected' : 'Total events'} value={String(events.length)} tone="primary" onPress={() => setAuditFocus('all')} />
          <MetricCard label={auditFocus === 'today' ? 'Today - selected' : 'Today'} value={String(todayEvents)} tone="accent" onPress={() => setAuditFocus((current) => (current === 'today' ? 'all' : 'today'))} />
          <MetricCard label={auditFocus === 'latest' ? 'Latest event - selected' : 'Latest event'} value={events[0] ? formatShortDate(events[0].createdAt) : 'None'} tone="blue" onPress={() => setAuditFocus((current) => (current === 'latest' ? 'all' : 'latest'))} />
        </View>
        <View style={styles.inlineSection}>
          <Caption>
            The audit feed below keeps a durable view of operational actions across communication, collections, complaints, and security workflows.
          </Caption>
        </View>
      </SurfaceCard>
      <SurfaceCard>
        <SectionHeader
          title="Audit timeline"
          description={auditFocus === 'all' ? 'Durable logs for notices, money movement, complaints, and security actions.' : auditFocus === 'today' ? `Showing ${visibleEvents.length} event${visibleEvents.length === 1 ? '' : 's'} from today.` : 'Showing the latest recorded admin event.'}
        />
      </SurfaceCard>
      {visibleEvents.map((event) => (
        <SurfaceCard key={event.id}>
          <Text style={styles.cardTitle}>{event.title}</Text>
          <Caption>{event.subtitle}</Caption>
          <Caption>{formatLongDate(event.createdAt)}</Caption>
        </SurfaceCard>
      ))}
    </>
  );
}

type AdminMeetingsSection = 'list' | 'create' | 'detail';

function AdminMeetings({ societyId, userId }: { societyId: string; userId: string }) {
  const { state, actions } = useApp();
  const meetings = getMeetingsForSociety(state.data, societyId);
  const [activeSection, setActiveSection] = useState<AdminMeetingsSection>('list');
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);

  // Create meeting form
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingType, setMeetingType] = useState<'society' | 'committee' | 'emergency'>('society');
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingTime, setMeetingTime] = useState('18:00');
  const [meetingVenue, setMeetingVenue] = useState('');
  const [meetingSummary, setMeetingSummary] = useState('');

  // Agenda form
  const [agendaTitle, setAgendaTitle] = useState('');
  const [agendaDescription, setAgendaDescription] = useState('');
  const [agendaRequiresVoting, setAgendaRequiresVoting] = useState(false);

  const meetingTypeOptions: Array<{ key: 'society' | 'committee' | 'emergency'; label: string }> = [
    { key: 'society', label: 'Society Meeting' },
    { key: 'committee', label: 'Committee Meeting' },
    { key: 'emergency', label: 'Emergency Meeting' },
  ];

  const selectedMeeting = selectedMeetingId
    ? meetings.find((m) => m.id === selectedMeetingId) ?? null
    : null;
  const agendaItems = selectedMeetingId
    ? getMeetingAgendaItems(state.data, selectedMeetingId)
    : [];
  const signatures = selectedMeetingId
    ? getMeetingSignatures(state.data, selectedMeetingId)
    : [];

  async function handleCreateMeeting() {
    if (!meetingTitle.trim() || !meetingDate || !meetingVenue.trim()) {
      return;
    }

    const saved = await actions.createSocietyMeeting(societyId, {
      title: meetingTitle,
      meetingType,
      scheduledAt: new Date(`${meetingDate}T${meetingTime || '00:00'}`).toISOString(),
      venue: meetingVenue,
      summary: meetingSummary || undefined,
    });

    if (saved) {
      setMeetingTitle('');
      setMeetingDate('');
      setMeetingTime('18:00');
      setMeetingVenue('');
      setMeetingSummary('');
      setActiveSection('list');
    }
  }

  async function handleAddAgendaItem() {
    if (!selectedMeetingId || !agendaTitle.trim()) {
      return;
    }

    const saved = await actions.addMeetingAgendaItem(societyId, selectedMeetingId, {
      title: agendaTitle,
      description: agendaDescription || undefined,
      requiresVoting: agendaRequiresVoting,
    });

    if (saved) {
      setAgendaTitle('');
      setAgendaDescription('');
      setAgendaRequiresVoting(false);
    }
  }

  async function handleCompleteMeeting() {
    if (!selectedMeetingId) {
      return;
    }

    await actions.completeSocietyMeeting(societyId, selectedMeetingId);
  }

  const scheduledCount = meetings.filter((m) => m.status === 'scheduled').length;
  const completedCount = meetings.filter((m) => m.status === 'completed').length;

  if (activeSection === 'create') {
    return (
      <>
        <SectionHeader
          title="Schedule a meeting"
          description="Add a society meeting with type, venue, and agenda items."
        />
        <SurfaceCard>
          <View style={styles.inlineSection}>
            <Caption>Meeting type</Caption>
            <View style={styles.chipRow}>
              {meetingTypeOptions.map((option) => (
                <ChoiceChip
                  key={option.key}
                  label={option.label}
                  selected={meetingType === option.key}
                  onPress={() => setMeetingType(option.key)}
                />
              ))}
            </View>
          </View>
          <InputField
            label="Meeting title"
            value={meetingTitle}
            onChangeText={setMeetingTitle}
            placeholder="e.g. Annual General Meeting 2026"
          />
          <DateTimeField
            label="Date"
            value={meetingDate}
            onChangeText={setMeetingDate}
            placeholder="Select date"
            mode="date"
          />
          <DateTimeField
            label="Time (HH:MM)"
            value={meetingTime}
            onChangeText={setMeetingTime}
            placeholder="18:00"
            mode="time"
          />
          <InputField
            label="Venue"
            value={meetingVenue}
            onChangeText={setMeetingVenue}
            placeholder="e.g. Clubhouse Hall, Ground Floor"
          />
          <InputField
            label="Summary (optional)"
            value={meetingSummary}
            onChangeText={setMeetingSummary}
            placeholder="Brief description of the meeting purpose"
            multiline
          />
          <View style={styles.rowBetween}>
            <ActionButton label="Cancel" onPress={() => setActiveSection('list')} variant="secondary" />
            <ActionButton
              label={state.isSyncing ? 'Saving...' : 'Create meeting'}
              onPress={handleCreateMeeting}
              disabled={state.isSyncing || !meetingTitle.trim() || !meetingDate || !meetingVenue.trim()}
            />
          </View>
        </SurfaceCard>
      </>
    );
  }

  if (activeSection === 'detail' && selectedMeeting) {
    return (
      <>
        <SectionHeader
          title={selectedMeeting.title}
          description={`${humanizeMeetingType(selectedMeeting.meetingType)} · ${selectedMeeting.venue}`}
        />
        <SurfaceCard>
          <View style={styles.metricGrid}>
            <MetricCard label="Status" value={humanizeMeetingStatus(selectedMeeting.status)} tone={getMeetingStatusTone(selectedMeeting.status) as 'primary' | 'accent'} />
            <MetricCard label="Agenda items" value={String(agendaItems.length)} tone="blue" />
            <MetricCard label="Signatures" value={String(signatures.length)} tone="primary" />
          </View>
          {selectedMeeting.summary ? (
            <View style={styles.inlineSection}>
              <Caption>{selectedMeeting.summary}</Caption>
            </View>
          ) : null}
          <View style={styles.rowBetween}>
            <ActionButton label="Back to list" onPress={() => { setActiveSection('list'); setSelectedMeetingId(null); }} variant="secondary" />
            {selectedMeeting.status === 'scheduled' ? (
              <ActionButton label="Mark completed" onPress={handleCompleteMeeting} variant="secondary" />
            ) : null}
          </View>
        </SurfaceCard>

        <SurfaceCard>
          <SectionHeader
            title="Agenda items"
            description="Add agenda points for discussion. Enable voting on items that need a resolution."
          />
          {agendaItems.length > 0 ? (
            agendaItems.map((item) => {
              const votes = getMeetingVotesForItem(state.data, item.id);
              const yesVotes = votes.filter((v) => v.vote === 'yes').length;
              const noVotes = votes.filter((v) => v.vote === 'no').length;
              const abstainVotes = votes.filter((v) => v.vote === 'abstain').length;

              return (
                <View key={item.id} style={styles.meetingAgendaRow}>
                  <View style={styles.meetingAgendaRowLeft}>
                    <Text style={styles.meetingAgendaTitle}>{item.sortOrder}. {item.title}</Text>
                    {item.description ? <Caption>{item.description}</Caption> : null}
                    {item.requiresVoting ? (
                      <View style={styles.meetingVoteTally}>
                        <Caption>
                          Voting: {item.votingStatus === 'notRequired' ? 'Not required' : item.votingStatus}
                          {item.resolution ? ` · ${item.resolution.toUpperCase()}` : ''}
                        </Caption>
                        {item.votingStatus !== 'notRequired' ? (
                          <Caption>Yes {yesVotes} · No {noVotes} · Abstain {abstainVotes}</Caption>
                        ) : null}
                      </View>
                    ) : null}
                  </View>
                  <View style={styles.meetingAgendaActions}>
                    {item.requiresVoting && item.votingStatus === 'pending' ? (
                      <ActionButton label="Open voting" onPress={() => actions.openMeetingVoting(societyId, item.id)} variant="secondary" />
                    ) : null}
                    {item.requiresVoting && item.votingStatus === 'open' ? (
                      <>
                        <ActionButton label="Pass" onPress={() => actions.closeMeetingVoting(societyId, item.id, 'passed')} variant="secondary" />
                        <ActionButton label="Reject" onPress={() => actions.closeMeetingVoting(societyId, item.id, 'rejected')} variant="danger" />
                        <ActionButton label="Defer" onPress={() => actions.closeMeetingVoting(societyId, item.id, 'deferred')} variant="ghost" />
                      </>
                    ) : null}
                  </View>
                </View>
              );
            })
          ) : (
            <Caption>No agenda items added yet. Add the first agenda point below.</Caption>
          )}
        </SurfaceCard>

        <SurfaceCard>
          <SectionHeader title="Add agenda item" description="Add a discussion point or a voting resolution." />
          <InputField
            label="Agenda title"
            value={agendaTitle}
            onChangeText={setAgendaTitle}
            placeholder="e.g. Approval of maintenance hike"
          />
          <InputField
            label="Description (optional)"
            value={agendaDescription}
            onChangeText={setAgendaDescription}
            placeholder="Further context or background for this item"
            multiline
          />
          <View style={styles.inlineSection}>
            <Caption>Requires resident voting?</Caption>
            <View style={styles.chipRow}>
              <ChoiceChip label="Yes, voting required" selected={agendaRequiresVoting} onPress={() => setAgendaRequiresVoting(true)} />
              <ChoiceChip label="No voting" selected={!agendaRequiresVoting} onPress={() => setAgendaRequiresVoting(false)} />
            </View>
          </View>
          <ActionButton
            label="Add agenda item"
            onPress={handleAddAgendaItem}
            disabled={!agendaTitle.trim()}
          />
        </SurfaceCard>

        <SurfaceCard>
          <SectionHeader
            title="Digital signatures"
            description={`${signatures.length} resident(s) have digitally signed this meeting.`}
          />
          {signatures.length > 0 ? (
            signatures.map((sign) => {
              const signUser = state.data.users.find((u) => u.id === sign.userId);
              return (
                <View key={sign.id} style={styles.meetingSignRow}>
                  <Text style={styles.meetingSignName}>{sign.signatureText}</Text>
                  <Caption>{signUser?.name ?? sign.userId} · {formatShortDate(sign.signedAt)}</Caption>
                </View>
              );
            })
          ) : (
            <Caption>No digital signatures yet. Residents can sign from their Meetings section.</Caption>
          )}
        </SurfaceCard>
      </>
    );
  }

  // Default: list view
  return (
    <>
      <SectionHeader
        title="Society meetings hub"
        description="Schedule AGMs, SGMs, and committee meetings. Add agenda items, enable resident voting, and collect digital signatures."
      />
      <SurfaceCard>
        <View style={styles.metricGrid}>
          <MetricCard label="Total meetings" value={String(meetings.length)} tone="primary" onPress={() => { setSelectedMeetingId(null); setActiveSection('list'); }} />
          <MetricCard label="Scheduled" value={String(scheduledCount)} tone="accent" onPress={() => {
            const nextMeeting = meetings.find((meeting) => meeting.status === 'scheduled');
            if (!nextMeeting) {
              setSelectedMeetingId(null);
              setActiveSection('list');
              return;
            }

            setSelectedMeetingId(nextMeeting.id);
            setActiveSection('detail');
          }} />
          <MetricCard label="Completed" value={String(completedCount)} tone="primary" onPress={() => {
            const nextMeeting = meetings.find((meeting) => meeting.status === 'completed');
            if (!nextMeeting) {
              setSelectedMeetingId(null);
              setActiveSection('list');
              return;
            }

            setSelectedMeetingId(nextMeeting.id);
            setActiveSection('detail');
          }} />
        </View>
        <ActionButton label="Schedule new meeting" onPress={() => setActiveSection('create')} />
      </SurfaceCard>

      {meetings.length > 0 ? (
        <SurfaceCard>
          {meetings.map((meeting, index) => {
            const items = getMeetingAgendaItems(state.data, meeting.id);
            const openVotingCount = items.filter((item) => item.votingStatus === 'open').length;

            return (
              <Pressable
                key={meeting.id}
                onPress={() => { setSelectedMeetingId(meeting.id); setActiveSection('detail'); }}
                style={[
                  styles.meetingListRow,
                  index < meetings.length - 1 ? styles.meetingListRowDivider : null,
                ]}
              >
                <View style={styles.meetingListRowLeft}>
                  <View style={styles.meetingListTopRow}>
                    <Pill label={humanizeMeetingType(meeting.meetingType)} tone={meeting.meetingType === 'society' ? 'accent' : meeting.meetingType === 'emergency' ? 'warning' : 'neutral'} />
                    <Pill label={humanizeMeetingStatus(meeting.status)} tone={getMeetingStatusTone(meeting.status) as 'primary' | 'accent' | 'warning' | 'success'} />
                  </View>
                  <Text style={styles.meetingListTitle}>{meeting.title}</Text>
                  <Caption>{meeting.venue} · {formatShortDate(meeting.scheduledAt)}</Caption>
                  {openVotingCount > 0 ? <Caption>{openVotingCount} open vote(s)</Caption> : null}
                </View>
                <Text style={styles.meetingListChevron}>›</Text>
              </Pressable>
            );
          })}
        </SurfaceCard>
      ) : (
        <SurfaceCard>
          <Caption>No society meetings have been scheduled yet. Create the first one above.</Caption>
        </SurfaceCard>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  compactWorkspaceCard: {
    gap: spacing.xs,
    backgroundColor: '#FFF8F0',
  },
  compactWorkspaceTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  compactWorkspaceTitleWrap: {
    flex: 1,
    gap: spacing.xs,
  },
  compactWorkspaceTitle: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '900',
    color: palette.ink,
  },
  compactWorkspaceStatsRow: {
    flexDirection: 'row',
    gap: 4,
    width: '100%',
  },
  compactWorkspaceStat: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8DCCB',
    backgroundColor: '#FFFDF9',
    alignItems: 'center',
    gap: 2,
  },
  compactWorkspaceStatValue: {
    fontSize: 16,
    fontWeight: '800',
    color: palette.accent,
  },
  compactWorkspaceActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  adminFocusPanel: {
    backgroundColor: '#FFFCF8',
  },
  adminDashboardHero: {
    gap: spacing.lg,
    backgroundColor: '#FFF8F0',
  },
  adminDashboardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  adminDashboardCopy: {
    flex: 1,
    minWidth: 260,
    gap: spacing.sm,
  },
  adminDashboardTitle: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
    color: palette.ink,
  },
  adminDashboardDescription: {
    maxWidth: 640,
  },
  adminDashboardMeta: {
    minWidth: 138,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E8D9C7',
    backgroundColor: '#FFF6E8',
    alignItems: 'center',
    gap: 2,
  },
  adminDashboardMetaValue: {
    fontSize: 28,
    fontWeight: '800',
    color: palette.warning,
  },
  adminDashboardMetaText: {
    textAlign: 'center',
  },
  adminSignalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  adminSignalCard: {
    flexGrow: 1,
    flexBasis: 220,
    minWidth: 220,
    padding: spacing.md,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E8D9C7',
    backgroundColor: '#FFFDF9',
    gap: spacing.xs,
    ...shadow.card,
  },
  adminSignalLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: palette.mutedInk,
  },
  adminSignalValue: {
    fontSize: 32,
    fontWeight: '800',
    color: palette.ink,
  },
  adminQuickLaunchGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  adminQuickLaunchCard: {
    flexGrow: 1,
    flexBasis: 220,
    minWidth: 220,
    padding: spacing.md,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E7D9C6',
    backgroundColor: '#FFFDF9',
    gap: spacing.sm,
    ...shadow.card,
  },
  adminQuickLaunchTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: palette.ink,
  },
  adminQuickLaunchLink: {
    fontSize: 13,
    fontWeight: '800',
    color: palette.accent,
  },
  adminPanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  adminPanelHeaderCopy: {
    flex: 1,
    minWidth: 260,
  },
  adminNavigationCard: {
    gap: spacing.md,
    backgroundColor: '#FFFAF4',
  },
  moduleHeroCard: {
    gap: spacing.md,
    backgroundColor: '#FFF8F0',
  },
  moduleHeroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  moduleHeroTitleWrap: {
    flex: 1,
    minWidth: 240,
    gap: spacing.sm,
  },
  moduleHeroTitle: {
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '800',
    color: palette.ink,
  },
  moduleHeroStats: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  moduleHeroStatChip: {
    minWidth: 92,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: '#FFF1E3',
    borderWidth: 1,
    borderColor: '#F0D9BF',
    alignItems: 'center',
    gap: 2,
  },
  moduleHeroStatValue: {
    fontSize: 18,
    fontWeight: '800',
    color: palette.accent,
  },
  moduleHeroStatLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: palette.mutedInk,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroActions: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  compactTitle: { fontSize: 16, fontWeight: '800', color: palette.ink },
  compactText: { flex: 1, gap: spacing.xs },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  cardTitle: { fontSize: 18, fontWeight: '800', color: palette.ink, flex: 1 },
  requestCard: { gap: spacing.sm, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: '#F0E5D8' },
  leadershipRoster: { gap: spacing.sm },
  leadershipMemberCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E8DDCF',
    backgroundColor: '#FFF8F1',
  },
  recommendationGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  recommendationCard: {
    flexGrow: 1,
    flexBasis: 260,
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: 22,
    backgroundColor: '#FFF7EE',
    borderWidth: 1,
    borderColor: '#E6D8C6',
    ...shadow.card,
  },
  recommendationTitle: { fontSize: 16, fontWeight: '800', color: palette.ink },
  residentUnitGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  residentUnitTile: {
    flexGrow: 1,
    flexBasis: 220,
    minWidth: 180,
    maxWidth: 260,
    backgroundColor: '#FFFBF7',
    borderRadius: 18,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 4,
    borderWidth: 1,
    borderColor: '#E8DDCF',
    ...shadow.card,
  },
  residentUnitTileActive: { borderColor: '#F0C07C', backgroundColor: '#FFF5E8' },
  residentUnitTilePressed: { opacity: 0.9 },
  residentUnitTileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  residentUnitHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  residentUnitCode: { fontSize: 17, fontWeight: '800', color: palette.ink },
  residentUnitBuilding: { fontSize: 12, fontWeight: '700', color: palette.mutedInk },
  residentUnitResidents: { fontSize: 13, lineHeight: 18, color: palette.mutedInk },
  residentExpandedCard: { gap: spacing.md },
  interactiveCard: {
    backgroundColor: '#FFFBF7',
    borderRadius: 24,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: '#E8DDCF',
    ...shadow.card,
  },
  interactiveCardActive: { borderColor: '#F0C07C', backgroundColor: '#FFF5E8' },
  interactiveCardPressed: { opacity: 0.9 },
  templateGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, paddingTop: spacing.sm },
  templateCard: { flexGrow: 1, flexBasis: 240, minWidth: 240 },
  officeStatusChipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  officeStatusChip: {
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderWidth: 1,
    backgroundColor: palette.white,
  },
  officeStatusChipPressed: { opacity: 0.88 },
  officeStatusChipLabel: { fontSize: 13, fontWeight: '700' },
  detailStack: { gap: spacing.md, paddingTop: spacing.sm },
  residentDetailGrid: { gap: spacing.sm, paddingTop: spacing.xs },
  residentDetailGridWide: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start' },
  residentDetailPanel: {
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: 18,
    backgroundColor: '#FFF9F2',
    borderWidth: 1,
    borderColor: '#E7DDD0',
  },
  residentDetailPanelWide: {
    flexGrow: 1,
    flexBasis: 280,
    minWidth: 260,
  },
  residentDetailList: { gap: spacing.sm },
  residentDetailItem: {
    gap: 4,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#F0E5D8',
  },
  detailPanel: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: 20,
    backgroundColor: '#FFF9F2',
    borderWidth: 1,
    borderColor: '#E7DDD0',
  },
  detailTitle: { fontSize: 15, fontWeight: '800', color: palette.ink },
  formGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  formField: { flexGrow: 1, flexBasis: 220 },
  deleteZone: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: palette.border,
    gap: spacing.sm,
  },
  deleteWarningText: {
    color: palette.danger,
  },
  qrPreviewPanel: { alignSelf: 'flex-start', padding: spacing.sm, borderRadius: 18, backgroundColor: palette.white, borderWidth: 1, borderColor: '#E7DDD0', ...shadow.card },
  qrPreviewImage: { width: 180, height: 180, borderRadius: 14, backgroundColor: '#F4F1EB' },
  proofCard: { alignSelf: 'flex-start', padding: spacing.xs, borderRadius: 18, backgroundColor: palette.white, borderWidth: 1, borderColor: '#E7DDD0', ...shadow.card },
  proofImage: { width: 180, height: 220, borderRadius: 14, backgroundColor: '#F4F1EB' },
  helpdeskUpdateImage: { width: 220, height: 160, borderRadius: 14, backgroundColor: '#F4F1EB' },
  announcementMediaCard: { marginTop: spacing.sm, alignSelf: 'stretch', maxWidth: 420, padding: spacing.xs, borderRadius: 18, backgroundColor: palette.white, borderWidth: 1, borderColor: '#E7DDD0', ...shadow.card },
  announcementMediaImage: { width: '100%', height: 220, borderRadius: 14, backgroundColor: '#F4F1EB' },
  choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  inlineSection: { gap: spacing.xs, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: '#F0E5D8' },
  inlineTitle: { fontSize: 15, fontWeight: '800', color: palette.ink },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  meetingListRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  meetingListRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  meetingListRowLeft: { flex: 1, gap: spacing.xs },
  meetingListTopRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  meetingListTitle: { fontSize: 15, fontWeight: '700', color: palette.ink },
  meetingListChevron: { fontSize: 20, color: palette.mutedInk },
  meetingAgendaRow: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#F0E8DF',
    gap: spacing.xs,
  },
  meetingAgendaRowLeft: { gap: 2 },
  meetingAgendaTitle: { fontSize: 14, fontWeight: '700', color: palette.ink },
  meetingVoteTally: { gap: 2, marginTop: 2 },
  meetingAgendaActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs },
  meetingSignRow: {
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: '#F0E8DF',
    gap: 2,
  },
  meetingSignName: { fontSize: 14, fontWeight: '700', color: palette.ink, fontStyle: 'italic' },
});

function humanizeSocietyDocumentCategory(category: SocietyDocumentCategory) {
  switch (category) {
    case 'liftLicense':
      return 'Lift license';
    case 'commonLightBill':
      return 'Common light bill';
    case 'waterBill':
      return 'Water bill';
    case 'fireSafety':
      return 'Fire safety';
    case 'insurance':
      return 'Insurance';
    case 'auditReport':
      return 'Audit report';
    case 'other':
    default:
      return 'Other document';
  }
}

function humanizeAnnouncementAudience(audience: AnnouncementAudience) {
  switch (audience) {
    case 'residents':
      return 'Residents';
    case 'owners':
      return 'Owners';
    case 'tenants':
      return 'Tenants';
    case 'committee':
      return 'Committee';
    case 'all':
    default:
      return 'All members';
  }
}

function humanizeAnnouncementPriority(priority: AnnouncementPriority) {
  switch (priority) {
    case 'critical':
      return 'Critical';
    case 'high':
      return 'High';
    case 'normal':
    default:
      return 'Normal';
  }
}

function getAnnouncementPriorityTone(priority: AnnouncementPriority) {
  switch (priority) {
    case 'critical':
      return 'warning' as const;
    case 'high':
      return 'accent' as const;
    case 'normal':
    default:
      return 'primary' as const;
  }
}

async function pickWebImageAsDataUrl() {
  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    throw new Error('QR upload is available from the web workspace right now.');
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
        reject(new Error('Choose a QR image smaller than 2 MB.'));
        return;
      }

      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => reject(new Error('Could not read the selected QR image.'));
      reader.readAsDataURL(file);
    };

    input.click();
  });
}

async function tryDecodeQrPayloadFromDataUrl(dataUrl: string) {
  if (
    Platform.OS !== 'web' ||
    typeof window === 'undefined' ||
    typeof fetch === 'undefined' ||
    typeof createImageBitmap === 'undefined'
  ) {
    return null;
  }

  const windowWithBarcodeDetector = window as typeof window & {
    BarcodeDetector?: new (options?: { formats?: string[] }) => {
      detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue?: string }>>;
    };
  };

  if (!windowWithBarcodeDetector.BarcodeDetector) {
    return null;
  }

  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const bitmap = await createImageBitmap(blob);

  try {
    const detector = new windowWithBarcodeDetector.BarcodeDetector({ formats: ['qr_code'] });
    const detectedCodes = await detector.detect(bitmap);
    const rawValue = detectedCodes.find((code) => code.rawValue?.trim())?.rawValue?.trim();
    return rawValue || null;
  } finally {
    if (typeof bitmap.close === 'function') {
      bitmap.close();
    }
  }
}

async function openWhatsappReceipt(receipt: ReturnType<typeof buildMaintenanceReceiptDetails>) {
  if (!receipt?.whatsappPhone) {
    return false;
  }

  const whatsappUrl = `https://wa.me/${receipt.whatsappPhone}?text=${encodeURIComponent(
    buildMaintenanceReceiptWhatsappMessage(receipt),
  )}`;

  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
      return true;
    }

    await Linking.openURL(whatsappUrl);
    return true;
  } catch (error) {
    return false;
  }
}

async function prepareReceiptWhatsappBundle(receipt: ReturnType<typeof buildMaintenanceReceiptDetails>) {
  if (!receipt) {
    return 'Receipt details are not available for this payment yet.';
  }

  const shareResult = await shareMaintenanceReceiptPdfWithMessage(receipt);

  if (shareResult === 'shared') {
    return `Share sheet opened for ${receipt.residentLabel}. Choose WhatsApp there to send the PDF attachment with the message together.`;
  }

  if (shareResult === 'cancelled') {
    return 'Receipt sharing was cancelled.';
  }

  const pdfReady = await downloadMaintenanceReceiptPdf(receipt);
  const whatsappOpened = await openWhatsappReceipt(receipt);

  if (shareResult === 'unsupported' && pdfReady && whatsappOpened) {
    return `This browser cannot attach the PDF directly to WhatsApp from the page, so the PDF was downloaded and WhatsApp text was opened separately for ${receipt.residentLabel}.`;
  }

  if (pdfReady && whatsappOpened) {
    return `Receipt PDF downloaded and WhatsApp opened for ${receipt.residentLabel}. Attach the downloaded PDF file in the chat and send it.`;
  }

  if (pdfReady) {
    return `Receipt PDF downloaded for ${receipt.residentLabel}, but WhatsApp could not be opened on this device.`;
  }

  if (whatsappOpened) {
    return `WhatsApp opened for ${receipt.residentLabel}, but the PDF download could not be prepared.`;
  }

  return 'Could not prepare the PDF or open WhatsApp on this device.';
}

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function nowDateTimeString(hour: number) {
  const value = new Date();
  value.setHours(hour, 0, 0, 0);
  return value.toISOString().slice(0, 16);
}

function getNextBillingCycleSummary(plan: {
  frequency: 'monthly' | 'quarterly';
  dueDay: number;
  amountInr: number;
}) {
  const referenceDate = new Date();
  const cycleMonthSpan = plan.frequency === 'quarterly' ? 3 : 1;
  const currentCycleStartMonth =
    plan.frequency === 'quarterly'
      ? Math.floor(referenceDate.getUTCMonth() / 3) * 3
      : referenceDate.getUTCMonth();
  const currentCycleStart = new Date(Date.UTC(referenceDate.getUTCFullYear(), currentCycleStartMonth, 1));
  const nextCycleStart = new Date(
    Date.UTC(currentCycleStart.getUTCFullYear(), currentCycleStart.getUTCMonth() + cycleMonthSpan, 1),
  );
  const rolloverDate = new Date(Date.UTC(nextCycleStart.getUTCFullYear(), nextCycleStart.getUTCMonth(), 0));
  const dueDate = new Date(
    Date.UTC(
      nextCycleStart.getUTCFullYear(),
      nextCycleStart.getUTCMonth(),
      Math.min(28, Math.max(1, Number.parseInt(String(plan.dueDay ?? ''), 10) || 10)),
    ),
  );
  const periodLabel = new Intl.DateTimeFormat('en-IN', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(nextCycleStart);

  return {
    frequency: plan.frequency,
    periodLabel,
    rolloverDate: rolloverDate.toISOString().slice(0, 10),
    dueDate: dueDate.toISOString().slice(0, 10),
    amountInr: plan.amountInr,
  };
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

function isOfficeMaintenanceDue(status: OfficeMaintenanceState) {
  return status === 'pending' || status === 'overdue';
}

function humanizeOfficeMaintenanceState(status: OfficeMaintenanceState) {
  switch (status) {
    case 'paid':
      return 'Paid';
    case 'overdue':
      return 'Overdue';
    case 'pending':
      return 'Pending';
    case 'unbilled':
    default:
      return 'No cycle yet';
  }
}

function getOfficeMaintenanceBadgeLabel(status: OfficeMaintenanceState, unpaidCount: number) {
  if (isOfficeMaintenanceDue(status)) {
    return `${unpaidCount} unpaid ${unpaidCount === 1 ? 'invoice' : 'invoices'}`;
  }

  return humanizeOfficeMaintenanceState(status);
}

function getOfficeMaintenanceBadgeTone(status: OfficeMaintenanceState) {
  switch (status) {
    case 'paid':
      return 'success' as const;
    case 'overdue':
      return 'warning' as const;
    case 'pending':
      return 'accent' as const;
    case 'unbilled':
    default:
      return 'neutral' as const;
  }
}

function getOfficeStatusChipPalette(status: OfficeMaintenanceState) {
  switch (status) {
    case 'paid':
      return {
        borderColor: '#BFDAC9',
        backgroundColor: '#E6F4EC',
        textColor: palette.success,
        selectedBackground: palette.success,
      };
    case 'overdue':
    case 'pending':
    case 'unbilled':
      return {
        borderColor: '#E5C8C2',
        backgroundColor: '#F8E2DE',
        textColor: palette.danger,
        selectedBackground: palette.danger,
      };
    default:
      return {
        borderColor: palette.border,
        backgroundColor: palette.white,
        textColor: palette.ink,
        selectedBackground: palette.primary,
      };
  }
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

function humanizeVisitorCategory(category: 'guest' | 'family' | 'service' | 'delivery') {
  switch (category) {
    case 'family':
      return 'Family';
    case 'service':
      return 'Service';
    case 'delivery':
      return 'Delivery';
    case 'guest':
    default:
      return 'Guest';
  }
}

function humanizeVisitorPassStatus(status: 'scheduled' | 'checkedIn' | 'completed' | 'cancelled') {
  switch (status) {
    case 'checkedIn':
      return 'Checked in';
    case 'completed':
      return 'Completed';
    case 'cancelled':
      return 'Cancelled';
    case 'scheduled':
    default:
      return 'Scheduled';
  }
}

function getVisitorPassTone(status: 'scheduled' | 'checkedIn' | 'completed' | 'cancelled') {
  switch (status) {
    case 'checkedIn':
      return 'primary' as const;
    case 'completed':
      return 'success' as const;
    case 'cancelled':
      return 'accent' as const;
    case 'scheduled':
    default:
      return 'warning' as const;
  }
}

function getUnitClaimLabel(society: {
  structure: 'apartment' | 'bungalow' | 'commercial' | 'mixed';
  commercialSpaceType?: 'shed' | 'office' | null;
  enabledStructures?: Array<'apartment' | 'bungalow' | 'commercial'> | null;
}) {
  const enabledStructures = getEnabledStructures(society);

  if (enabledStructures.length > 1) {
    return 'unit or space';
  }

  if (enabledStructures[0] === 'commercial') {
    return society.commercialSpaceType === 'office' ? 'office space' : 'shed';
  }

  return enabledStructures[0] === 'bungalow' ? 'plot' : 'apartment';
}
