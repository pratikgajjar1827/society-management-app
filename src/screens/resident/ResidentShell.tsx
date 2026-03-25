import { useEffect, useMemo, useRef, useState } from 'react';
import { Image, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import {
  ActionButton,
  Caption,
  ChoiceChip,
  InputField,
  MetricCard,
  NavigationStrip,
  PageFrame,
  Pill,
  SectionHeader,
  SurfaceCard,
} from '../../components/ui';
import { ModuleGlyph } from '../../components/ModuleGlyph';
import { MaintenanceReceiptCard } from '../../components/MaintenanceReceiptCard';
import { ResidentHomeExperience } from './ResidentHomeExperience';
import { useApp } from '../../state/AppContext';
import { palette, radius, shadow, spacing } from '../../theme/tokens';
import { openPhoneDialer, openWhatsAppConversation, startRingAlert, stopRingAlert } from '../../utils/communication';
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
  getChatMessagesForThread,
  getBookingsForUserSociety,
  getComplaintUpdatesForComplaint,
  getComplaintsForUserSociety,
  getCommunityMembersForSociety,
  getCurrentUser,
  getDirectChatThreadsForUser,
  getEntryLogsForSociety,
  getGuardRosterForSociety,
  getImportantContactsForSociety,
  getMembershipForSociety,
  getPaymentRemindersForUser,
  getPendingSecurityGuestRequestsForResident,
  getPaymentsForUserSociety,
  getResidenceProfileForUserSociety,
  getResidentOverview,
  getRulesForSociety,
  getSocietyChatThread,
  getSecurityGuestConversationForRequest,
  getSecurityGuestRequestTone,
  getSelectedSociety,
  getSecurityGuestRequestsForResident,
  getStaffVerificationDirectory,
  getUnitsForSociety,
  getVehicleDirectoryForSociety,
  getVisitorPassesForUserSociety,
  humanizeRole,
  humanizeSecurityGuestLogAction,
  humanizeSecurityGuestRequestStatus,
} from '../../utils/selectors';
import {
  ComplaintCategory,
  ImportantContactCategory,
  PaymentMethod,
  SeedData,
  VehicleType,
  VisitorCategory,
} from '../../types/domain';

type ResidentTab = 'home' | 'visitors' | 'community' | 'billing' | 'notices' | 'bookings' | 'helpdesk' | 'profile';
type ResidentCommunitySection = 'members' | 'vehicles' | 'contacts' | 'staff' | 'chat';
type ResidentVisitorsSection = 'create' | 'approvals' | 'history' | 'desk';
type ResidentBillingSection = 'pay' | 'reminders' | 'outstanding' | 'history';
type ResidentBookingsSection = 'booking' | 'amenities' | 'history';
type ResidentProfileSection = 'household' | 'vehicles' | 'staff';
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
  { key: 'visitors', label: 'Visitors' },
  { key: 'community', label: 'Community' },
  { key: 'billing', label: 'Billing' },
  { key: 'notices', label: 'Notices' },
  { key: 'bookings', label: 'Bookings' },
  { key: 'helpdesk', label: 'Helpdesk' },
  { key: 'profile', label: 'Profile' },
];

const residentBottomTabs: Array<{
  key: 'home' | 'community' | 'bookings' | 'billing' | 'profile';
  label: string;
  badge: string;
}> = [
  { key: 'home', label: 'My Hood', badge: 'HM' },
  { key: 'community', label: 'Society', badge: 'SC' },
  { key: 'bookings', label: 'Services', badge: 'SV' },
  { key: 'billing', label: 'Bills', badge: 'BL' },
  { key: 'profile', label: 'Profile', badge: 'ME' },
];

const residentCommunitySections: Array<{ key: ResidentCommunitySection; label: string }> = [
  { key: 'members', label: 'Members' },
  { key: 'chat', label: 'Chats' },
  { key: 'vehicles', label: 'Vehicles' },
  { key: 'contacts', label: 'Important contacts' },
  { key: 'staff', label: 'Staff and security' },
];

const residentVisitorSections: Array<{ key: ResidentVisitorsSection; label: string }> = [
  { key: 'create', label: 'Create pass' },
  { key: 'approvals', label: 'Approvals' },
  { key: 'history', label: 'History' },
  { key: 'desk', label: 'Security desk' },
];

const residentBillingSections: Array<{ key: ResidentBillingSection; label: string }> = [
  { key: 'pay', label: 'Pay now' },
  { key: 'reminders', label: 'Reminders' },
  { key: 'outstanding', label: 'Outstanding' },
  { key: 'history', label: 'History' },
];

const residentBookingSections: Array<{ key: ResidentBookingsSection; label: string }> = [
  { key: 'booking', label: 'Book' },
  { key: 'amenities', label: 'Amenities' },
  { key: 'history', label: 'My bookings' },
];

const residentProfileSections: Array<{ key: ResidentProfileSection; label: string }> = [
  { key: 'household', label: 'Household' },
  { key: 'vehicles', label: 'Vehicles' },
  { key: 'staff', label: 'Staff' },
];

function getResidentBottomTabKey(
  activeTab: ResidentTab,
): 'home' | 'community' | 'bookings' | 'billing' | 'profile' {
  switch (activeTab) {
    case 'visitors':
      return 'home';
    case 'helpdesk':
      return 'bookings';
    case 'notices':
      return 'home';
    default:
      return activeTab as 'home' | 'community' | 'bookings' | 'billing' | 'profile';
  }
}

function getResidentTabDescription(activeTab: ResidentTab) {
  switch (activeTab) {
    case 'visitors':
      return 'Create visitor passes, share gate-ready details, and track arrivals and exits.';
    case 'community':
      return 'Browse resident directory, vehicles, important contacts, and staff records.';
    case 'billing':
      return 'Stay on top of maintenance dues, receipts, reminders, and payment history.';
    case 'notices':
      return 'Read society announcements, updates, and resident-facing policy information.';
    case 'bookings':
      return 'Manage amenity requests, schedules, and service-oriented daily actions.';
    case 'helpdesk':
      return 'Raise issues, track updates, and follow service requests to resolution.';
    case 'profile':
      return 'Update residence details, household staff, vehicles, and privacy preferences.';
    case 'home':
    default:
      return 'A cleaner society home experience built around the tasks residents use every day.';
  }
}

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

const visitorCategories = [
  { key: 'guest' as const, label: 'Guest' },
  { key: 'family' as const, label: 'Family' },
  { key: 'service' as const, label: 'Service' },
  { key: 'delivery' as const, label: 'Delivery' },
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
  const [preferredCommunitySection, setPreferredCommunitySection] = useState<ResidentCommunitySection>('members');
  const [preferredVisitorsSection, setPreferredVisitorsSection] = useState<ResidentVisitorsSection>('create');
  const [preferredBillingSection, setPreferredBillingSection] = useState<ResidentBillingSection>('pay');
  const [preferredBookingsSection, setPreferredBookingsSection] = useState<ResidentBookingsSection>('booking');
  const [preferredProfileSection, setPreferredProfileSection] = useState<ResidentProfileSection>('household');
  const { width } = useWindowDimensions();
  const isCompact = width < 768;

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
  const activeBottomTab = getResidentBottomTabKey(activeTab);

  return (
    <PageFrame
      footer={
        <View style={[styles.bottomNavigationCard, isCompact ? styles.bottomNavigationCardCompact : null]}>
          {residentBottomTabs.map((item) => {
            const isActive = activeBottomTab === item.key;

            return (
              <Pressable
                key={item.key}
                onPress={() => setActiveTab(item.key)}
                style={(state) => [
                  styles.bottomNavigationItem,
                  isCompact ? styles.bottomNavigationItemCompact : null,
                  isActive ? styles.bottomNavigationItemActive : null,
                  (state as { hovered?: boolean }).hovered ? styles.bottomNavigationItemHover : null,
                  state.pressed ? styles.bottomNavigationItemPressed : null,
                ]}
              >
                <View
                  style={[
                    styles.bottomNavigationBadge,
                    isCompact ? styles.bottomNavigationBadgeCompact : null,
                    isActive ? styles.bottomNavigationBadgeActive : null,
                  ]}
                >
                  <ModuleGlyph
                    module={item.badge}
                    color={isActive ? palette.white : palette.ink}
                    size="sm"
                  />
                </View>
                <Text
                  style={[
                    styles.bottomNavigationLabel,
                    isCompact ? styles.bottomNavigationLabelCompact : null,
                    isActive ? styles.bottomNavigationLabelActive : null,
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      }
    >
      {isCompact ? (
        <SurfaceCard style={styles.compactWorkspaceCard}>
          <View style={styles.compactWorkspaceTopRow}>
            <View style={styles.compactWorkspaceTitleWrap}>
              <Pill label="Resident" tone="accent" />
              <Text style={styles.compactWorkspaceTitle}>{society.name}</Text>
              <Caption>{user.name.split(' ')[0]} | {residentTabs.find((item) => item.key === activeTab)?.label ?? 'Home'}</Caption>
            </View>
            <View style={styles.compactWorkspaceStatsRow}>
              <View style={styles.compactWorkspaceStat}>
                <Text style={styles.compactWorkspaceStatValue}>{overview.unreadAnnouncements.length}</Text>
                <Caption>Unread</Caption>
              </View>
              <View style={styles.compactWorkspaceStat}>
                <Text style={styles.compactWorkspaceStatValue}>
                  {overview.myComplaints.filter((item) => item.status !== 'resolved').length}
                </Text>
                <Caption>Open</Caption>
              </View>
            </View>
          </View>
          <View style={styles.compactWorkspaceActionRow}>
            <ActionButton label="Societies" onPress={actions.goToWorkspaces} variant="secondary" />
            {canUseAdmin ? (
              <ActionButton label="Admin" onPress={actions.goToRoleSelection} variant="secondary" />
            ) : null}
          </View>
          <NavigationStrip items={residentTabs} activeKey={activeTab} onChange={setActiveTab} />
        </SurfaceCard>
      ) : null}

      {activeTab === 'home' ? (
        <ResidentHomeExperience
          societyId={society.id}
          userId={user.id}
          canUseAdmin={canUseAdmin}
          onOpenTab={setActiveTab}
          onOpenCommunitySection={(section) => {
            setPreferredCommunitySection(section);
            setActiveTab('community');
          }}
          onOpenVisitorsSection={(section) => {
            setPreferredVisitorsSection(section);
            setActiveTab('visitors');
          }}
          onOpenBillingSection={(section) => {
            setPreferredBillingSection(section);
            setActiveTab('billing');
          }}
          onOpenBookingsSection={(section) => {
            setPreferredBookingsSection(section);
            setActiveTab('bookings');
          }}
          onOpenProfileSection={(section) => {
            setPreferredProfileSection(section);
            setActiveTab('profile');
          }}
          onOpenWorkspaces={actions.goToWorkspaces}
          onSwitchAdmin={actions.goToRoleSelection}
        />
      ) : null}

      {!isCompact && activeTab !== 'home' ? (
        <SurfaceCard style={styles.moduleHeroCard}>{/*
        eyebrow={`${society.name} · Resident view`}
        title={`Hello ${user.name.split(' ')[0]}, your day starts here.`}
        subtitle="Resident navigation prioritizes dues, notices, helpdesk, bookings, and household management."
      */}
        <View style={styles.moduleHeroTopRow}>
          <View style={styles.moduleHeroTitleWrap}>
            <Pill label="Resident workspace" tone="accent" />
            <Text style={styles.moduleHeroTitle}>
              {residentTabs.find((item) => item.key === activeTab)?.label ?? 'Resident'} dashboard
            </Text>
            <Caption>
              {society.name} | {getResidentTabDescription(activeTab)}
            </Caption>
          </View>
          <View style={styles.moduleHeroStats}>
            <View style={styles.moduleHeroStatChip}>
              <Text style={styles.moduleHeroStatValue}>{overview.unreadAnnouncements.length}</Text>
              <Text style={styles.moduleHeroStatLabel}>Unread</Text>
            </View>
            <View style={styles.moduleHeroStatChip}>
              <Text style={styles.moduleHeroStatValue}>
                {overview.myComplaints.filter((item) => item.status !== 'resolved').length}
              </Text>
              <Text style={styles.moduleHeroStatLabel}>Open</Text>
            </View>
          </View>
        </View>
        <View style={styles.heroActions}>
          <ActionButton label="Workspaces" onPress={actions.goToWorkspaces} variant="secondary" />
          {canUseAdmin ? (
            <ActionButton label="Switch to Admin" onPress={actions.goToRoleSelection} variant="primary" />
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
      </SurfaceCard>
      ) : null}

      {!isCompact && activeTab !== 'home' ? (
        <SurfaceCard style={styles.residentNavigationCard}>
          <SectionHeader
            title={residentTabs.find((item) => item.key === activeTab)?.label ?? 'Resident'}
            description={getResidentTabDescription(activeTab)}
          />
          <NavigationStrip items={residentTabs} activeKey={activeTab} onChange={setActiveTab} />
        </SurfaceCard>
      ) : null}

      {activeTab === 'visitors' ? (
        <ResidentVisitors
          societyId={society.id}
          userId={user.id}
          preferredSection={preferredVisitorsSection}
        />
      ) : null}
      {activeTab === 'community' ? (
        <ResidentCommunity
          societyId={society.id}
          userId={user.id}
          preferredSection={preferredCommunitySection}
        />
      ) : null}
      {activeTab === 'billing' ? (
        <ResidentBilling
          societyId={society.id}
          userId={user.id}
          preferredSection={preferredBillingSection}
        />
      ) : null}
      {activeTab === 'notices' ? <ResidentNotices societyId={society.id} userId={user.id} /> : null}
      {activeTab === 'bookings' ? (
        <ResidentBookings
          societyId={society.id}
          userId={user.id}
          preferredSection={preferredBookingsSection}
        />
      ) : null}
      {activeTab === 'helpdesk' ? <ResidentHelpdesk societyId={society.id} userId={user.id} /> : null}
      {activeTab === 'profile' ? (
        <ResidentProfile
          societyId={society.id}
          userId={user.id}
          preferredSection={preferredProfileSection}
        />
      ) : null}
    </PageFrame>
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

function ResidentVisitors({
  societyId,
  userId,
  preferredSection,
}: {
  societyId: string;
  userId: string;
  preferredSection?: ResidentVisitorsSection;
}) {
  const { state, actions } = useApp();
  const membership = getMembershipForSociety(state.data, userId, societyId);
  const units = getUnitsForSociety(state.data, societyId).filter((unit) =>
    membership?.unitIds.includes(unit.id),
  );
  const visitorPasses = getVisitorPassesForUserSociety(state.data, userId, societyId);
  const securityGuestRequests = getSecurityGuestRequestsForResident(state.data, userId, societyId);
  const pendingSecurityGuestRequests = getPendingSecurityGuestRequestsForResident(
    state.data,
    userId,
    societyId,
  );
  const securityContacts = getImportantContactsForSociety(state.data, societyId).filter(
    (contact) => contact.category === 'security',
  );
  const conversationsByRequestId = useMemo(
    () =>
      new Map(
        securityGuestRequests.map(({ request }) => [
          request.id,
          getSecurityGuestConversationForRequest(state.data, request.id),
        ]),
      ),
    [securityGuestRequests, state.data],
  );
  const [selectedUnitId, setSelectedUnitId] = useState(units[0]?.id ?? '');
  const [visitorCategory, setVisitorCategory] = useState<VisitorCategory>('guest');
  const [visitorName, setVisitorName] = useState('');
  const [visitorPhone, setVisitorPhone] = useState('');
  const [visitorPurpose, setVisitorPurpose] = useState('');
  const [guestCount, setGuestCount] = useState('1');
  const [expectedAt, setExpectedAt] = useState(nowDateTimeInputValue());
  const [validUntil, setValidUntil] = useState(addHoursToDateTimeInputValue(3));
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [visitorNotes, setVisitorNotes] = useState('');
  const [threadDrafts, setThreadDrafts] = useState<Record<string, string>>({});
  const lastAlertedRingIdRef = useRef('');
  const [activeSection, setActiveSection] = useState<ResidentVisitorsSection>(preferredSection ?? 'create');
  const unitIds = new Set(membership?.unitIds ?? []);
  const entryLogs = getEntryLogsForSociety(state.data, societyId)
    .filter(({ entry }) => entry.unitId && unitIds.has(entry.unitId))
    .slice(0, 8);

  useEffect(() => {
    if (preferredSection) {
      setActiveSection(preferredSection);
    }
  }, [preferredSection]);

  useEffect(() => {
    if (!selectedUnitId && units[0]?.id) {
      setSelectedUnitId(units[0].id);
    }
  }, [selectedUnitId, units]);

  async function handleCreateVisitorPass() {
    const saved = await actions.createVisitorPass(societyId, {
      unitId: selectedUnitId,
      visitorName,
      phone: visitorPhone,
      category: visitorCategory,
      purpose: visitorPurpose,
      guestCount,
      expectedAt,
      validUntil,
      vehicleNumber,
      notes: visitorNotes,
    });

    if (saved) {
      setVisitorCategory('guest');
      setVisitorName('');
      setVisitorPhone('');
      setVisitorPurpose('');
      setGuestCount('1');
      setExpectedAt(nowDateTimeInputValue());
      setValidUntil(addHoursToDateTimeInputValue(3));
      setVehicleNumber('');
      setVisitorNotes('');
    }
  }

  const scheduledPasses = visitorPasses.filter(({ visitorPass }) => visitorPass.status === 'scheduled');
  const activePasses = visitorPasses.filter(({ visitorPass }) => visitorPass.status === 'checkedIn');
  const latestPendingRing = useMemo(() => {
    const ringEvents = pendingSecurityGuestRequests.flatMap(({ request }) =>
      (conversationsByRequestId.get(request.id) ?? []).filter(({ log }) => log.action === 'ringRequested'),
    );

    return ringEvents.sort((left, right) => Date.parse(right.log.createdAt) - Date.parse(left.log.createdAt))[0];
  }, [conversationsByRequestId, pendingSecurityGuestRequests]);
  const featuredLiveApproval = pendingSecurityGuestRequests.find(({ request }) => {
    const conversation = conversationsByRequestId.get(request.id) ?? [];
    return conversation.some(({ log }) => log.action === 'ringRequested');
  }) ?? pendingSecurityGuestRequests[0];

  useEffect(() => {
    if (!latestPendingRing?.log.id) {
      void stopRingAlert();
      return;
    }

    if (latestPendingRing.log.id === lastAlertedRingIdRef.current) {
      return;
    }

    lastAlertedRingIdRef.current = latestPendingRing.log.id;
    void startRingAlert(latestPendingRing.log.id, 60_000);
  }, [latestPendingRing]);

  useEffect(() => () => {
    void stopRingAlert();
  }, []);

  async function handleSendThreadMessage(requestId: string) {
    const message = (threadDrafts[requestId] ?? '').trim();

    if (!message) {
      return;
    }

    const sent = await actions.sendSecurityGuestMessage(societyId, requestId, { message });

    if (sent) {
      setThreadDrafts((current) => ({
        ...current,
        [requestId]: '',
      }));
    }
  }

  async function handleCallGate(phone?: string) {
    if (!phone) {
      return;
    }

    await openPhoneDialer(phone);
  }

  async function handleGateWhatsapp(phone: string | undefined, guestName: string, unitCode?: string) {
    if (!phone) {
      return;
    }

    await openWhatsAppConversation(
      phone,
      `Resident update for ${unitCode ?? 'my unit'}: I am reviewing the gate approval for ${guestName}. Please keep the request open in the app.`,
    );
  }

  return (
    <>
      <SectionHeader
        title="Visitor hub"
        description="Create passes, respond to live gate approvals, review visit history, and keep the security desk aligned from one place."
      />
      <SurfaceCard>
        <View style={styles.metricGrid}>
          <MetricCard label="Scheduled passes" value={String(scheduledPasses.length)} tone="accent" />
          <MetricCard label="Checked in" value={String(activePasses.length)} tone="blue" />
          <MetricCard label="Completed visits" value={String(visitorPasses.filter(({ visitorPass }) => visitorPass.status === 'completed').length)} />
          <MetricCard label="Gate approvals" value={String(pendingSecurityGuestRequests.length)} tone="accent" />
        </View>
        <View style={styles.choiceRow}>
          {residentVisitorSections.map((section) => (
            <ChoiceChip
              key={section.key}
              label={section.label}
              selected={activeSection === section.key}
              onPress={() => setActiveSection(section.key)}
            />
          ))}
        </View>
        <View style={styles.inlineSection}>
          <Caption>
            Tap a section above to move between creating passes, live approvals, visit history, and the security desk.
          </Caption>
        </View>
      </SurfaceCard>

      {activeSection === 'approvals' && featuredLiveApproval ? (
        (() => {
          const { request, unit, createdBy } = featuredLiveApproval;
          const conversation = conversationsByRequestId.get(request.id) ?? [];
          const latestRing = [...conversation].reverse().find(({ log }) => log.action === 'ringRequested');
          const gatePhone = createdBy?.phone ?? securityContacts[0]?.phone;

          return (
            <SurfaceCard style={styles.liveApprovalCard}>
              <View style={styles.liveApprovalBackdrop}>
                <View style={styles.liveApprovalPulseLarge} />
                <View style={styles.liveApprovalPulseSmall} />
              </View>
              <View style={styles.rowBetween}>
                <View style={styles.liveApprovalCopy}>
                  <Pill
                    label={latestRing ? 'Incoming gate call' : 'Gate desk waiting'}
                    tone="warning"
                  />
                  <Text style={styles.cardTitle}>Live approval for {request.guestName}</Text>
                  <Caption>
                    {unit?.code ?? 'Resident unit'} · {createdBy?.name ?? 'Security desk'}
                    {latestRing ? ` · rang at ${formatLongDate(latestRing.log.createdAt)}` : ''}
                  </Caption>
                </View>
                <Pill
                  label={humanizeSecurityGuestRequestStatus(request.status)}
                  tone={getSecurityGuestRequestTone(request.status)}
                />
              </View>
              <Caption>
                {request.purpose}
                {request.phone ? ` · ${request.phone}` : ''}
                {request.vehicleNumber ? ` · ${request.vehicleNumber}` : ''}
              </Caption>
              <View style={styles.queuePhotoRow}>
                {request.guestPhotoDataUrl ? (
                  <View style={styles.queueMediaCard}>
                    <Image source={{ uri: request.guestPhotoDataUrl }} style={styles.securityThreadPhoto} />
                    <Caption>Guest photo</Caption>
                  </View>
                ) : null}
                {request.vehiclePhotoDataUrl ? (
                  <View style={styles.queueMediaCard}>
                    <Image source={{ uri: request.vehiclePhotoDataUrl }} style={styles.securityThreadPhoto} />
                    <Caption>Vehicle photo</Caption>
                  </View>
                ) : null}
              </View>
              <View style={styles.heroActions}>
                <ActionButton
                  label={state.isSyncing ? 'Updating...' : 'Approve now'}
                  onPress={() =>
                    actions.reviewSecurityGuestRequest(societyId, request.id, { decision: 'approve' })
                  }
                  disabled={state.isSyncing}
                />
                <ActionButton
                  label="Deny"
                  onPress={() =>
                    actions.reviewSecurityGuestRequest(societyId, request.id, { decision: 'deny' })
                  }
                  disabled={state.isSyncing}
                  variant="danger"
                />
                {gatePhone ? (
                  <ActionButton
                    label="Call gate"
                    onPress={() => handleCallGate(gatePhone)}
                    disabled={state.isSyncing}
                    variant="secondary"
                  />
                ) : null}
                {gatePhone ? (
                  <ActionButton
                    label="WhatsApp gate"
                    onPress={() => handleGateWhatsapp(gatePhone, request.guestName, unit?.code)}
                    disabled={state.isSyncing}
                    variant="secondary"
                  />
                ) : null}
              </View>
            </SurfaceCard>
          );
        })()
      ) : null}

      {activeSection === 'approvals' && pendingSecurityGuestRequests.length > 0 ? (
        <SurfaceCard>
          <SectionHeader
            title="Urgent gate approvals"
            description="Security has captured these walk-in guests at the gate. Approve or deny quickly so the desk can act without phone chasing."
          />
          {pendingSecurityGuestRequests.map(({ request, unit, createdBy }) => {
            const conversation = conversationsByRequestId.get(request.id) ?? [];
            const recentConversation = conversation.slice(-6);
            const gatePhone = createdBy?.phone ?? securityContacts[0]?.phone;

            return (
            <View key={request.id} style={styles.inlineSection}>
              <View style={styles.rowBetween}>
                <Text style={styles.cardTitle}>{request.guestName}</Text>
                <Pill
                  label={humanizeSecurityGuestRequestStatus(request.status)}
                  tone={getSecurityGuestRequestTone(request.status)}
                />
              </View>
              <Caption>
                {request.category} for {unit?.code ?? 'Resident unit'} · captured by {createdBy?.name ?? 'Security desk'}
              </Caption>
              <Caption>
                Purpose: {request.purpose}{request.phone ? ` · ${request.phone}` : ''}
              </Caption>
              {request.gateNotes ? <Caption>Gate note: {request.gateNotes}</Caption> : null}
              {request.guestPhotoDataUrl || request.vehiclePhotoDataUrl ? (
                <View style={styles.queuePhotoRow}>
                  {request.guestPhotoDataUrl ? (
                    <View style={styles.queueMediaCard}>
                      <Image source={{ uri: request.guestPhotoDataUrl }} style={styles.securityThreadPhoto} />
                      <Caption>Guest photo</Caption>
                    </View>
                  ) : null}
                  {request.vehiclePhotoDataUrl ? (
                    <View style={styles.queueMediaCard}>
                      <Image source={{ uri: request.vehiclePhotoDataUrl }} style={styles.securityThreadPhoto} />
                      <Caption>Vehicle photo</Caption>
                    </View>
                  ) : null}
                </View>
              ) : null}
              <View style={styles.threadPanel}>
                <Text style={styles.threadTitle}>Gate conversation</Text>
                {recentConversation.length > 0 ? (
                  recentConversation.map(({ log, actor }) => (
                    <View
                      key={log.id}
                      style={[
                        styles.threadBubble,
                        log.actorRole === 'resident' ? styles.threadBubbleResident : styles.threadBubbleSecurity,
                      ]}
                    >
                      <Text style={styles.threadBubbleTitle}>
                        {actor?.name ?? (log.actorRole === 'resident' ? 'You' : 'Gate team')}
                      </Text>
                      <Caption>{humanizeSecurityGuestLogAction(log.action)}</Caption>
                      {log.note ? <Text style={styles.threadBubbleMessage}>{log.note}</Text> : null}
                      <Caption>{formatLongDate(log.createdAt)}</Caption>
                    </View>
                  ))
                ) : (
                  <Caption>Security messages will appear here as the gate desk updates the request.</Caption>
                )}
                <InputField
                  label="Reply to gate desk"
                  value={threadDrafts[request.id] ?? ''}
                  onChangeText={(value) =>
                    setThreadDrafts((current) => ({
                      ...current,
                      [request.id]: value,
                    }))
                  }
                  placeholder="Ask security to verify ID, allow parcel only, or wait at gate..."
                  multiline
                />
                <View style={styles.heroActions}>
                  <ActionButton
                    label={state.isSyncing ? 'Sending...' : 'Send reply'}
                    onPress={() => handleSendThreadMessage(request.id)}
                    disabled={state.isSyncing || !(threadDrafts[request.id] ?? '').trim()}
                    variant="secondary"
                  />
                  {gatePhone ? (
                    <ActionButton
                      label="Call gate"
                      onPress={() => handleCallGate(gatePhone)}
                      disabled={state.isSyncing}
                      variant="secondary"
                    />
                  ) : null}
                  {gatePhone ? (
                    <ActionButton
                      label="WhatsApp gate"
                      onPress={() => handleGateWhatsapp(gatePhone, request.guestName, unit?.code)}
                      disabled={state.isSyncing}
                      variant="secondary"
                    />
                  ) : null}
                </View>
              </View>
              <View style={styles.heroActions}>
                <ActionButton
                  label={state.isSyncing ? 'Updating...' : 'Approve'}
                  onPress={() =>
                    actions.reviewSecurityGuestRequest(societyId, request.id, { decision: 'approve' })
                  }
                  disabled={state.isSyncing}
                />
                <ActionButton
                  label="Deny"
                  onPress={() =>
                    actions.reviewSecurityGuestRequest(societyId, request.id, { decision: 'deny' })
                  }
                  disabled={state.isSyncing}
                  variant="danger"
                />
              </View>
            </View>
          );
        })}
        </SurfaceCard>
      ) : null}

      {activeSection === 'create' ? (
      <SurfaceCard>
        <SectionHeader
          title="Create a visitor pass"
          description="This follows the usual industry workflow: resident creates the pass, security checks in the guest, and the exit is logged when they leave."
        />
        <Text style={styles.compactTitle}>Select unit</Text>
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
        <Text style={styles.compactTitle}>Visitor type</Text>
        <View style={styles.choiceRow}>
          {visitorCategories.map((option) => (
            <ChoiceChip
              key={option.key}
              label={option.label}
              selected={visitorCategory === option.key}
              onPress={() => setVisitorCategory(option.key)}
            />
          ))}
        </View>
        <View style={styles.formGrid}>
          <View style={styles.formField}>
            <InputField label="Visitor name" value={visitorName} onChangeText={setVisitorName} placeholder="Rahul Sharma" />
          </View>
          <View style={styles.formField}>
            <InputField label="Phone (optional)" value={visitorPhone} onChangeText={setVisitorPhone} keyboardType="phone-pad" placeholder="+91 98765 43210" />
          </View>
          <View style={styles.formField}>
            <InputField label="Purpose" value={visitorPurpose} onChangeText={setVisitorPurpose} placeholder="Family dinner, parcel drop, electrician visit" />
          </View>
          <View style={styles.formField}>
            <InputField label="Guest count" value={guestCount} onChangeText={setGuestCount} keyboardType="numeric" placeholder="1" />
          </View>
          <View style={styles.formField}>
            <InputField label="Expected arrival" value={expectedAt} onChangeText={setExpectedAt} placeholder="2026-03-24T18:30" />
          </View>
          <View style={styles.formField}>
            <InputField label="Valid until" value={validUntil} onChangeText={setValidUntil} placeholder="2026-03-24T22:00" />
          </View>
          <View style={styles.formField}>
            <InputField label="Vehicle number (optional)" value={vehicleNumber} onChangeText={(value) => setVehicleNumber(value.toUpperCase())} placeholder="GJ01AB1234" autoCapitalize="characters" />
          </View>
        </View>
        <InputField
          label="Notes for gate desk (optional)"
          value={visitorNotes}
          onChangeText={setVisitorNotes}
          placeholder="Senior citizen visitor, carrying equipment, or parking instructions"
          multiline
        />
        <ActionButton
          label={state.isSyncing ? 'Creating...' : 'Create visitor pass'}
          onPress={handleCreateVisitorPass}
          disabled={state.isSyncing || !selectedUnitId || !visitorName.trim() || !visitorPurpose.trim() || !expectedAt.trim() || !validUntil.trim()}
        />
        {securityContacts[0] ? (
          <Caption>
            Security contact: {securityContacts[0].name} - {securityContacts[0].phone}
          </Caption>
        ) : null}
      </SurfaceCard>
      ) : null}

      {activeSection === 'history' ? (
      <>
      <SurfaceCard>
        <SectionHeader
          title="Active and recent visitor passes"
          description="Passes stay visible here until security completes the visit or you cancel it before arrival."
        />
        {visitorPasses.length > 0 ? (
          visitorPasses.map(({ visitorPass, unit, createdBy }) => (
            <View key={visitorPass.id} style={styles.inlineSection}>
              <View style={styles.rowBetween}>
                <Text style={styles.cardTitle}>{visitorPass.visitorName}</Text>
                <Pill label={humanizeVisitorPassStatus(visitorPass.status)} tone={getVisitorPassTone(visitorPass.status)} />
              </View>
              <Caption>
                {humanizeVisitorCategory(visitorPass.category)} for {unit?.code ?? 'Resident unit'} - pass {visitorPass.passCode}
              </Caption>
              <Caption>
                Expected {formatLongDate(visitorPass.expectedAt)}{visitorPass.checkedInAt ? ` - checked in ${formatLongDate(visitorPass.checkedInAt)}` : ''}
              </Caption>
              <Caption>
                Purpose: {visitorPass.purpose}{visitorPass.vehicleNumber ? ` - Vehicle ${visitorPass.vehicleNumber}` : ''}
              </Caption>
              {visitorPass.notes ? <Caption>Gate note: {visitorPass.notes}</Caption> : null}
              {createdBy ? <Caption>Created by {createdBy.name}</Caption> : null}
              {visitorPass.status === 'scheduled' ? (
                <View style={styles.heroActions}>
                  <ActionButton
                    label={state.isSyncing ? 'Updating...' : 'Cancel pass'}
                    onPress={() => actions.updateVisitorPassStatus(societyId, visitorPass.id, { status: 'cancelled' })}
                    disabled={state.isSyncing}
                    variant="secondary"
                  />
                </View>
              ) : null}
            </View>
          ))
        ) : (
          <Caption>No visitor pass created yet. Your active and completed gate passes will appear here.</Caption>
        )}
      </SurfaceCard>
      <SurfaceCard>
        <SectionHeader
          title="Gate entry history"
          description="Recent gate movement linked to your unit appears here."
        />
        {entryLogs.length > 0 ? (
          entryLogs.map(({ entry, unit }) => (
            <View key={entry.id} style={styles.inlineSection}>
              <Text style={styles.compactTitle}>{entry.subjectName}</Text>
              <Caption>
                {entry.subjectType} for {unit?.code ?? 'your unit'} - {entry.status} - {formatLongDate(entry.enteredAt)}
              </Caption>
            </View>
          ))
        ) : (
          <Caption>No recent gate history is linked to your household yet.</Caption>
        )}
      </SurfaceCard>
      </>
      ) : null}

      {activeSection === 'desk' ? (
      <SurfaceCard>
        <SectionHeader
          title="Security desk"
          description="Use these saved contacts when you need to coordinate directly with the gate team."
        />
        {securityContacts.length > 0 ? (
          securityContacts.map((contact) => (
            <View key={contact.id} style={styles.inlineSection}>
              <Text style={styles.compactTitle}>{contact.name}</Text>
              <Caption>{contact.phone || 'No phone saved'}{contact.notes ? ` - ${contact.notes}` : ''}</Caption>
            </View>
          ))
        ) : (
          <Caption>No security contact is configured yet for this society.</Caption>
        )}
        <Caption>
          Guards on roster: {getGuardRosterForSociety(state.data, societyId).map(({ guard }) => guard.name).join(', ') || 'Not configured yet'}
        </Caption>
      </SurfaceCard>
      ) : null}

      <SurfaceCard>
        <SectionHeader
          title="Security approvals history"
          description="Walk-in guests captured by security are logged here even when they were not pre-created by you."
        />
        {securityGuestRequests.length > 0 ? (
          securityGuestRequests.map(({ request, unit, createdBy, respondedBy }) => (
            <View key={request.id} style={styles.inlineSection}>
              <View style={styles.rowBetween}>
                <Text style={styles.cardTitle}>{request.guestName}</Text>
                <Pill
                  label={humanizeSecurityGuestRequestStatus(request.status)}
                  tone={getSecurityGuestRequestTone(request.status)}
                />
              </View>
              <Caption>
                {request.category} for {unit?.code ?? 'Resident unit'} · raised by {createdBy?.name ?? 'Security desk'}
              </Caption>
              <Caption>
                Purpose: {request.purpose}
                {request.checkedInAt ? ` · entered ${formatLongDate(request.checkedInAt)}` : ''}
                {request.checkedOutAt ? ` · exited ${formatLongDate(request.checkedOutAt)}` : ''}
              </Caption>
              {respondedBy ? <Caption>Responded by {respondedBy.name}</Caption> : null}
            </View>
          ))
        ) : (
          <Caption>No security-created gate approvals yet.</Caption>
        )}
      </SurfaceCard>
    </>
  );
}

function ResidentCommunity({
  societyId,
  userId,
  preferredSection,
}: {
  societyId: string;
  userId: string;
  preferredSection?: ResidentCommunitySection;
}) {
  const { state, actions } = useApp();
  const [activeSection, setActiveSection] = useState<ResidentCommunitySection>(preferredSection ?? 'members');
  const [selectedDirectChatUserId, setSelectedDirectChatUserId] = useState('');
  const [groupMessageDraft, setGroupMessageDraft] = useState('');
  const [directMessageDraft, setDirectMessageDraft] = useState('');
  const members = getCommunityMembersForSociety(state.data, societyId);
  const vehicles = getVehicleDirectoryForSociety(state.data, societyId);
  const contacts = getImportantContactsForSociety(state.data, societyId);
  const guards = getGuardRosterForSociety(state.data, societyId);
  const staffDirectory = getStaffVerificationDirectory(state.data, societyId);
  const myMembership = getMembershipForSociety(state.data, userId, societyId);
  const groupThread = getSocietyChatThread(state.data, societyId);
  const groupMessages = groupThread ? getChatMessagesForThread(state.data, groupThread.id) : [];
  const directThreads = getDirectChatThreadsForUser(state.data, societyId, userId);
  const directPeers = useMemo(() => {
    const threadMap = new Map(
      directThreads
        .filter((threadEntry) => threadEntry.peer?.id)
        .map((threadEntry) => [threadEntry.peer?.id as string, threadEntry]),
    );

    return members
      .filter((member) => member.user.id !== userId)
      .sort((left, right) => {
        const leftThread = threadMap.get(left.user.id);
        const rightThread = threadMap.get(right.user.id);
        const leftRoles = Array.isArray(left.membership.roles) ? left.membership.roles : [];
        const rightRoles = Array.isArray(right.membership.roles) ? right.membership.roles : [];
        const leftPriority = leftRoles.includes('chairman') ? 0 : leftRoles.includes('committee') ? 1 : 2;
        const rightPriority = rightRoles.includes('chairman') ? 0 : rightRoles.includes('committee') ? 1 : 2;

        if (leftPriority !== rightPriority) {
          return leftPriority - rightPriority;
        }

        const leftUpdatedAt = leftThread?.latestMessage?.createdAt ?? leftThread?.thread.updatedAt ?? '';
        const rightUpdatedAt = rightThread?.latestMessage?.createdAt ?? rightThread?.thread.updatedAt ?? '';

        if (leftUpdatedAt && rightUpdatedAt && leftUpdatedAt !== rightUpdatedAt) {
          return Date.parse(rightUpdatedAt) - Date.parse(leftUpdatedAt);
        }

        return left.user.name.localeCompare(right.user.name);
      });
  }, [directThreads, members, userId]);
  const selectedDirectPeer = directPeers.find((member) => member.user.id === selectedDirectChatUserId) ?? directPeers[0];
  const selectedDirectThread = directThreads.find((threadEntry) => threadEntry.peer?.id === selectedDirectPeer?.user.id);
  const directMessages = selectedDirectThread ? getChatMessagesForThread(state.data, selectedDirectThread.thread.id) : [];

  useEffect(() => {
    if (!selectedDirectChatUserId && directPeers[0]?.user.id) {
      setSelectedDirectChatUserId(directPeers[0].user.id);
      return;
    }

    if (selectedDirectChatUserId && !directPeers.some((peer) => peer.user.id === selectedDirectChatUserId)) {
      setSelectedDirectChatUserId(directPeers[0]?.user.id ?? '');
    }
  }, [directPeers, selectedDirectChatUserId]);

  useEffect(() => {
    if (preferredSection) {
      setActiveSection(preferredSection);
    }
  }, [preferredSection]);

  async function handleSendGroupMessage() {
    const message = groupMessageDraft.trim();

    if (!message) {
      return;
    }

    const sent = await actions.sendSocietyChatMessage(societyId, { message });

    if (sent) {
      setGroupMessageDraft('');
    }
  }

  async function handleSendDirectMessage() {
    const message = directMessageDraft.trim();

    if (!message || !selectedDirectPeer) {
      return;
    }

    const sent = await actions.sendDirectChatMessage(societyId, selectedDirectPeer.user.id, { message });

    if (sent) {
      setDirectMessageDraft('');
    }
  }

  return (
    <>
      <SectionHeader
        title="Community hub"
        description="Browse resident contacts, registered vehicles, important society numbers, staff coverage, and community chats from one place."
      />
      <SurfaceCard>
        <View style={styles.metricGrid}>
          <MetricCard
            label="Members"
            value={String(members.length)}
            onPress={() => setActiveSection('members')}
          />
          <MetricCard
            label="Chat rooms"
            value={String((groupThread ? 1 : 0) + directThreads.length)}
            tone="blue"
            onPress={() => setActiveSection('chat')}
          />
          <MetricCard
            label="Vehicles"
            value={String(vehicles.length)}
            tone="accent"
            onPress={() => setActiveSection('vehicles')}
          />
          <MetricCard
            label="Important contacts"
            value={String(contacts.length)}
            tone="blue"
            onPress={() => setActiveSection('contacts')}
          />
          <MetricCard
            label="Staff and guards"
            value={String(staffDirectory.length + guards.length)}
            onPress={() => setActiveSection('staff')}
          />
        </View>
        <View style={styles.inlineSection}>
          <Caption>
            Tap a card above to browse {residentCommunitySections.map((s, i) => (
              <Text key={s.key}>{i > 0 ? ', ' : ''}{s.label.toLowerCase()}</Text>
            ))}. Your access is based on the current society membership for {myMembership?.unitIds.length ? 'linked units and shared society records.' : 'shared society records.'}
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
              {member.user.id !== userId ? (
                <View style={styles.heroActions}>
                  <ActionButton
                    label="Open chat"
                    onPress={() => {
                      setActiveSection('chat');
                      setSelectedDirectChatUserId(member.user.id);
                    }}
                    variant="secondary"
                  />
                </View>
              ) : null}
            </SurfaceCard>
          ))
        ) : (
          <SurfaceCard>
            <Caption>No resident directory entries are available yet.</Caption>
          </SurfaceCard>
        )
      ) : null}

      {activeSection === 'chat' ? (
        <>
          <SurfaceCard>
            <SectionHeader
              title="Society group chat"
              description="Use the shared society room for updates, quick questions, and day-to-day coordination with neighbors and committee members."
            />
            <View style={styles.chatHeaderBar}>
              <View style={styles.chatHeaderIdentity}>
                <View style={styles.chatHeaderAvatar}>
                  <Text style={styles.chatHeaderAvatarText}>SG</Text>
                </View>
                <View style={styles.chatPeerCopy}>
                  <Text style={styles.cardTitle}>Society lounge</Text>
                  <Caption>{groupMessages.length > 0 ? `${groupMessages.length} message(s) · live society room` : 'No messages yet. Start the conversation.'}</Caption>
                </View>
              </View>
              <Pill label="Group" tone="primary" />
            </View>
            <View style={styles.chatHistoryPanel}>
              {groupMessages.length > 0 ? (
                groupMessages.slice(-20).map(({ message, sender }) => (
                  <View
                    key={message.id}
                    style={[
                      styles.threadBubble,
                      message.senderUserId === userId ? styles.threadBubbleResident : styles.threadBubbleSecurity,
                    ]}
                  >
                    {message.senderUserId !== userId ? (
                      <Text style={styles.threadBubbleTitle}>{sender?.name ?? 'Resident'}</Text>
                    ) : null}
                    <Text style={styles.threadBubbleMessage}>{message.body}</Text>
                    <Caption>{formatLongDate(message.createdAt)}</Caption>
                  </View>
                ))
              ) : (
                <Caption>The society room is quiet right now. Send the first welcome or coordination message.</Caption>
              )}
            </View>
            <View style={styles.chatComposer}>
              <InputField
                label="Message the society room"
                value={groupMessageDraft}
                onChangeText={setGroupMessageDraft}
                placeholder="Ask about maintenance timing, share a quick update, or coordinate with neighbors..."
                multiline
              />
              <ActionButton
                label={state.isSyncing ? 'Sending...' : 'Send to society'}
                onPress={handleSendGroupMessage}
                disabled={state.isSyncing || !groupMessageDraft.trim()}
              />
            </View>
          </SurfaceCard>

          <SurfaceCard>
            <SectionHeader
              title="Direct chats"
              description="Chat one to one with another resident or the chairman without leaving your workspace."
            />
            <View style={styles.chatWorkspace}>
              <View style={styles.chatSidebar}>
                {directPeers.length > 0 ? directPeers.map((peer) => {
                  const threadEntry = directThreads.find((directThread) => directThread.peer?.id === peer.user.id);

                  return (
                    <Pressable
                      key={peer.user.id}
                      onPress={() => setSelectedDirectChatUserId(peer.user.id)}
                      style={({ pressed }) => [
                        styles.chatListItem,
                        selectedDirectPeer?.user.id === peer.user.id ? styles.chatListItemActive : null,
                        pressed ? styles.interactiveCardPressed : null,
                      ]}
                    >
                      <View style={styles.chatListAvatar}>
                        <Text style={styles.chatListAvatarText}>{peer.user.avatarInitials}</Text>
                      </View>
                      <View style={styles.chatListCopy}>
                        <View style={styles.rowBetween}>
                          <Text style={styles.inlineTitle}>
                            {peer.membership.roles.includes('chairman') ? `${peer.user.name} (Chairman)` : peer.user.name}
                          </Text>
                          {threadEntry?.latestMessage ? <Caption>{formatLongDate(threadEntry.latestMessage.createdAt)}</Caption> : null}
                        </View>
                        <Caption>
                          {peer.units.length > 0
                            ? peer.units
                              .map((unit) => `${unit.code} · ${humanizeResidenceUnitType(unit.unitType)}`)
                              .join(', ')
                            : 'Residence pending'}
                        </Caption>
                        <Caption>{threadEntry?.latestMessage?.body ?? 'Tap to start chatting privately.'}</Caption>
                      </View>
                    </Pressable>
                  );
                }) : (
                  <Caption>No other society member is available for direct chat yet.</Caption>
                )}
              </View>
              <View style={styles.chatConversationPane}>
            {selectedDirectPeer ? (
              <>
                <View style={styles.chatMetaRow}>
                  <View style={styles.chatPeerCopy}>
                    <Text style={styles.cardTitle}>{selectedDirectPeer.user.name}</Text>
                    <Caption>
                      {selectedDirectPeer.units.map((unit) => unit.code).join(', ') || 'Unit pending'}
                      {' · '}
                      {selectedDirectPeer.membership.roles.map((role) => humanizeRole(role)).join(', ')}
                    </Caption>
                  </View>
                <Pill
                    label={selectedDirectPeer.membership.roles.includes('chairman') ? 'Chairman' : 'Resident'}
                    tone={selectedDirectPeer.membership.roles.includes('chairman') ? 'warning' : 'accent'}
                  />
                </View>
                <View style={styles.chatPanel}>
                  {directMessages.length > 0 ? (
                    directMessages.slice(-12).map(({ message, sender }) => (
                      <View
                        key={message.id}
                        style={[
                          styles.threadBubble,
                          message.senderUserId === userId ? styles.threadBubbleResident : styles.threadBubbleSecurity,
                        ]}
                      >
                        <Text style={styles.threadBubbleTitle}>{sender?.name ?? 'Resident'}</Text>
                        <Text style={styles.threadBubbleMessage}>{message.body}</Text>
                        <Caption>{formatLongDate(message.createdAt)}</Caption>
                      </View>
                    ))
                  ) : (
                    <Caption>Start a direct conversation with {selectedDirectPeer.user.name}. The first message will open the private chat.</Caption>
                  )}
                </View>
                <InputField
                  label={`Message ${selectedDirectPeer.user.name}`}
                  value={directMessageDraft}
                  onChangeText={setDirectMessageDraft}
                  placeholder="Hello, can we coordinate on a society issue or quick update?"
                  multiline
                />
                <View style={styles.heroActions}>
                  <ActionButton
                    label={state.isSyncing ? 'Sending...' : 'Send direct message'}
                    onPress={handleSendDirectMessage}
                    disabled={state.isSyncing || !directMessageDraft.trim()}
                  />
                </View>
              </>
            ) : (
              <Caption>No other society member is available for direct chat yet.</Caption>
            )}
              </View>
            </View>
          </SurfaceCard>
        </>
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

function humanizeResidenceUnitType(unitType: SeedData['units'][number]['unitType']) {
  switch (unitType) {
    case 'flat':
      return 'Flat';
    case 'plot':
      return 'Plot';
    case 'office':
      return 'Office';
    case 'shed':
      return 'Shed';
    default:
      return unitType;
  }
}

function ResidentBilling({
  societyId,
  userId,
  preferredSection,
}: {
  societyId: string;
  userId: string;
  preferredSection?: ResidentBillingSection;
}) {
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
  const [activeSection, setActiveSection] = useState<ResidentBillingSection>(preferredSection ?? 'pay');
  const hasUpiSetup = Boolean(plan?.upiId || plan?.upiMobileNumber || plan?.upiQrCodeDataUrl);

  useEffect(() => {
    if (preferredSection) {
      setActiveSection(preferredSection);
    }
  }, [preferredSection]);

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
      <SectionHeader
        title="Maintenance billing"
        description="Track dues, payment flags, reminders, and history from one billing hub that follows the same layout as the other resident modules."
      />
      <SurfaceCard>
        <View style={styles.metricGrid}>
          <MetricCard label="Outstanding dues" value={formatCurrency(overview.totalDue)} tone="accent" />
          <MetricCard label="Payment flags" value={String(overview.myPendingPayments.length)} tone="primary" />
          <MetricCard label="Reminder notices" value={String(reminders.length)} tone="blue" />
        </View>
        <View style={styles.choiceRow}>
          {residentBillingSections.map((section) => (
            <ChoiceChip
              key={section.key}
              label={section.label}
              selected={activeSection === section.key}
              onPress={() => setActiveSection(section.key)}
            />
          ))}
        </View>
        <View style={styles.inlineSection}>
          <Caption>
            Choose a billing section to pay now, review reminders, inspect outstanding invoices, or open receipt history.
          </Caption>
        </View>
      </SurfaceCard>

      {activeSection === 'reminders' && reminders.length > 0 ? (
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

      {activeSection === 'pay' ? (
      <>
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
      </>
      ) : null}

      {activeSection === 'outstanding' ? (
      <>
      <SurfaceCard>
        <SectionHeader
          title="Outstanding invoices"
          description="Review unpaid and overdue maintenance cycles in the same subsection card pattern used across the resident workspace."
        />
      </SurfaceCard>
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
      </>
      ) : null}

      {activeSection === 'history' ? (
      <>
      <SurfaceCard>
        <SectionHeader
          title="Payment history"
          description="Confirmed payments, receipt access, and proof snapshots stay grouped in one history section."
        />
        {receiptActionMessage ? <Caption>{receiptActionMessage}</Caption> : null}
      </SurfaceCard>
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
      ) : null}
    </>
  );
}

function ResidentNotices({ societyId, userId }: { societyId: string; userId: string }) {
  const { state, actions } = useApp();
  const membership = getMembershipForSociety(state.data, userId, societyId);
  const announcements = getAnnouncementsForSociety(state.data, societyId, membership?.roles);
  const rules = getRulesForSociety(state.data, societyId);
  const unreadAnnouncements = announcements.filter((announcement) => !announcement.readByUserIds.includes(userId));
  const highPriorityAnnouncements = announcements.filter((announcement) => announcement.priority === 'high').length;

  return (
    <>
      <SectionHeader
        title="Notice board"
        description="Stay on top of announcements, unread communication, rules, and resident-facing documents from one notice hub."
      />
      <SurfaceCard>
        <View style={styles.metricGrid}>
          <MetricCard label="Announcements" value={String(announcements.length)} tone="primary" />
          <MetricCard label="Unread" value={String(unreadAnnouncements.length)} tone="accent" />
          <MetricCard label="High priority" value={String(highPriorityAnnouncements)} tone="blue" />
          <MetricCard label="Rules" value={String(rules.length)} tone="primary" />
        </View>
        <View style={styles.inlineSection}>
          <Caption>
            Read the latest society communication here, then review the current rulebook and acknowledgement status below.
          </Caption>
        </View>
      </SurfaceCard>

      <SectionHeader
        title="Society announcements"
        description="Tap an unread notice to mark it as read and keep your resident communication queue current."
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

      <SurfaceCard>
        <SectionHeader
          title="Rules and documents"
          description="Resident-facing policies, acknowledgements, and current rule versions live together in this document section."
        />
      </SurfaceCard>
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

function ResidentBookings({
  societyId,
  userId,
  preferredSection,
}: {
  societyId: string;
  userId: string;
  preferredSection?: ResidentBookingsSection;
}) {
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
  const [activeSection, setActiveSection] = useState<ResidentBookingsSection>(preferredSection ?? 'booking');
  const selectedAmenity = bookableAmenities.find((amenity) => amenity.id === selectedAmenityId) ?? null;
  const selectedAmenityRules = state.data.amenityScheduleRules.filter(
    (rule) => rule.amenityId === selectedAmenity?.id,
  );

  useEffect(() => {
    if (preferredSection) {
      setActiveSection(preferredSection);
    }
  }, [preferredSection]);

  const pendingBookings = bookings.filter((booking) => booking.status === 'pending').length;
  const approvedBookings = bookings.filter((booking) => booking.status === 'approved').length;

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
        title="Bookings hub"
        description="Create amenity requests, explore available spaces, and review your reservations from the same bookings layout used across the resident workspace."
      />
      <SurfaceCard>
        <View style={styles.metricGrid}>
          <MetricCard label="Bookable amenities" value={String(bookableAmenities.length)} tone="accent" />
          <MetricCard label="My bookings" value={String(bookings.length)} tone="primary" />
          <MetricCard label="Pending" value={String(pendingBookings)} tone="blue" />
          <MetricCard label="Approved" value={String(approvedBookings)} tone="primary" />
        </View>
        <View style={styles.choiceRow}>
          {residentBookingSections.map((section) => (
            <ChoiceChip
              key={section.key}
              label={section.label}
              selected={activeSection === section.key}
              onPress={() => setActiveSection(section.key)}
            />
          ))}
        </View>
        <View style={styles.inlineSection}>
          <Caption>
            Open a section above to create a booking, browse amenities, or review the reservations already linked to your unit.
          </Caption>
        </View>
      </SurfaceCard>

      {activeSection === 'booking' ? (
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
        </>
      ) : null}

      {activeSection === 'amenities' ? (
        <>
      <SectionHeader
        title="Amenity discovery"
        description="Amenities can be exclusive slot-based, capacity-based, or simply informational."
      />
      {amenities.length > 0 ? amenities.map((amenity) => (
        <SurfaceCard key={amenity.id}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>{amenity.name}</Text>
            <Pill label={amenity.bookingType} tone="accent" />
          </View>
          <Caption>
            Approval: {amenity.approvalMode} {amenity.capacity ? `· Capacity ${amenity.capacity}` : ''}
          </Caption>
        </SurfaceCard>
      )) : (
        <SurfaceCard><Caption>No amenities are configured yet.</Caption></SurfaceCard>
      )}
        </>
      ) : null}

      {activeSection === 'history' ? (
        <>
      <SurfaceCard>
        <SectionHeader
          title="My bookings"
          description="Track every amenity request, approval, and schedule in one booking history section."
        />
      </SurfaceCard>
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
      ) : null}
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
  const openComplaints = complaints.filter((complaint) => complaint.status !== 'resolved');
  const resolvedComplaints = complaints.filter((complaint) => complaint.status === 'resolved');
  const complaintUpdateCount = complaints.reduce(
    (total, complaint) => total + getComplaintUpdatesForComplaint(state.data, complaint.id).length,
    0,
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
        title="Helpdesk hub"
        description="Raise tickets, follow progress, and review resolution history from the same summary-led design used across the resident modules."
      />
      <SurfaceCard>
        <View style={styles.metricGrid}>
          <MetricCard label="Open tickets" value={String(openComplaints.length)} tone="accent" />
          <MetricCard label="Resolved" value={String(resolvedComplaints.length)} tone="primary" />
          <MetricCard label="Updates" value={String(complaintUpdateCount)} tone="blue" />
          <MetricCard label="Linked units" value={String(userUnits.length)} tone="primary" />
        </View>
        <View style={styles.inlineSection}>
          <Caption>
            Start with a new ticket below, then use the same page to monitor assigned work and the latest society updates.
          </Caption>
        </View>
      </SurfaceCard>

      <SectionHeader
        title="Raise and track tickets"
        description="New issues flow into the chairman helpdesk queue with the linked unit and complaint details."
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

function ResidentProfile({
  societyId,
  userId,
}: {
  societyId: string;
  userId: string;
  preferredSection?: ResidentProfileSection;
}) {
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
      <SectionHeader
        title="Resident profile"
        description="Review household access, residence verification, vehicles, and staff records from one profile hub that matches the newer resident module design."
      />
      <SurfaceCard>
        <View style={styles.metricGrid}>
          <MetricCard label="Linked units" value={String(units.length)} tone="primary" />
          <MetricCard label="Saved vehicles" value={String(userVehicles.length)} tone="accent" />
          <MetricCard label="Staff records" value={String(staff.length)} tone="blue" />
          <MetricCard
            label="Emergency contacts"
            value={String(
              [
                profileEmergencyContactPhone,
                profileSecondaryEmergencyContactPhone,
              ].filter((value) => value.trim()).length,
            )}
            tone="primary"
          />
        </View>
        <View style={styles.inlineSection}>
          <Caption>
            Keep your household identity, verification details, vehicles, privacy consent, and domestic staff information current in this profile section.
          </Caption>
        </View>
      </SurfaceCard>

      <SurfaceCard>
        <SectionHeader
          title="Membership and household"
          description="Core household identity, role access, and unit mapping stay grouped together before the editable profile details."
        />
      </SurfaceCard>
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
  compactWorkspaceCard: {
    gap: spacing.sm,
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
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '900',
    color: palette.ink,
  },
  compactWorkspaceStatsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
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
    flexDirection: 'column',
    gap: spacing.xs,
  },
  residentNavigationCard: {
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
    minWidth: 220,
    gap: spacing.sm,
  },
  moduleHeroTitle: {
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '800',
    color: palette.ink,
  },
  moduleHeroStats: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  moduleHeroStatChip: {
    minWidth: 82,
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
  bottomNavigationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#E8DCCB',
    backgroundColor: 'rgba(255, 252, 248, 0.98)',
    ...{
      shadowColor: '#7E6148',
      shadowOpacity: 0.12,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 10 },
      elevation: 6,
    },
  },
  bottomNavigationCardCompact: {
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
    borderRadius: 22,
    gap: 4,
  },
  bottomNavigationItem: {
    flex: 1,
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    gap: 5,
    paddingHorizontal: spacing.xs,
  },
  bottomNavigationItemCompact: {
    minHeight: 50,
    borderRadius: 16,
    gap: 3,
    paddingHorizontal: 2,
  },
  bottomNavigationItemActive: {
    backgroundColor: '#FFF3E8',
  },
  bottomNavigationItemHover: {
    transform: [{ translateY: -2 }, { scale: 1.01 }],
  },
  bottomNavigationItemPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
  },
  bottomNavigationBadge: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1E6D7',
  },
  bottomNavigationBadgeCompact: {
    width: 24,
    height: 24,
    borderRadius: 8,
  },
  bottomNavigationBadgeActive: {
    backgroundColor: palette.accent,
  },
  bottomNavigationBadgeText: {
    color: palette.ink,
    fontSize: 10,
    fontWeight: '800',
  },
  bottomNavigationBadgeTextActive: {
    color: palette.white,
  },
  bottomNavigationLabel: {
    color: palette.mutedInk,
    fontSize: 12,
    fontWeight: '700',
  },
  bottomNavigationLabelCompact: {
    fontSize: 10,
  },
  bottomNavigationLabelActive: {
    color: palette.accent,
  },
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
    backgroundColor: '#FFFBF7',
    borderRadius: 24,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: '#E8DDCF',
    ...shadow.card,
  },
  interactiveCardPressed: {
    opacity: 0.92,
  },
  noticeUnreadCard: {
    borderColor: '#F2C68F',
    backgroundColor: '#FFF8EA',
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
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#F0E5D8',
  },
  liveApprovalCard: {
    overflow: 'hidden',
    gap: spacing.md,
  },
  liveApprovalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'none',
  },
  liveApprovalPulseLarge: {
    position: 'absolute',
    top: -40,
    right: -30,
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(242, 106, 79, 0.12)',
  },
  liveApprovalPulseSmall: {
    position: 'absolute',
    bottom: -28,
    left: -18,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(27, 57, 87, 0.08)',
  },
  liveApprovalCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  chatMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  chatPeerCopy: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 220,
  },
  chatHeaderBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  chatHeaderIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
    minWidth: 260,
  },
  chatHeaderAvatar: {
    width: 52,
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: palette.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatHeaderAvatarText: {
    color: palette.primary,
    fontSize: 16,
    fontWeight: '900',
  },
  chatPanel: {
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E8DDCF',
    backgroundColor: '#FBF7EF',
    gap: spacing.sm,
  },
  chatHistoryPanel: {
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E8DDCF',
    backgroundColor: '#FBF7EF',
    gap: spacing.sm,
    minHeight: 180,
  },
  chatComposer: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  chatWorkspace: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  chatSidebar: {
    flexBasis: 280,
    flexGrow: 1,
    gap: spacing.sm,
  },
  chatConversationPane: {
    flexBasis: 420,
    flexGrow: 2,
    gap: spacing.sm,
    minWidth: 280,
  },
  chatListItem: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E8DDCF',
    backgroundColor: palette.surface,
  },
  chatListItemActive: {
    borderColor: '#C8D9EE',
    backgroundColor: '#F2F7FD',
  },
  chatListAvatar: {
    width: 46,
    height: 46,
    borderRadius: radius.pill,
    backgroundColor: palette.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatListAvatarText: {
    color: palette.accent,
    fontSize: 13,
    fontWeight: '900',
  },
  chatListCopy: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 0,
  },
  chatPreviewList: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  chatPreviewCard: {
    padding: spacing.md,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E8DDCF',
    backgroundColor: palette.surface,
    gap: spacing.xs,
  },
  queuePhotoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  queueMediaCard: {
    gap: spacing.xs,
  },
  securityThreadPhoto: {
    width: 116,
    height: 116,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surfaceMuted,
  },
  threadPanel: {
    padding: spacing.md,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E8DDCF',
    backgroundColor: '#FBF7EF',
    gap: spacing.sm,
  },
  threadTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: palette.ink,
  },
  threadBubble: {
    padding: spacing.md,
    borderRadius: 18,
    gap: spacing.xs,
    maxWidth: '92%',
  },
  threadBubbleSecurity: {
    alignSelf: 'flex-start',
    backgroundColor: palette.blueSoft,
    borderTopLeftRadius: 8,
  },
  threadBubbleResident: {
    alignSelf: 'flex-end',
    backgroundColor: palette.accentSoft,
    borderTopRightRadius: 8,
  },
  threadBubbleTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: palette.ink,
  },
  threadBubbleMessage: {
    fontSize: 14,
    lineHeight: 20,
    color: palette.ink,
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
    borderColor: '#E7D9C6',
    backgroundColor: '#FFF9F1',
  },
  helpdeskLatestUpdateCard: {
    borderColor: '#F0C07C',
    backgroundColor: '#FFF2DC',
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
    borderColor: '#E8D9C9',
    backgroundColor: '#FFF7EE',
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

function humanizeVisitorCategory(category: VisitorCategory) {
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

function addHoursToDateTimeInputValue(hours: number) {
  const value = new Date();
  value.setHours(value.getHours() + hours, 0, 0, 0);
  return value.toISOString().slice(0, 16);
}
