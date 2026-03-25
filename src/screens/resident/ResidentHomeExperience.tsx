import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { ModuleGlyph } from '../../components/ModuleGlyph';
import { Caption, Pill, SurfaceCard } from '../../components/ui';
import { useApp } from '../../state/AppContext';
import { palette, radius, shadow, spacing } from '../../theme/tokens';
import {
  formatCurrency,
  formatLongDate,
  formatShortDate,
  getAmenitiesForSociety,
  getAnnouncementsForSociety,
  getChatMessagesForThread,
  getDirectChatThreadsForUser,
  getCommunityMembersForSociety,
  getCurrentUser,
  getEntryLogsForSociety,
  getGuardRosterForSociety,
  getImportantContactsForSociety,
  getMembershipForSociety,
  getPendingSecurityGuestRequestsForResident,
  getPaymentsForUserSociety,
  getResidenceProfileForUserSociety,
  getResidentOverview,
  getRulesForSociety,
  getSecurityGuestRequestTone,
  getSelectedSociety,
  getSocietyChatThread,
  getStaffVerificationDirectory,
  getUnitsForSociety,
  getVehicleDirectoryForSociety,
  getVisitorPassesForUserSociety,
  humanizeSecurityGuestRequestStatus,
} from '../../utils/selectors';

type ResidentTab = 'home' | 'visitors' | 'community' | 'billing' | 'notices' | 'bookings' | 'helpdesk' | 'profile';
type ResidentVisitorsSection = 'create' | 'approvals' | 'history' | 'desk';
type ResidentBillingSection = 'pay' | 'reminders' | 'outstanding' | 'history';
type ResidentBookingsSection = 'booking' | 'amenities' | 'history';
type ResidentProfileSection = 'household' | 'vehicles' | 'staff';
type AccentTone = 'accent' | 'blue' | 'gold' | 'primary';
type HomeHubSectionKey = 'visitors' | 'billing' | 'community' | 'services';
type HubTile = {
  label: string;
  subtitle: string;
  badge: string;
  tab: ResidentTab;
  tone: AccentTone;
  onPress?: () => void;
  statusLabel?: string;
};
type HubShortcut = {
  label: string;
  value: string;
  onPress: () => void;
};
type HubFact = {
  label: string;
  value: string;
};
type HomeConversationPreview = {
  key: string;
  title: string;
  subtitle: string;
  detail: string;
  badge: string;
  tone: AccentTone;
  incomingCount: number;
  onPress: () => void;
};
type HubConfig = {
  pillLabel: string;
  pillTone: 'primary' | 'accent' | 'warning' | 'success';
  title: string;
  description: string;
  metaValue: string;
  metaLabel: string;
  tiles: HubTile[];
  spotlightPill: string;
  spotlightPillTone: 'primary' | 'accent' | 'warning' | 'success';
  spotlightTitle: string;
  spotlightDescription: string;
  facts: HubFact[];
  shortcuts: HubShortcut[];
  ctaLabel: string;
  ctaAction: () => void;
};

const accentStyles = {
  accent: { badgeBackground: '#FFE4DE', badgeText: palette.accent, borderColor: '#F6D8D0' },
  blue: { badgeBackground: '#E4EEFC', badgeText: palette.blue, borderColor: '#D6E2F7' },
  gold: { badgeBackground: '#FFF1D8', badgeText: palette.warning, borderColor: '#F4E3B9' },
  primary: { badgeBackground: '#E1E9F2', badgeText: palette.primary, borderColor: '#D7E0EA' },
} as const;

export function ResidentHomeExperience({
  societyId,
  userId,
  canUseAdmin,
  onOpenTab,
  onOpenCommunitySection,
  onOpenVisitorsSection,
  onOpenBillingSection,
  onOpenBookingsSection,
  onOpenProfileSection,
  onOpenWorkspaces,
  onSwitchAdmin,
}: {
  societyId: string;
  userId: string;
  canUseAdmin: boolean;
  onOpenTab: (tab: ResidentTab) => void;
  onOpenCommunitySection: (section: 'members' | 'vehicles' | 'contacts' | 'staff' | 'chat') => void;
  onOpenVisitorsSection: (section: ResidentVisitorsSection) => void;
  onOpenBillingSection: (section: ResidentBillingSection) => void;
  onOpenBookingsSection: (section: ResidentBookingsSection) => void;
  onOpenProfileSection: (section: ResidentProfileSection) => void;
  onOpenWorkspaces: () => void;
  onSwitchAdmin: () => void;
}) {
  const { state } = useApp();
  const [activeHub, setActiveHub] = useState<HomeHubSectionKey>('community');
  const { width } = useWindowDimensions();
  const isCompact = width < 768;
  const user = getCurrentUser(state.data, userId);
  const society = getSelectedSociety(state.data, societyId);
  const membership = getMembershipForSociety(state.data, userId, societyId);

  if (!user || !society || !membership) {
    return null;
  }

  const overview = getResidentOverview(state.data, userId, societyId);
  const unitIds = new Set(membership.unitIds);
  const units = getUnitsForSociety(state.data, societyId).filter((unit) => unitIds.has(unit.id));
  const unitCodes = units.map((unit) => unit.code);
  const primaryUnitLabel = unitCodes[0] ?? 'Resident';
  const firstName = user.name.split(' ')[0] ?? user.name;
  const announcements = getAnnouncementsForSociety(state.data, societyId, membership.roles);
  const rules = getRulesForSociety(state.data, societyId);
  const communityMembers = getCommunityMembersForSociety(state.data, societyId);
  const amenities = getAmenitiesForSociety(state.data, societyId);
  const payments = getPaymentsForUserSociety(state.data, userId, societyId);
  const residenceProfile = getResidenceProfileForUserSociety(state.data, userId, societyId);
  const importantContacts = getImportantContactsForSociety(state.data, societyId);
  const contacts = importantContacts.slice(0, 3);
  const securityContacts = importantContacts.filter((contact) => contact.category === 'security');
  const staffRecords = getStaffVerificationDirectory(state.data, societyId).filter(
    ({ employerUnits, staff }) =>
      employerUnits.some((unit) => unitIds.has(unit.id)) || staff.requestedByUserId === userId,
  );
  const vehicles = getVehicleDirectoryForSociety(state.data, societyId).filter(
    ({ vehicle }) => vehicle.userId === userId || unitIds.has(vehicle.unitId),
  );
  const guards = getGuardRosterForSociety(state.data, societyId);
  const visitorPasses = getVisitorPassesForUserSociety(state.data, userId, societyId);
  const societyChatThread = getSocietyChatThread(state.data, societyId);
  const directChatThreads = getDirectChatThreadsForUser(state.data, societyId, userId);
  const pendingSecurityGuestRequests = getPendingSecurityGuestRequestsForResident(
    state.data,
    userId,
    societyId,
  );
  const entryLogs = getEntryLogsForSociety(state.data, societyId)
    .filter(({ entry }) => entry.unitId && unitIds.has(entry.unitId))
    .slice(0, 3);

  const openTicketCount = overview.myComplaints.filter((item) => item.status !== 'resolved').length;
  const outstandingAmountLabel = overview.totalDue > 0 ? formatCurrency(overview.totalDue) : 'All clear';
  const latestNotice = announcements[0];
  const latestRule = rules[0];
  const serviceCount = amenities.length + staffRecords.length + contacts.length;
  const societyChatMessages = societyChatThread ? getChatMessagesForThread(state.data, societyChatThread.id) : [];
  const directChatSummaries = directChatThreads.map((threadEntry) => {
    const member = threadEntry.peer
      ? communityMembers.find(({ user: memberUser }) => memberUser.id === threadEntry.peer?.id)
      : undefined;
    const messages = threadEntry.thread.id
      ? getChatMessagesForThread(state.data, threadEntry.thread.id)
      : [];

    return {
      ...threadEntry,
      member,
      messages,
      incomingCount: messages.filter(({ message }) => message.senderUserId !== userId).length,
    };
  });
  const chatRoomCount = (societyChatThread ? 1 : 0) + directChatSummaries.length;
  const latestDirectChat = directChatSummaries[0];
  const groupMessageCount = societyChatMessages.length;
  const incomingGroupCount = societyChatMessages.filter(({ message }) => message.senderUserId !== userId).length;
  const incomingDirectCount = directChatSummaries.reduce((total, threadEntry) => total + threadEntry.incomingCount, 0);
  const totalIncomingChatCount = incomingGroupCount + incomingDirectCount;
  const communityStaffCount = staffRecords.length + guards.length;
  const unreadNoticeCount = overview.unreadAnnouncements.length;
  const scheduledVisitorCount = visitorPasses.filter(({ visitorPass }) => visitorPass.status === 'scheduled').length;
  const checkedInVisitorCount = visitorPasses.filter(({ visitorPass }) => visitorPass.status === 'checkedIn').length;
  const completedVisitorCount = visitorPasses.filter(({ visitorPass }) => visitorPass.status === 'completed').length;
  const latestPayment = payments[0];
  const reminderCount = overview.myPaymentReminders.length;
  const recentHomeConversations: HomeConversationPreview[] = [
    {
      key: 'society-group',
      title: `${society.name} group`,
      subtitle: societyChatMessages[societyChatMessages.length - 1]?.message.body ?? 'Start the community group conversation.',
      detail: `${groupMessageCount} message(s)`,
      badge: 'FM',
      tone: 'accent' as const,
      incomingCount: incomingGroupCount,
      onPress: () => onOpenCommunitySection('chat'),
    },
    ...directChatSummaries.slice(0, 3).map((threadEntry) => ({
      key: threadEntry.thread.id,
      title: threadEntry.peer?.name ?? 'Resident chat',
      subtitle: threadEntry.latestMessage?.body ?? 'Start a quick private update.',
      detail: threadEntry.member
        ? `${threadEntry.member.units[0]?.code ?? 'Unit'} · ${threadEntry.member.residenceProfile?.residentType ?? 'Resident'}`
        : 'Private conversation',
      badge: 'CP',
      tone: 'blue' as const,
      incomingCount: threadEntry.incomingCount,
      onPress: () => onOpenCommunitySection('chat'),
    })),
  ].filter((conversation) => conversation.incomingCount > 0 || conversation.detail !== '0 message(s)');

  const topCategories = [
    {
      key: 'visitors' as const,
      label: 'Visitors',
      badge: 'VS',
      subtitle: scheduledVisitorCount > 0
        ? `${scheduledVisitorCount} pass(es)`
        : 'Create pass',
      tone: 'gold' as const,
      onPress: () => setActiveHub('visitors'),
      active: activeHub === 'visitors',
    },
    {
      key: 'billing' as const,
      label: 'My Bills',
      badge: 'BL',
      subtitle: outstandingAmountLabel,
      tone: 'accent' as const,
      onPress: () => setActiveHub('billing'),
      active: activeHub === 'billing',
    },
    {
      key: 'community' as const,
      label: 'Society',
      badge: 'SC',
      subtitle: `${communityMembers.length} members`,
      tone: 'primary' as const,
      onPress: () => setActiveHub('community'),
      active: activeHub === 'community',
    },
    {
      key: 'services' as const,
      label: 'Services',
      badge: 'SV',
      subtitle: `${serviceCount} tools`,
      tone: 'blue' as const,
      onPress: () => setActiveHub('services'),
      active: activeHub === 'services',
    },
  ];

  const communityTiles: HubTile[] = [
    {
      label: 'Members',
      subtitle: `${communityMembers.length} residents`,
      badge: 'DR',
      tab: 'community' as const,
      tone: 'gold' as const,
      onPress: () => onOpenCommunitySection('members'),
    },
    {
      label: 'Chats',
      subtitle:
        totalIncomingChatCount > 0
          ? `${totalIncomingChatCount} new message(s)`
          : chatRoomCount > 0
            ? `${chatRoomCount} active room(s)`
            : 'Start community chat',
      badge: 'CP',
      tab: 'community' as const,
      tone: 'blue' as const,
      onPress: () => onOpenCommunitySection('chat'),
      statusLabel: totalIncomingChatCount > 0 ? `${totalIncomingChatCount} new` : undefined,
    },
    {
      label: 'Vehicles',
      subtitle: vehicles.length > 0 ? `${vehicles.length} registered` : 'Add your vehicle',
      badge: 'MV',
      tab: 'community' as const,
      tone: 'primary' as const,
      onPress: () => onOpenCommunitySection('vehicles'),
    },
    {
      label: 'Important Contacts',
      subtitle: importantContacts.length > 0 ? `${importantContacts.length} saved` : 'Keep key numbers handy',
      badge: 'CT',
      tab: 'community' as const,
      tone: 'primary' as const,
      onPress: () => onOpenCommunitySection('contacts'),
    },
    {
      label: 'Staff & Guards',
      subtitle: communityStaffCount > 0 ? `${communityStaffCount} on record` : 'Staff directory',
      badge: 'ST',
      tab: 'community' as const,
      tone: 'accent' as const,
      onPress: () => onOpenCommunitySection('staff'),
    },
    {
      label: 'Notices',
      subtitle: latestNotice ? formatShortDate(latestNotice.createdAt) : 'Latest update',
      badge: 'NT',
      tab: 'notices' as const,
      tone: 'gold' as const,
    },
    {
      label: 'Gate Access',
      subtitle: visitorPasses.length > 0 ? `${visitorPasses.length} visitor pass(es)` : 'Security desk',
      badge: 'AC',
      tab: 'visitors' as const,
      tone: 'blue' as const,
      onPress: () => onOpenVisitorsSection('desk'),
    },
  ];

  const visitorsTiles: HubTile[] = [
    {
      label: 'Create Pass',
      subtitle: scheduledVisitorCount > 0 ? `${scheduledVisitorCount} scheduled` : 'Create now',
      badge: 'VP',
      tab: 'visitors',
      tone: 'gold',
      onPress: () => onOpenVisitorsSection('create'),
    },
    {
      label: 'Approvals',
      subtitle:
        pendingSecurityGuestRequests.length > 0
          ? `${pendingSecurityGuestRequests.length} gate approval(s)`
          : 'No live approval',
      badge: 'AC',
      tab: 'visitors',
      tone: 'accent',
      onPress: () => onOpenVisitorsSection('approvals'),
    },
    {
      label: 'Visit History',
      subtitle: checkedInVisitorCount > 0 ? `${checkedInVisitorCount} active` : `${visitorPasses.length} tracked`,
      badge: 'IN',
      tab: 'visitors',
      tone: 'primary',
      onPress: () => onOpenVisitorsSection('history'),
    },
    {
      label: 'Security Desk',
      subtitle: guards.length > 0 ? `${guards.length} guards` : 'Support desk',
      badge: 'SD',
      tab: 'visitors',
      tone: 'primary',
      onPress: () => onOpenVisitorsSection('desk'),
    },
    {
      label: 'Gate Notes',
      subtitle: latestNotice ? formatShortDate(latestNotice.createdAt) : 'Resident updates',
      badge: 'NT',
      tab: 'notices',
      tone: 'accent',
    },
    {
      label: 'Security Contacts',
      subtitle: securityContacts.length > 0 ? `${securityContacts.length} contact(s)` : 'Important contact',
      badge: 'CT',
      tab: 'community',
      tone: 'blue',
      onPress: () => onOpenCommunitySection('contacts'),
    },
  ];

  const billingTiles: HubTile[] = [
    {
      label: 'Pay Now',
      subtitle: overview.outstandingInvoices.length > 0 ? outstandingAmountLabel : 'Payment setup',
      badge: 'PY',
      tab: 'billing',
      tone: 'accent',
      onPress: () => onOpenBillingSection('pay'),
    },
    {
      label: 'Reminders',
      subtitle: reminderCount > 0 ? `${reminderCount} alerts` : 'No reminder',
      badge: 'RM',
      tab: 'billing',
      tone: 'blue',
      onPress: () => onOpenBillingSection('reminders'),
    },
    {
      label: 'Outstanding Dues',
      subtitle: overview.outstandingInvoices.length > 0 ? `${overview.outstandingInvoices.length} unpaid` : 'All clear',
      badge: 'DU',
      tab: 'billing',
      tone: 'gold',
      onPress: () => onOpenBillingSection('outstanding'),
    },
    {
      label: 'Payment History',
      subtitle: latestPayment ? formatShortDate(latestPayment.payment.paidAt) : 'No payment yet',
      badge: 'RC',
      tab: 'billing',
      tone: 'primary',
      onPress: () => onOpenBillingSection('history'),
    },
    {
      label: 'Billing Notices',
      subtitle: latestRule ? formatShortDate(latestRule.publishedAt) : 'Policy updates',
      badge: 'NT',
      tab: 'notices',
      tone: 'gold',
    },
  ];

  const serviceTiles: HubTile[] = [
    {
      label: 'Amenities',
      subtitle: amenities.length > 0 ? `${amenities.length} spaces` : 'Book now',
      badge: 'AM',
      tab: 'bookings',
      tone: 'gold',
      onPress: () => onOpenBookingsSection('amenities'),
    },
    {
      label: 'Helpdesk',
      subtitle: openTicketCount > 0 ? `${openTicketCount} open` : 'Raise issue',
      badge: 'HD',
      tab: 'helpdesk',
      tone: 'accent',
    },
    {
      label: 'Daily Helps',
      subtitle: staffRecords.length > 0 ? `${staffRecords.length} records` : 'Register staff',
      badge: 'DH',
      tab: 'profile',
      tone: 'primary',
      onPress: () => onOpenProfileSection('staff'),
    },
    {
      label: 'Book Amenity',
      subtitle: overview.myBookings.length > 0 ? `${overview.myBookings.length} active` : 'Plan a booking',
      badge: 'BK',
      tab: 'bookings',
      tone: 'blue',
      onPress: () => onOpenBookingsSection('booking'),
    },
    {
      label: 'Move Support',
      subtitle: vehicles.length > 0 ? `${vehicles.length} vehicle(s)` : 'Household prep',
      badge: 'MV',
      tab: 'community',
      tone: 'accent',
      onPress: () => onOpenCommunitySection('vehicles'),
    },
    {
      label: 'Access Desk',
      subtitle: visitorPasses.length > 0 ? `${visitorPasses.length} visit(s)` : 'Gate support',
      badge: 'AC',
      tab: 'visitors',
      tone: 'blue',
      onPress: () => onOpenVisitorsSection('desk'),
    },
  ];

  const communityShortcuts: HubShortcut[] = [
    {
      label: 'Members',
      value: `${communityMembers.length}`,
      onPress: () => onOpenCommunitySection('members'),
    },
    {
      label: 'Chats',
      value: totalIncomingChatCount > 0 ? `${totalIncomingChatCount} new` : `${chatRoomCount} live`,
      onPress: () => onOpenCommunitySection('chat'),
    },
    {
      label: 'Vehicles',
      value: `${vehicles.length} saved`,
      onPress: () => onOpenCommunitySection('vehicles'),
    },
    {
      label: 'Contacts',
      value: `${importantContacts.length} ready`,
      onPress: () => onOpenCommunitySection('contacts'),
    },
    {
      label: 'Staff',
      value: `${communityStaffCount} listed`,
      onPress: () => onOpenCommunitySection('staff'),
    },
  ];

  const visitorsShortcuts: HubShortcut[] = [
    {
      label: 'Create pass',
      value: `${scheduledVisitorCount} pending`,
      onPress: () => onOpenVisitorsSection('create'),
    },
    {
      label: 'Approvals',
      value: `${pendingSecurityGuestRequests.length} live`,
      onPress: () => onOpenVisitorsSection('approvals'),
    },
    {
      label: 'Security',
      value: `${guards.length} guards`,
      onPress: () => onOpenVisitorsSection('desk'),
    },
  ];

  const billingShortcuts: HubShortcut[] = [
    {
      label: 'Due now',
      value: outstandingAmountLabel,
      onPress: () => onOpenBillingSection('outstanding'),
    },
    {
      label: 'Latest paid',
      value: latestPayment ? formatShortDate(latestPayment.payment.paidAt) : 'No record',
      onPress: () => onOpenBillingSection('history'),
    },
    {
      label: 'Pay',
      value: `${overview.myPendingPayments.length} pending`,
      onPress: () => onOpenBillingSection('pay'),
    },
  ];

  const servicesShortcuts: HubShortcut[] = [
    {
      label: 'Bookings',
      value: `${overview.myBookings.length} active`,
      onPress: () => onOpenBookingsSection('history'),
    },
    {
      label: 'Helpdesk',
      value: `${openTicketCount} open`,
      onPress: () => onOpenTab('helpdesk'),
    },
    {
      label: 'Staff',
      value: `${staffRecords.length} records`,
      onPress: () => onOpenProfileSection('staff'),
    },
  ];

  const hubConfigs: Record<HomeHubSectionKey, HubConfig> = {
    visitors: {
      pillLabel: 'Gate access',
      pillTone: 'warning',
      title: 'Visitors, passes, and gate access in one flow',
      description: 'Handle guest arrivals, security coordination, and access visibility from one smooth resident hub.',
      metaValue: String(visitorsTiles.length),
      metaLabel: 'visitor tools',
      tiles: visitorsTiles,
      spotlightPill: 'Visitors',
      spotlightPillTone: 'warning',
      spotlightTitle: 'Gate-ready visits, without the back and forth',
      spotlightDescription: 'Create passes early, help security prepare, and keep every arrival clear for your household.',
      facts: [
        { label: 'scheduled', value: String(scheduledVisitorCount) },
        { label: 'checked in', value: String(checkedInVisitorCount) },
        { label: 'completed', value: String(completedVisitorCount) },
      ],
      shortcuts: visitorsShortcuts,
      ctaLabel: 'Open Visitors',
      ctaAction: () => onOpenVisitorsSection('create'),
    },
    billing: {
      pillLabel: 'Billing desk',
      pillTone: 'accent',
      title: 'Bills, receipts, and reminders with better clarity',
      description: 'Track dues, payment proof, reviews, and society billing updates from a calmer dashboard.',
      metaValue: String(billingTiles.length),
      metaLabel: 'billing tools',
      tiles: billingTiles,
      spotlightPill: 'My Bills',
      spotlightPillTone: 'accent',
      spotlightTitle: 'Your billing health, organized and easy to act on',
      spotlightDescription: 'See what is due, what is cleared, and what still needs attention without digging through records.',
      facts: [
        { label: 'unpaid invoices', value: String(overview.outstandingInvoices.length) },
        { label: 'payments', value: String(payments.length) },
        { label: 'reminders', value: String(reminderCount) },
      ],
      shortcuts: billingShortcuts,
      ctaLabel: 'Open My Bills',
      ctaAction: () => onOpenBillingSection('pay'),
    },
    community: {
      pillLabel: 'Society central',
      pillTone: 'warning',
      title: 'Society essentials, beautifully connected',
      description: 'Explore resident tools, community updates, billing, and security access from one rich hub.',
      metaValue: String(communityTiles.length),
      metaLabel: 'core modules',
      tiles: communityTiles,
      spotlightPill: 'My Society',
      spotlightPillTone: 'accent',
      spotlightTitle: 'Everything in your society, in one place',
      spotlightDescription: 'Open the resident directory, latest notices, payments, and access essentials from this hub.',
      facts: [
        { label: 'members', value: String(communityMembers.length) },
        { label: 'chat rooms', value: String(chatRoomCount) },
        { label: 'vehicles', value: String(vehicles.length) },
        { label: 'contacts', value: String(importantContacts.length) },
        { label: 'staff and guards', value: String(communityStaffCount) },
      ],
      shortcuts: communityShortcuts,
      ctaLabel: 'Open My Society',
      ctaAction: () => onOpenCommunitySection('members'),
    },
    services: {
      pillLabel: 'Daily services',
      pillTone: 'primary',
      title: 'Services that keep daily living running smoothly',
      description: 'Jump into amenities, helpdesk, household staff, and day-to-day resident operations from one elegant section.',
      metaValue: String(serviceTiles.length),
      metaLabel: 'service tools',
      tiles: serviceTiles,
      spotlightPill: 'Services',
      spotlightPillTone: 'primary',
      spotlightTitle: 'Daily services, organized around your home',
      spotlightDescription: 'Move faster between bookings, support, staff coordination, and household management tasks.',
      facts: [
        { label: 'bookings', value: String(overview.myBookings.length) },
        { label: 'open issues', value: String(openTicketCount) },
        { label: 'staff records', value: String(staffRecords.length) },
      ],
      shortcuts: servicesShortcuts,
      ctaLabel: 'Open Services',
      ctaAction: () => onOpenBookingsSection('booking'),
    },
  };

  const activeHubConfig = hubConfigs[activeHub];

  const actionCards = [
    {
      title: 'Society chat',
      body: chatRoomCount > 0 ? `${chatRoomCount} chat room(s) active.` : 'Start a society group or direct conversation.',
      module: 'CP',
      tone: 'blue' as const,
      onPress: () => onOpenCommunitySection('chat'),
    },
    {
      title: 'Helpdesk',
      body: openTicketCount > 0 ? `${openTicketCount} ticket(s) already active.` : 'Raise issues fast and track progress.',
      module: 'HD',
      tone: 'accent' as const,
      onPress: () => onOpenTab('helpdesk'),
    },
    {
      title: 'Services',
      body: amenities[0]?.name ? `Book ${amenities[0].name} or another common space.` : 'Open amenity bookings and service actions.',
      module: 'BK',
      tone: 'gold' as const,
      onPress: () => onOpenBookingsSection('booking'),
    },
    {
      title: 'Visit desk',
      body: visitorPasses.length > 0 ? `${visitorPasses.length} visitor pass(es) tracked.` : 'Create passes and track visitor movement.',
      module: 'VP',
      tone: 'primary' as const,
      onPress: () => onOpenVisitorsSection('create'),
    },
    {
      title: 'Resident directory',
      body: `${communityMembers.length} members, contacts, and staff profiles in one place.`,
      module: 'DR',
      tone: 'blue' as const,
      onPress: () => onOpenCommunitySection('members'),
    },
  ];

  const promoCards = [
    {
      title: overview.totalDue > 0 ? 'Maintenance due' : 'Billing healthy',
      highlight: overview.totalDue > 0 ? outstandingAmountLabel : 'No due now',
      body:
        overview.totalDue > 0
          ? 'Clear dues quickly and keep your resident ledger audit-ready.'
          : 'Your current maintenance cycle is in a healthy state.',
      action: 'Open bills',
      tone: 'accent' as const,
      onPress: () => onOpenBillingSection(overview.totalDue > 0 ? 'outstanding' : 'pay'),
    },
    {
      title: 'Community access',
      highlight: `${chatRoomCount} chats · ${communityMembers.length} members`,
      body:
        residenceProfile?.residentType
          ? `Registered as ${residenceProfile.residentType}. Keep household details fresh.`
          : 'Complete your profile to unlock a smoother society experience.',
      action: 'My Society',
      tone: 'blue' as const,
      onPress: () => onOpenCommunitySection('members'),
    },
  ];

  return (
    <>
      <AnnouncementTicker announcements={announcements} isCompact={isCompact} />

      {!isCompact ? (
      <View style={styles.utilityBar}>
        <Pressable onPress={() => onOpenTab('profile')} style={({ pressed }) => [styles.unitPill, pressed ? styles.pressed : null]}>
          <View style={styles.unitAvatar}>
            <Text style={styles.unitAvatarText}>{user.avatarInitials}</Text>
          </View>
          <View style={styles.unitMeta}>
            <Text style={styles.unitCode}>{primaryUnitLabel}</Text>
            <Caption style={styles.unitMetaText}>{firstName}</Caption>
          </View>
        </Pressable>

        <Pressable onPress={onOpenWorkspaces} style={({ pressed }) => [styles.workspacePill, pressed ? styles.pressed : null]}>
          <View style={styles.workspaceBadge}>
            <Text style={styles.workspaceBadgeText}>SO</Text>
          </View>
          <View style={styles.workspaceCopy}>
            <Text style={styles.workspaceTitle}>{society.name}</Text>
            <Caption>{society.area}, {society.city}</Caption>
          </View>
        </Pressable>

        <View style={styles.utilityIcons}>
          <RoundUtilityButton label="WK" onPress={onOpenWorkspaces} />
          {canUseAdmin ? <RoundUtilityButton label="AD" onPress={onSwitchAdmin} /> : null}
          <View style={styles.profileRing}>
            <Text style={styles.profileRingText}>{user.avatarInitials}</Text>
          </View>
        </View>
      </View>
      ) : null}

      <View style={[styles.categoryStrip, isCompact ? styles.categoryStripCompact : null]}>
        {topCategories.map((category) => (
          <TopCategoryCard
            key={category.label}
            label={category.label}
            subtitle={category.subtitle}
            badge={category.badge}
            tone={category.tone}
            active={category.active}
            onPress={category.onPress}
            compact={isCompact}
          />
        ))}
      </View>

      {pendingSecurityGuestRequests.length > 0 ? (
        <SurfaceCard style={styles.urgentApprovalPanel}>
          <View style={[styles.panelHeader, isCompact ? styles.panelHeaderCompact : null]}>
            <View style={styles.panelHeaderLeft}>
              <Text style={styles.panelTitle}>Gate approvals waiting</Text>
              <Pill label={`${pendingSecurityGuestRequests.length} live`} tone="warning" />
            </View>
            <Pressable onPress={() => onOpenTab('visitors')} style={({ pressed }) => [styles.seeAllLink, pressed ? styles.pressed : null]}>
              <Text style={styles.seeAllText}>Open visitors</Text>
            </Pressable>
          </View>
          <View style={[styles.urgentApprovalRow, isCompact ? styles.urgentApprovalRowCompact : null]}>
            {pendingSecurityGuestRequests.slice(0, 2).map(({ request }) => (
              <Pressable
                key={request.id}
                onPress={() => onOpenTab('visitors')}
                style={({ pressed }) => [
                  styles.urgentApprovalCard,
                  isCompact ? styles.urgentApprovalCardCompact : null,
                  pressed ? styles.pressed : null,
                ]}
              >
                <View style={styles.rowBetween}>
                  <Text style={styles.urgentApprovalTitle}>{request.guestName}</Text>
                  <Pill
                    label={humanizeSecurityGuestRequestStatus(request.status)}
                    tone={getSecurityGuestRequestTone(request.status)}
                  />
                </View>
                <Caption>{request.purpose}</Caption>
              </Pressable>
            ))}
          </View>
        </SurfaceCard>
      ) : null}

      {isCompact ? (
        <SurfaceCard style={styles.compactHubCard}>
          <View style={styles.compactHubHeader}>
            <View style={styles.compactHubHeaderCopy}>
              <Text style={styles.compactHubTitle}>{activeHubConfig.pillLabel}</Text>
              <Caption>{activeHubConfig.metaValue} {activeHubConfig.metaLabel}</Caption>
            </View>
            <Pill label={activeHubConfig.metaValue} tone={activeHubConfig.pillTone} />
          </View>
          <View style={styles.compactHubGrid}>
            {activeHubConfig.tiles.map((tile) => (
              <CompactHubTile
                key={tile.label}
                label={tile.label}
                subtitle={tile.subtitle}
                badge={tile.badge}
                tone={tile.tone}
                statusLabel={tile.statusLabel}
                onPress={tile.onPress ?? (() => onOpenTab(tile.tab))}
              />
            ))}
          </View>
        </SurfaceCard>
      ) : (
      <SurfaceCard style={[styles.superBoard, isCompact ? styles.superBoardCompact : null]}>
        <View style={[styles.superBoardHeader, isCompact ? styles.superBoardHeaderCompact : null]}>
          <View style={[styles.superBoardHeaderCopy, isCompact ? styles.superBoardHeaderCopyCompact : null]}>
            <Pill label={activeHubConfig.pillLabel} tone={activeHubConfig.pillTone} />
            <Text style={[styles.superBoardTitle, isCompact ? styles.superBoardTitleCompact : null]}>
              {activeHubConfig.title}
            </Text>
            <Caption style={[styles.superBoardDescription, isCompact ? styles.superBoardDescriptionCompact : null]}>
              {activeHubConfig.description}
            </Caption>
          </View>
          <View style={[styles.superBoardMeta, isCompact ? styles.superBoardMetaCompact : null]}>
            <Text style={styles.superBoardMetaValue}>{activeHubConfig.metaValue}</Text>
            <Caption style={[styles.superBoardMetaText, isCompact ? styles.superBoardMetaTextCompact : null]}>
              {activeHubConfig.metaLabel}
            </Caption>
          </View>
        </View>

        <View style={[styles.superBoardBody, isCompact ? styles.superBoardBodyCompact : null]}>
          <View style={[styles.superBoardGrid, isCompact ? styles.superBoardGridCompact : null]}>
            {activeHubConfig.tiles.map((tile) => (
              <BoardTile
                key={tile.label}
                label={tile.label}
                subtitle={tile.subtitle}
                badge={tile.badge}
                tone={tile.tone}
                statusLabel={tile.statusLabel}
                onPress={tile.onPress ?? (() => onOpenTab(tile.tab))}
                compact={isCompact}
              />
            ))}
          </View>

          <View style={[styles.mySocietyBanner, isCompact ? styles.mySocietyBannerCompact : null]}>
            <View style={[styles.mySocietyContent, isCompact ? styles.mySocietyContentCompact : null]}>
              <View style={[styles.mySocietyCopy, isCompact ? styles.mySocietyCopyCompact : null]}>
                <Pill label={activeHubConfig.spotlightPill} tone={activeHubConfig.spotlightPillTone} />
                <Text style={[styles.mySocietyTitle, isCompact ? styles.mySocietyTitleCompact : null]}>
                  {activeHubConfig.spotlightTitle}
                </Text>
                <Caption style={[styles.mySocietyDescription, isCompact ? styles.mySocietyDescriptionCompact : null]}>
                  {activeHubConfig.spotlightDescription}
                </Caption>
                <View style={styles.mySocietyFacts}>
                  {activeHubConfig.facts.map((fact) => (
                    <View key={fact.label} style={[styles.mySocietyFact, isCompact ? styles.mySocietyFactCompact : null]}>
                      <Text style={styles.mySocietyFactValue}>{fact.value}</Text>
                      <Caption>{fact.label}</Caption>
                    </View>
                  ))}
                </View>
                <View style={styles.hubShortcutRow}>
                  {activeHubConfig.shortcuts.map((shortcut) => (
                    <Pressable
                      key={shortcut.label}
                      onPress={shortcut.onPress}
                      style={({ pressed }) => [
                        styles.hubShortcutCard,
                        isCompact ? styles.hubShortcutCardCompact : null,
                        pressed ? styles.pressed : null,
                      ]}
                    >
                      <Text style={styles.hubShortcutValue}>{shortcut.value}</Text>
                      <Caption>{shortcut.label}</Caption>
                    </Pressable>
                  ))}
                </View>
              </View>
              {!isCompact ? (
              <View style={styles.mySocietyVisual}>
                <View style={styles.mySocietyScene}>
                  <View style={styles.sceneBuildingTall} />
                  <View style={styles.sceneBuildingMedium} />
                  <View style={styles.sceneBuildingShort} />
                </View>
              </View>
              ) : null}
            </View>
            <Pressable
              onPress={activeHubConfig.ctaAction}
              style={({ pressed }) => [
                styles.mySocietyButton,
                isCompact ? styles.mySocietyButtonCompact : null,
                pressed ? styles.pressed : null,
              ]}
            >
              <Text style={styles.mySocietyButtonText}>{activeHubConfig.ctaLabel}</Text>
            </Pressable>
          </View>
        </View>
      </SurfaceCard>
      )}

      {activeHub === 'community' && recentHomeConversations.length > 0 ? (
        <SurfaceCard style={styles.chatActivityPanel}>
          <View style={[styles.panelHeader, isCompact ? styles.panelHeaderCompact : null]}>
            <View style={styles.panelHeaderLeft}>
              <Text style={styles.panelTitle}>Recent conversations</Text>
              <Pill
                label={totalIncomingChatCount > 0 ? `${totalIncomingChatCount} new` : `${recentHomeConversations.length} open`}
                tone={totalIncomingChatCount > 0 ? 'accent' : 'primary'}
              />
            </View>
            <Pressable onPress={() => onOpenCommunitySection('chat')} style={({ pressed }) => [styles.seeAllLink, pressed ? styles.pressed : null]}>
              <Text style={styles.seeAllText}>Open chats</Text>
            </Pressable>
          </View>

          <ScrollView horizontal contentContainerStyle={styles.chatActivityScroller} showsHorizontalScrollIndicator={false}>
            {recentHomeConversations.map((conversation) => (
              <ConversationPreviewCard
                key={conversation.key}
                title={conversation.title}
                subtitle={conversation.subtitle}
                detail={conversation.detail}
                badge={conversation.badge}
                tone={conversation.tone}
                incomingCount={conversation.incomingCount}
                onPress={conversation.onPress}
                compact={isCompact}
              />
            ))}
          </ScrollView>
        </SurfaceCard>
      ) : null}

      <SurfaceCard style={styles.actionsPanel}>
        <View style={[styles.panelHeader, isCompact ? styles.panelHeaderCompact : null]}>
          <View style={styles.panelHeaderLeft}>
            <Text style={styles.panelTitle}>Your actions</Text>
            <Pill label="New" tone="accent" />
          </View>
          <Pressable onPress={() => onOpenTab('bookings')} style={({ pressed }) => [styles.seeAllLink, pressed ? styles.pressed : null]}>
            <Text style={styles.seeAllText}>See all</Text>
          </Pressable>
        </View>

        <ScrollView horizontal contentContainerStyle={styles.actionScroller} showsHorizontalScrollIndicator={false}>
          {actionCards.map((card) => (
            <ActionCard
              key={card.title}
              title={card.title}
              body={card.body}
              module={card.module}
              tone={card.tone}
              onPress={card.onPress}
              compact={isCompact}
            />
          ))}
        </ScrollView>
      </SurfaceCard>

      <ScrollView horizontal contentContainerStyle={styles.promoScroller} showsHorizontalScrollIndicator={false}>
        {promoCards.map((card) => (
          <PromoCard
            key={card.title}
            title={card.title}
            highlight={card.highlight}
            body={card.body}
            action={card.action}
            tone={card.tone}
            onPress={card.onPress}
            compact={isCompact}
          />
        ))}
      </ScrollView>

      <SurfaceCard style={styles.noticePanel}>
        <View style={[styles.panelHeader, isCompact ? styles.panelHeaderCompact : null]}>
          <Text style={styles.panelTitle}>Society Notices</Text>
          <Pressable onPress={() => onOpenTab('notices')} style={({ pressed }) => [styles.seeAllLink, pressed ? styles.pressed : null]}>
            <Text style={styles.seeAllText}>See all</Text>
          </Pressable>
        </View>

        <ScrollView horizontal contentContainerStyle={styles.noticeScroller} showsHorizontalScrollIndicator={false}>
          {latestNotice ? announcements.slice(0, 3).map((announcement) => (
            <NoticeCard
              key={announcement.id}
              title={announcement.title}
              subtitle={announcement.body}
              meta={formatShortDate(announcement.createdAt)}
              tone={announcement.priority === 'critical' ? 'accent' : announcement.priority === 'high' ? 'gold' : 'primary'}
              onPress={() => onOpenTab('notices')}
              compact={isCompact}
            />
          )) : latestRule ? (
            <NoticeCard
              title={latestRule.title}
              subtitle={latestRule.summary || 'Open notices to review the latest society policy update.'}
              meta={formatShortDate(latestRule.publishedAt)}
              tone="gold"
              onPress={() => onOpenTab('notices')}
              compact={isCompact}
            />
          ) : (
            <NoticeCard
              title="No notices yet"
              subtitle="Announcements will start appearing here once the society desk sends updates."
              meta="Resident feed"
              tone="primary"
              onPress={() => onOpenTab('notices')}
              compact={isCompact}
            />
          )}
        </ScrollView>
      </SurfaceCard>

      <View style={[styles.summaryRow, isCompact ? styles.summaryRowCompact : null]}>
        <SurfaceCard style={[styles.summaryCard, isCompact ? styles.summaryCardCompact : null]}>
          <Text style={styles.summaryTitle}>Security desk</Text>
          {entryLogs.length > 0 ? (
            <View style={styles.summaryStack}>
              {entryLogs.map(({ entry, unit }) => (
                <View key={entry.id} style={styles.summaryLine}>
                  <View style={styles.summaryDot} />
                  <View style={styles.summaryLineCopy}>
                    <Text style={styles.summaryLineTitle}>{entry.subjectName}</Text>
                    <Caption>
                      {entry.subjectType} {unit ? `for ${unit.code}` : ''} on {formatLongDate(entry.enteredAt)}
                    </Caption>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Caption>No recent entry record linked to your unit.</Caption>
          )}
          <Caption>
            Guards: {guards.map(({ guard }) => guard.name).join(', ') || 'No guard configured yet'}
          </Caption>
        </SurfaceCard>

        <SurfaceCard style={[styles.summaryCard, isCompact ? styles.summaryCardCompact : null]}>
          <Text style={styles.summaryTitle}>Daily help and household</Text>
          {staffRecords.length > 0 ? (
            <View style={styles.summaryStack}>
              {staffRecords.slice(0, 2).map(({ staff, employerUnits }) => (
                <View key={staff.id} style={styles.summaryLine}>
                  <View style={styles.helperBadge}>
                    <Text style={styles.helperBadgeText}>{staff.name.slice(0, 2).toUpperCase()}</Text>
                  </View>
                  <View style={styles.summaryLineCopy}>
                    <Text style={styles.summaryLineTitle}>{staff.name}</Text>
                    <Caption>
                      {staff.category} for {employerUnits.map((unit) => unit.code).join(', ') || primaryUnitLabel}
                    </Caption>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Caption>No staff record linked yet. Add daily help from your resident profile.</Caption>
          )}
          {contacts.map((contact) => (
            <View key={contact.id} style={styles.contactRow}>
              <Text style={styles.contactName}>{contact.name}</Text>
              <Caption>{contact.roleLabel} - {contact.phone}</Caption>
            </View>
          ))}
          <Caption>
            Vehicles saved: {vehicles.length}. Latest payment: {payments[0] ? formatShortDate(payments[0].payment.paidAt) : 'No record yet'}
          </Caption>
        </SurfaceCard>
      </View>
    </>
  );
}

function AnnouncementTicker({ announcements, isCompact }: { announcements: any[]; isCompact: boolean }) {
  const scrollX = useRef(new Animated.Value(0)).current;
  const latestAnnouncement = announcements[0];

  useEffect(() => {
    if (!latestAnnouncement || isCompact) return;

    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(1000),
        Animated.timing(scrollX, {
          toValue: -300,
          duration: 20000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [latestAnnouncement, isCompact]);

  if (!latestAnnouncement) {
    return (
      <View style={[styles.announcementBanner, isCompact ? styles.announcementBannerCompact : null, styles.announcementBannerEmpty]}>
        <Text style={styles.announcementTickerLabel}>📢 Latest Announcement</Text>
        <Text style={styles.announcementTickerBody}>No announcements yet. Check back for society updates.</Text>
      </View>
    );
  }

  const priorityTone = latestAnnouncement.priority === 'critical' ? '#E41E3F' : latestAnnouncement.priority === 'high' ? '#F59E0B' : '#3B82F6';
  const priorityBg = latestAnnouncement.priority === 'critical' ? '#FEE2E2' : latestAnnouncement.priority === 'high' ? '#FEF3C7' : '#DBEAFE';

  return (
    <View style={[styles.announcementBanner, isCompact ? styles.announcementBannerCompact : null, { borderLeftColor: priorityTone, backgroundColor: priorityBg }]}>
      <View style={styles.announcementTickerHeader}>
        <View style={styles.announcementTickerLabelWrap}>
          <Text style={styles.announcementTickerLabel}>📢 Latest Announcement</Text>
          <View style={[styles.announcementPriorityBadge, { backgroundColor: priorityTone }]}>
            <Text style={styles.announcementPriorityText}>{latestAnnouncement.priority.toUpperCase()}</Text>
          </View>
        </View>
        <Text style={styles.announcementTickerMeta}>{formatShortDate(latestAnnouncement.createdAt)}</Text>
      </View>
      <View style={styles.announcementTickerContent}>
        <View style={styles.announcementTickerScrollMask}>
          <Animated.View style={[styles.announcementTickerScrollContent, { transform: [{ translateX: scrollX }] }]}>
            <Text style={styles.announcementTickerTitle} numberOfLines={1}>{latestAnnouncement.title}</Text>
            <Text style={styles.announcementTickerBody} numberOfLines={2}>{latestAnnouncement.body}</Text>
          </Animated.View>
        </View>
      </View>
    </View>
  );
}

function RoundUtilityButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.roundUtility, pressed ? styles.pressed : null]}>
      <Text style={styles.roundUtilityText}>{label}</Text>
    </Pressable>
  );
}

function TopCategoryCard({
  label,
  subtitle,
  badge,
  tone,
  active,
  onPress,
  compact,
}: {
  label: string;
  subtitle: string;
  badge: string;
  tone: AccentTone;
  active: boolean;
  onPress: () => void;
  compact?: boolean;
}) {
  const toneStyle = accentStyles[tone];

  return (
    <Pressable
      onPress={onPress}
      style={(state) => [
        styles.topCategoryCard,
        compact ? styles.topCategoryCardCompact : null,
        active ? styles.topCategoryCardActive : null,
        (state as { hovered?: boolean }).hovered ? styles.hoverLift : null,
        state.pressed ? styles.pressDip : null,
      ]}
    >
      <View style={[styles.topCategoryBadge, { backgroundColor: toneStyle.badgeBackground }]}>
        <ModuleGlyph module={badge} color={toneStyle.badgeText} size="md" />
      </View>
      <Text style={[styles.topCategoryTitle, active ? styles.topCategoryTitleActive : null]}>{label}</Text>
      {!compact ? <Caption style={styles.topCategorySubtitle}>{subtitle}</Caption> : null}
    </Pressable>
  );
}

function CompactHubTile({
  label,
  subtitle,
  badge,
  tone,
  statusLabel,
  onPress,
}: {
  label: string;
  subtitle: string;
  badge: string;
  tone: AccentTone;
  statusLabel?: string;
  onPress: () => void;
}) {
  const toneStyle = accentStyles[tone];

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.compactHubTile, pressed ? styles.pressed : null]}>
      <View style={styles.compactHubTileTopRow}>
        <View style={[styles.compactHubTileBadge, { backgroundColor: toneStyle.badgeBackground }]}>
          <ModuleGlyph module={badge} color={toneStyle.badgeText} size="md" />
        </View>
        {statusLabel ? (
          <View style={[styles.compactHubTileStatus, { backgroundColor: toneStyle.badgeBackground }]}>
            <Text style={[styles.compactHubTileStatusText, { color: toneStyle.badgeText }]} numberOfLines={1}>
              {statusLabel}
            </Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.compactHubTileTitle} numberOfLines={2}>{label}</Text>
      <Text style={styles.compactHubTileSubtitle} numberOfLines={2}>{subtitle}</Text>
    </Pressable>
  );
}

function BoardTile({
  label,
  subtitle,
  badge,
  tone,
  statusLabel,
  onPress,
  compact,
}: {
  label: string;
  subtitle: string;
  badge: string;
  tone: AccentTone;
  statusLabel?: string;
  onPress: () => void;
  compact?: boolean;
}) {
  const toneStyle = accentStyles[tone];

  return (
    <Pressable
      onPress={onPress}
      style={(state) => [
        styles.boardTile,
        compact ? styles.boardTileCompact : null,
        (state as { hovered?: boolean }).hovered ? styles.hoverLift : null,
        state.pressed ? styles.pressDip : null,
      ]}
    >
      <View style={styles.boardTileTopRow}>
        <View style={[styles.boardTileBadge, { backgroundColor: toneStyle.badgeBackground }]}>
          <ModuleGlyph module={badge} color={toneStyle.badgeText} size="lg" />
        </View>
        {statusLabel ? <Pill label={statusLabel} tone={tone === 'accent' ? 'accent' : 'primary'} /> : null}
      </View>
      <View style={styles.boardTileCopy}>
        <Text style={styles.boardTileTitle}>{label}</Text>
        <Caption>{subtitle}</Caption>
      </View>
      <View style={styles.boardTileFooter}>
        <Text style={[styles.boardTileLink, { color: toneStyle.badgeText }]}>Open</Text>
      </View>
    </Pressable>
  );
}

function ConversationPreviewCard({
  title,
  subtitle,
  detail,
  badge,
  tone,
  incomingCount,
  onPress,
  compact,
}: {
  title: string;
  subtitle: string;
  detail: string;
  badge: string;
  tone: AccentTone;
  incomingCount: number;
  onPress: () => void;
  compact?: boolean;
}) {
  const toneStyle = accentStyles[tone];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.chatActivityCard, compact ? styles.chatActivityCardCompact : null, pressed ? styles.pressed : null]}
    >
      <View style={styles.chatActivityCardHeader}>
        <View style={[styles.chatActivityBadge, { backgroundColor: toneStyle.badgeBackground }]}>
          <ModuleGlyph module={badge} color={toneStyle.badgeText} size="md" />
        </View>
        {incomingCount > 0 ? (
          <View style={styles.chatUnreadBadge}>
            <Text style={styles.chatUnreadBadgeText}>{incomingCount}</Text>
          </View>
        ) : null}
      </View>
      <Text numberOfLines={1} style={styles.chatActivityTitle}>{title}</Text>
      <Text numberOfLines={2} style={styles.chatActivitySubtitle}>{subtitle}</Text>
      <Text numberOfLines={1} style={styles.chatActivityDetail}>{detail}</Text>
    </Pressable>
  );
}

function ActionCard({
  title,
  body,
  module,
  tone,
  onPress,
  compact,
}: {
  title: string;
  body: string;
  module: string;
  tone: AccentTone;
  onPress: () => void;
  compact?: boolean;
}) {
  const toneStyle = accentStyles[tone];

  return (
    <Pressable
      onPress={onPress}
      style={(state) => [
        styles.actionCard,
        compact ? styles.actionCardCompact : null,
        (state as { hovered?: boolean }).hovered ? styles.hoverLift : null,
        state.pressed ? styles.pressDip : null,
      ]}
    >
      <View style={[styles.actionCardArt, { backgroundColor: toneStyle.badgeBackground }]}>
        <ModuleGlyph module={module} color={toneStyle.badgeText} size="lg" />
      </View>
      <Text style={styles.actionCardTitle}>{title}</Text>
      <Caption>{body}</Caption>
    </Pressable>
  );
}

function PromoCard({
  title,
  highlight,
  body,
  action,
  tone,
  onPress,
  compact,
}: {
  title: string;
  highlight: string;
  body: string;
  action: string;
  tone: AccentTone;
  onPress: () => void;
  compact?: boolean;
}) {
  const toneStyle = accentStyles[tone];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.promoCard,
        compact ? styles.promoCardCompact : null,
        {
          backgroundColor: tone === 'accent' ? '#19324A' : '#F7FAFF',
          borderColor: tone === 'accent' ? '#274767' : toneStyle.borderColor,
        },
        pressed ? styles.pressed : null,
      ]}
    >
      <Text style={[styles.promoTitle, tone === 'accent' ? styles.promoTitleLight : null]}>{title}</Text>
      <Text style={[styles.promoHighlight, tone === 'accent' ? styles.promoHighlightWarm : { color: toneStyle.badgeText }]}>{highlight}</Text>
      <Caption style={tone === 'accent' ? styles.promoBodyLight : styles.promoBody}>{body}</Caption>
      <View style={[styles.promoButton, tone === 'accent' ? styles.promoButtonLight : { backgroundColor: toneStyle.badgeBackground }]}>
        <Text style={[styles.promoButtonText, tone === 'accent' ? styles.promoButtonTextDark : { color: toneStyle.badgeText }]}>{action}</Text>
      </View>
    </Pressable>
  );
}

function NoticeCard({
  title,
  subtitle,
  meta,
  tone,
  onPress,
  compact,
}: {
  title: string;
  subtitle: string;
  meta: string;
  tone: AccentTone;
  onPress: () => void;
  compact?: boolean;
}) {
  const toneStyle = accentStyles[tone];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.noticeCard,
        compact ? styles.noticeCardCompact : null,
        { borderColor: toneStyle.borderColor },
        pressed ? styles.pressed : null,
      ]}
    >
      <View style={styles.noticeCardHeader}>
        <Text style={styles.noticeCardEyebrow}>NOTICE</Text>
        <Text style={styles.noticeCardMeta}>{meta}</Text>
      </View>
      <Text style={styles.noticeCardTitle}>{title}</Text>
      <Caption>{subtitle}</Caption>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  utilityBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  unitPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 62,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: '#FFFDFC',
    borderWidth: 1,
    borderColor: '#E8DDCF',
    ...shadow.card,
  },
  unitAvatar: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4EADF',
    borderWidth: 1,
    borderColor: '#E7D8C5',
  },
  unitAvatarText: {
    color: palette.mutedInk,
    fontSize: 13,
    fontWeight: '800',
  },
  unitMeta: {
    gap: 1,
  },
  unitCode: {
    color: palette.ink,
    fontSize: 16,
    fontWeight: '800',
  },
  unitMetaText: {
    color: palette.mutedInk,
  },
  workspacePill: {
    flex: 1,
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: '#FFFDFC',
    borderWidth: 1,
    borderColor: '#E8DDCF',
    ...shadow.card,
  },
  workspaceBadge: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E94743',
  },
  workspaceBadgeText: {
    color: palette.white,
    fontSize: 12,
    fontWeight: '800',
  },
  workspaceCopy: {
    flex: 1,
    gap: 1,
  },
  workspaceTitle: {
    color: palette.ink,
    fontSize: 16,
    fontWeight: '700',
  },
  utilityIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  roundUtility: {
    width: 42,
    height: 42,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF7F0',
    borderWidth: 1,
    borderColor: '#EEDBC7',
  },
  roundUtilityText: {
    color: palette.ink,
    fontSize: 11,
    fontWeight: '800',
  },
  profileRing: {
    width: 42,
    height: 42,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF6F4',
    borderWidth: 2,
    borderColor: palette.accent,
  },
  profileRingText: {
    color: palette.accent,
    fontSize: 11,
    fontWeight: '800',
  },
  categoryStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    backgroundColor: '#EEE8DF',
    borderRadius: 38,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  categoryStripCompact: {
    gap: spacing.sm,
    borderRadius: 28,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  topCategoryCard: {
    flex: 1,
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: 30,
  },
  topCategoryCardCompact: {
    flexBasis: '23%',
    minWidth: 0,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: 22,
  },
  topCategoryCardActive: {
    backgroundColor: palette.surface,
    ...shadow.card,
  },
  topCategoryBadge: {
    width: 48,
    height: 48,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topCategoryBadgeText: {
    fontSize: 13,
    fontWeight: '800',
  },
  topCategoryTitle: {
    color: '#3E4755',
    fontSize: 17,
    fontWeight: '700',
  },
  topCategoryTitleActive: {
    color: palette.ink,
  },
  topCategorySubtitle: {
    textAlign: 'center',
  },
  compactHubCard: {
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: 24,
    backgroundColor: '#FFFCF8',
  },
  compactHubHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  compactHubHeaderCopy: {
    flex: 1,
    gap: 2,
  },
  compactHubTitle: {
    color: palette.ink,
    fontSize: 18,
    fontWeight: '800',
  },
  compactHubGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  compactHubTile: {
    flexBasis: '31%',
    flexGrow: 1,
    minWidth: 0,
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E9DECF',
    backgroundColor: '#FFFFFF',
    minHeight: 132,
  },
  compactHubTileTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  compactHubTileBadge: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactHubTileStatus: {
    maxWidth: '58%',
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  compactHubTileStatusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  compactHubTileTitle: {
    color: palette.ink,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '800',
  },
  compactHubTileSubtitle: {
    color: palette.mutedInk,
    fontSize: 11,
    lineHeight: 15,
  },
  superBoard: {
    gap: spacing.lg,
    borderRadius: 34,
    padding: spacing.xl,
    backgroundColor: '#FFFCF8',
  },
  superBoardCompact: {
    gap: spacing.md,
    borderRadius: 28,
    padding: spacing.md,
  },
  superBoardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  superBoardHeaderCompact: {
    gap: spacing.sm,
  },
  superBoardHeaderCopy: {
    flex: 1,
    minWidth: 260,
    gap: spacing.sm,
  },
  superBoardHeaderCopyCompact: {
    minWidth: 0,
  },
  superBoardTitle: {
    color: palette.ink,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
  },
  superBoardTitleCompact: {
    fontSize: 23,
    lineHeight: 29,
  },
  superBoardDescription: {
    maxWidth: 620,
  },
  superBoardDescriptionCompact: {
    maxWidth: '100%',
  },
  superBoardMeta: {
    minWidth: 120,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E8D9C7',
    backgroundColor: '#FFF6E8',
    alignItems: 'center',
    gap: 2,
  },
  superBoardMetaCompact: {
    width: '100%',
    minWidth: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  superBoardMetaValue: {
    color: palette.warning,
    fontSize: 26,
    fontWeight: '800',
  },
  superBoardMetaText: {
    textAlign: 'center',
  },
  superBoardMetaTextCompact: {
    textAlign: 'right',
  },
  superBoardBody: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'stretch',
    gap: spacing.lg,
  },
  superBoardBodyCompact: {
    flexDirection: 'column',
    gap: spacing.md,
  },
  superBoardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    justifyContent: 'space-between',
    flex: 1.3,
    minWidth: 320,
  },
  superBoardGridCompact: {
    minWidth: 0,
    width: '100%',
    gap: spacing.sm,
  },
  boardTile: {
    flexBasis: 168,
    flexGrow: 1,
    maxWidth: 220,
    minWidth: 150,
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E9DECF',
    backgroundColor: '#FFFFFF',
    ...shadow.card,
  },
  boardTileCompact: {
    flexBasis: '100%',
    maxWidth: '100%',
    minWidth: 0,
    borderRadius: 22,
  },
  boardTileTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  boardTileBadge: {
    width: 58,
    height: 58,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boardTileBadgeText: {
    fontSize: 13,
    fontWeight: '800',
  },
  boardTileTitle: {
    color: palette.ink,
    fontSize: 16,
    fontWeight: '700',
  },
  boardTileCopy: {
    gap: 4,
    flex: 1,
  },
  boardTileFooter: {
    paddingTop: spacing.xs,
  },
  boardTileLink: {
    fontSize: 13,
    fontWeight: '800',
  },
  mySocietyBanner: {
    flex: 0.9,
    minWidth: 290,
    minHeight: 142,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#EBDACB',
    backgroundColor: '#F7F4EF',
    overflow: 'hidden',
    gap: spacing.lg,
    padding: spacing.lg,
    justifyContent: 'space-between',
  },
  mySocietyBannerCompact: {
    flex: 0,
    width: '100%',
    minWidth: 0,
    padding: spacing.md,
    gap: spacing.md,
  },
  mySocietyContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.lg,
    flexWrap: 'wrap',
  },
  mySocietyContentCompact: {
    flexDirection: 'column',
    gap: spacing.md,
  },
  mySocietyCopy: {
    flex: 1,
    minWidth: 240,
    gap: spacing.sm,
  },
  mySocietyCopyCompact: {
    minWidth: 0,
  },
  mySocietyTitle: {
    color: palette.ink,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
  },
  mySocietyTitleCompact: {
    fontSize: 21,
    lineHeight: 27,
  },
  mySocietyDescription: {
    maxWidth: 520,
  },
  mySocietyDescriptionCompact: {
    maxWidth: '100%',
  },
  mySocietyFacts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  mySocietyFact: {
    minWidth: 110,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E8D9C7',
    backgroundColor: '#FFF9F1',
    gap: 2,
  },
  mySocietyFactCompact: {
    flexBasis: '48%',
    flexGrow: 1,
    minWidth: 0,
  },
  hubShortcutRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  hubShortcutCard: {
    minWidth: 108,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E3D4C0',
    backgroundColor: '#FFFDFC',
    gap: 2,
  },
  hubShortcutCardCompact: {
    flexBasis: '48%',
    flexGrow: 1,
    minWidth: 0,
  },
  hubShortcutValue: {
    color: palette.ink,
    fontSize: 15,
    fontWeight: '800',
  },
  mySocietyFactValue: {
    color: palette.ink,
    fontSize: 18,
    fontWeight: '800',
  },
  mySocietyVisual: {
    minWidth: 140,
    alignItems: 'flex-end',
    justifyContent: 'center',
    flex: 0,
  },
  mySocietyScene: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    gap: spacing.xs,
    minHeight: 68,
  },
  sceneBuildingTall: {
    width: 26,
    height: 62,
    borderRadius: 10,
    backgroundColor: '#F0C46A',
  },
  sceneBuildingMedium: {
    width: 22,
    height: 46,
    borderRadius: 10,
    backgroundColor: '#E4B473',
  },
  sceneBuildingShort: {
    width: 20,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#B6D3EC',
  },
  mySocietyButton: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: palette.accent,
    ...shadow.card,
  },
  mySocietyButtonCompact: {
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  mySocietyButtonText: {
    color: palette.white,
    fontSize: 18,
    fontWeight: '800',
  },
  actionsPanel: {
    gap: spacing.md,
  },
  chatActivityPanel: {
    gap: spacing.md,
    backgroundColor: '#F7FBFF',
    borderColor: '#D7E6F7',
  },
  chatActivityScroller: {
    gap: spacing.sm,
  },
  chatActivityCard: {
    width: 222,
    minHeight: 160,
    padding: spacing.md,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#DCE6F2',
    backgroundColor: '#FFFFFF',
    gap: spacing.sm,
    ...shadow.card,
  },
  chatActivityCardCompact: {
    width: 204,
  },
  chatActivityCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  chatActivityBadge: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatUnreadBadge: {
    minWidth: 28,
    height: 28,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.accent,
  },
  chatUnreadBadgeText: {
    color: palette.white,
    fontSize: 12,
    fontWeight: '800',
  },
  chatActivityTitle: {
    color: palette.ink,
    fontSize: 16,
    fontWeight: '800',
  },
  chatActivitySubtitle: {
    color: palette.mutedInk,
    minHeight: 34,
  },
  chatActivityDetail: {
    color: palette.blue,
    fontSize: 12,
    fontWeight: '700',
  },
  urgentApprovalPanel: {
    gap: spacing.md,
    backgroundColor: '#FFF7EA',
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  panelHeaderCompact: {
    alignItems: 'flex-start',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  panelHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  panelTitle: {
    color: palette.ink,
    fontSize: 20,
    fontWeight: '800',
  },
  seeAllLink: {
    paddingVertical: spacing.xs,
  },
  seeAllText: {
    color: palette.mutedInk,
    fontSize: 14,
    fontWeight: '700',
  },
  actionScroller: {
    gap: spacing.sm,
  },
  urgentApprovalRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  urgentApprovalRowCompact: {
    flexDirection: 'column',
  },
  urgentApprovalCard: {
    flexBasis: 220,
    flexGrow: 1,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E7D4B1',
    backgroundColor: '#FFFDFC',
    padding: spacing.md,
    gap: spacing.sm,
  },
  urgentApprovalCardCompact: {
    flexBasis: '100%',
  },
  urgentApprovalTitle: {
    color: palette.ink,
    fontSize: 17,
    fontWeight: '800',
    flex: 1,
  },
  actionCard: {
    width: 210,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E9DECF',
    backgroundColor: '#FFFDFC',
    padding: spacing.md,
    gap: spacing.sm,
    ...shadow.card,
  },
  actionCardCompact: {
    width: 198,
  },
  actionCardArt: {
    height: 82,
    borderRadius: 18,
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
    padding: spacing.md,
  },
  actionCardArtText: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  actionCardTitle: {
    color: palette.ink,
    fontSize: 18,
    fontWeight: '800',
  },
  hoverLift: {
    transform: [{ translateY: -4 }, { scale: 1.01 }],
    shadowOpacity: 0.18,
  },
  pressDip: {
    transform: [{ translateY: 0 }, { scale: 0.985 }],
    opacity: 0.96,
  },
  promoScroller: {
    gap: spacing.sm,
  },
  promoCard: {
    width: 280,
    borderRadius: 30,
    borderWidth: 1,
    padding: spacing.xl,
    gap: spacing.sm,
    ...shadow.card,
  },
  promoCardCompact: {
    width: 240,
    padding: spacing.lg,
  },
  promoTitle: {
    color: palette.ink,
    fontSize: 18,
    fontWeight: '700',
  },
  promoTitleLight: {
    color: palette.white,
  },
  promoHighlight: {
    fontSize: 34,
    lineHeight: 38,
    fontWeight: '900',
  },
  promoHighlightWarm: {
    color: '#FFD35B',
  },
  promoBody: {
    color: '#56657A',
  },
  promoBodyLight: {
    color: '#D6E3F0',
  },
  promoButton: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  promoButtonLight: {
    backgroundColor: palette.white,
  },
  promoButtonText: {
    fontSize: 14,
    fontWeight: '800',
  },
  promoButtonTextDark: {
    color: palette.primaryDark,
  },
  noticePanel: {
    gap: spacing.md,
    backgroundColor: '#FFF9DE',
    borderColor: '#F2E6B9',
  },
  noticeScroller: {
    gap: spacing.sm,
  },
  noticeCard: {
    width: 240,
    borderRadius: 24,
    borderWidth: 1,
    backgroundColor: '#FFFDFC',
    padding: spacing.md,
    gap: spacing.sm,
  },
  noticeCardCompact: {
    width: 216,
  },
  noticeCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  noticeCardEyebrow: {
    color: palette.ink,
    fontSize: 13,
    fontWeight: '800',
  },
  noticeCardMeta: {
    color: '#8A93A4',
    fontSize: 12,
    fontWeight: '700',
  },
  noticeCardTitle: {
    color: palette.ink,
    fontSize: 17,
    fontWeight: '800',
  },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },
  summaryRowCompact: {
    flexDirection: 'column',
    gap: spacing.md,
  },
  summaryCard: {
    flex: 1,
    minWidth: 280,
  },
  summaryCardCompact: {
    minWidth: 0,
  },
  summaryTitle: {
    color: palette.ink,
    fontSize: 18,
    fontWeight: '800',
  },
  summaryStack: {
    gap: spacing.sm,
  },
  summaryLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  summaryDot: {
    width: 10,
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: palette.accent,
    marginTop: 7,
  },
  summaryLineCopy: {
    flex: 1,
    gap: 2,
  },
  summaryLineTitle: {
    color: palette.ink,
    fontSize: 15,
    fontWeight: '700',
  },
  helperBadge: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E1E9F2',
  },
  helperBadgeText: {
    color: palette.primary,
    fontSize: 13,
    fontWeight: '800',
  },
  contactRow: {
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#EEE4D8',
    gap: 2,
  },
  contactName: {
    color: palette.ink,
    fontSize: 15,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.9,
  },
  announcementBanner: {
    borderRadius: 20,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderLeftWidth: 5,
    ...shadow.card,
  },
  announcementBannerCompact: {
    borderRadius: 16,
    padding: spacing.sm,
  },
  announcementBannerEmpty: {
    backgroundColor: '#F3F4F6',
    borderLeftColor: '#9CA3AF',
  },
  announcementTickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  announcementTickerLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  announcementTickerLabel: {
    color: palette.ink,
    fontSize: 14,
    fontWeight: '800',
  },
  announcementPriorityBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  announcementPriorityText: {
    color: palette.white,
    fontSize: 10,
    fontWeight: '800',
  },
  announcementTickerMeta: {
    color: palette.mutedInk,
    fontSize: 12,
    fontWeight: '600',
  },
  announcementTickerContent: {
    marginTop: spacing.xs,
  },
  announcementTickerScrollMask: {
    overflow: 'hidden',
  },
  announcementTickerScrollContent: {
    flexDirection: 'row',
  },
  announcementTickerTitle: {
    color: palette.ink,
    fontSize: 16,
    fontWeight: '700',
    marginRight: spacing.md,
  },
  announcementTickerBody: {
    color: palette.mutedInk,
    fontSize: 14,
    fontWeight: '400',
  },
});
