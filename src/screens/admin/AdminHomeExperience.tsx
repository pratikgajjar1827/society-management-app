import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { ModuleGlyph } from '../../components/ModuleGlyph';
import { Caption, Pill, SurfaceCard } from '../../components/ui';
import { useApp } from '../../state/AppContext';
import { palette, radius, shadow, spacing } from '../../theme/tokens';
import {
  AdminRecommendationTab,
  formatShortDate,
  getAdminOverview,
  getAdminRecommendations,
  getAmenitiesForSociety,
  getAnnouncementsForSociety,
  getAuditEvents,
  getBookingsForSociety,
  getComplaintsForSociety,
  getCurrentUser,
  getEntryLogsForSociety,
  getGuardRosterForSociety,
  getInvoiceCollectionDirectory,
  getJoinRequestsForSociety,
  getMeetingsForSociety,
  getPaymentsForSociety,
  getResidentsDirectory,
  getSelectedSociety,
  getSocietyUnitCollectionLabel,
  getStaffVerificationDirectory,
  getVisitorPassesForSociety,
} from '../../utils/selectors';

type AdminTab =
  | 'home'
  | 'residents'
  | 'billing'
  | 'collections'
  | 'ledger'
  | 'amenities'
  | 'helpdesk'
  | 'security'
  | 'announcements'
  | 'meetings'
  | 'audit';
type AccentTone = 'accent' | 'blue' | 'gold' | 'primary';
type HomeHubSectionKey = 'residents' | 'billing' | 'security' | 'operations';
type HubTile = {
  label: string;
  subtitle: string;
  badge: string;
  tab: AdminTab;
  tone: AccentTone;
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
  ctaTab: AdminTab;
};

function getAdminActionModule(tab: AdminRecommendationTab) {
  switch (tab) {
    case 'residents':
      return 'RS';
    case 'billing':
      return 'BL';
    case 'collections':
      return 'CL';
    case 'amenities':
      return 'AM';
    case 'helpdesk':
      return 'HD';
    case 'security':
      return 'GD';
    case 'announcements':
      return 'AN';
    case 'audit':
    default:
      return 'AU';
  }
}

const accentStyles = {
  accent: { badgeBackground: '#FFE4DE', badgeText: palette.accent, borderColor: '#F6D8D0' },
  blue: { badgeBackground: '#E4EEFC', badgeText: palette.blue, borderColor: '#D6E2F7' },
  gold: { badgeBackground: '#FFF1D8', badgeText: palette.warning, borderColor: '#F4E3B9' },
  primary: { badgeBackground: '#E1E9F2', badgeText: palette.primary, borderColor: '#D7E0EA' },
} as const;

export function AdminHomeExperience({
  societyId,
  userId,
  canReturnToResident,
  onOpenTab,
  onOpenWorkspaces,
  onSwitchResident,
}: {
  societyId: string;
  userId: string;
  canReturnToResident: boolean;
  onOpenTab: (tab: AdminTab) => void;
  onOpenWorkspaces: () => void;
  onSwitchResident: () => void;
}) {
  const { state } = useApp();
  const [activeHub, setActiveHub] = useState<HomeHubSectionKey>('operations');
  const { width } = useWindowDimensions();
  const isCompact = width < 768;
  const isPhone = width < 420;
  const user = getCurrentUser(state.data, userId);
  const society = getSelectedSociety(state.data, societyId);

  if (!user || !society) {
    return null;
  }

  const overview = getAdminOverview(state.data, societyId);
  const recommendations = getAdminRecommendations(state.data, societyId);
  const pendingJoinRequests = getJoinRequestsForSociety(state.data, societyId, 'pending');
  const residentsDirectory = getResidentsDirectory(state.data, societyId);
  const residentsCount = residentsDirectory.reduce((sum, entry) => sum + entry.residents.length, 0);
  const unitLabel = getSocietyUnitCollectionLabel(society);
  const announcements = getAnnouncementsForSociety(state.data, societyId);
  const latestAnnouncement = announcements[0];
  const amenities = getAmenitiesForSociety(state.data, societyId);
  const bookings = getBookingsForSociety(state.data, societyId);
  const pendingBookings = bookings.filter(({ booking }) => booking.status === 'pending').length;
  const meetings = getMeetingsForSociety(state.data, societyId);
  const scheduledMeetings = meetings.filter((m) => m.status === 'scheduled').length;
  const payments = getPaymentsForSociety(state.data, societyId);
  const pendingPayments = payments.filter((payment) => payment.status === 'pending').length;
  const invoiceDirectory = getInvoiceCollectionDirectory(state.data, societyId);
  const overdueCollectionCount = invoiceDirectory.filter(({ invoice }) => invoice.status === 'overdue').length;
  const remindersCount = invoiceDirectory.filter(({ latestReminder }) => Boolean(latestReminder)).length;
  const guards = getGuardRosterForSociety(state.data, societyId);
  const staffDirectory = getStaffVerificationDirectory(state.data, societyId);
  const pendingStaffCount = staffDirectory.filter(({ staff }) => staff.verificationState === 'pending').length;
  const visitorPasses = getVisitorPassesForSociety(state.data, societyId);
  const scheduledVisitors = visitorPasses.filter(({ visitorPass }) => visitorPass.status === 'scheduled').length;
  const checkedInVisitors = visitorPasses.filter(({ visitorPass }) => visitorPass.status === 'checkedIn').length;
  const entryLogs = getEntryLogsForSociety(state.data, societyId);
  const complaints = getComplaintsForSociety(state.data, societyId);
  const securityComplaints = complaints.filter(({ complaint }) => complaint.category === 'security');
  const auditEvents = getAuditEvents(state.data, societyId);
  const latestAuditEvent = auditEvents[0];
  const actionCards: Array<{
    title: string;
    body: string;
    metric: string;
    module: string;
    tone: AccentTone;
    onPress: () => void;
  }> = recommendations.slice(0, 4).map((recommendation) => ({
    title: recommendation.title,
    body: recommendation.summary,
    metric: recommendation.metric,
    module: getAdminActionModule(recommendation.tab),
    tone: recommendation.tone === 'success' ? 'primary' : recommendation.tone === 'warning' ? 'gold' : recommendation.tone,
    onPress: () => onOpenTab(recommendation.tab),
  }));

  const topCategories = [
    {
      label: 'Residents',
      badge: 'RS',
      subtitle: `${residentsDirectory.length} ${unitLabel}`,
      tone: 'gold' as const,
      onPress: () => setActiveHub('residents'),
      active: activeHub === 'residents',
    },
    {
      label: 'Billing',
      badge: 'BL',
      subtitle: `${overview.collectionRate}% collected`,
      tone: 'accent' as const,
      onPress: () => setActiveHub('billing'),
      active: activeHub === 'billing',
    },
    {
      label: 'Security',
      badge: 'SC',
      subtitle: `${guards.length} guards`,
      tone: 'primary' as const,
      onPress: () => setActiveHub('security'),
      active: activeHub === 'security',
    },
    {
      label: 'Operations',
      badge: 'OP',
      subtitle: `${recommendations.length} priorities`,
      tone: 'blue' as const,
      onPress: () => setActiveHub('operations'),
      active: activeHub === 'operations',
    },
  ];

  const residentsTiles: HubTile[] = [
    { label: 'Claims', subtitle: pendingJoinRequests.length > 0 ? `${pendingJoinRequests.length} pending` : 'No pending claim', badge: 'AC', tab: 'residents', tone: 'accent', statusLabel: String(pendingJoinRequests.length) },
    { label: 'Residents', subtitle: `${residentsCount} linked members`, badge: 'RD', tab: 'residents', tone: 'blue', statusLabel: String(residentsCount) },
    { label: 'Directory', subtitle: `${residentsDirectory.length} ${unitLabel}`, badge: 'UT', tab: 'residents', tone: 'primary', statusLabel: String(residentsDirectory.length) },
    { label: 'Staff', subtitle: `${staffDirectory.length} records`, badge: 'ST', tab: 'security', tone: 'gold', statusLabel: String(staffDirectory.length) },
    { label: 'Helpdesk', subtitle: `${complaints.length} total tickets`, badge: 'CP', tab: 'helpdesk', tone: 'accent', statusLabel: String(complaints.length) },
    { label: 'Notices', subtitle: latestAnnouncement ? formatShortDate(latestAnnouncement.createdAt) : 'No update yet', badge: 'NT', tab: 'announcements', tone: 'blue', statusLabel: String(announcements.length) },
  ];

  const billingTiles: HubTile[] = [
    { label: 'Collect', subtitle: `${overview.collectionRate}% rate`, badge: 'CL', tab: 'collections', tone: 'accent', statusLabel: `${overview.collectionRate}%` },
    { label: 'Overdue', subtitle: overdueCollectionCount > 0 ? `${overdueCollectionCount} invoices` : 'All clear', badge: 'DU', tab: 'collections', tone: 'gold', statusLabel: String(overdueCollectionCount) },
    { label: 'Flags', subtitle: pendingPayments > 0 ? `${pendingPayments} pending` : 'No review queue', badge: 'PF', tab: 'collections', tone: 'blue', statusLabel: String(pendingPayments) },
    { label: 'Ledger', subtitle: `${payments.length} payment(s)`, badge: 'LG', tab: 'ledger', tone: 'primary', statusLabel: String(payments.length) },
    { label: 'Reminders', subtitle: remindersCount > 0 ? `${remindersCount} sent` : 'No reminder', badge: 'RM', tab: 'billing', tone: 'accent', statusLabel: String(remindersCount) },
    { label: 'Setup', subtitle: 'Cycles and receiver details', badge: 'UP', tab: 'billing', tone: 'gold', statusLabel: 'Live' },
  ];

  const securityTiles: HubTile[] = [
    { label: 'Visitors', subtitle: scheduledVisitors > 0 ? `${scheduledVisitors} scheduled` : 'No active pass', badge: 'VP', tab: 'security', tone: 'gold', statusLabel: String(scheduledVisitors) },
    { label: 'Inside', subtitle: checkedInVisitors > 0 ? `${checkedInVisitors} inside` : 'Gate is clear', badge: 'IN', tab: 'security', tone: 'blue', statusLabel: String(checkedInVisitors) },
    { label: 'Logs', subtitle: `${entryLogs.length} records`, badge: 'LG', tab: 'security', tone: 'primary', statusLabel: String(entryLogs.length) },
    { label: 'Guards', subtitle: `${guards.length} guard(s)`, badge: 'GD', tab: 'security', tone: 'primary', statusLabel: String(guards.length) },
    { label: 'Staff KYC', subtitle: pendingStaffCount > 0 ? `${pendingStaffCount} pending` : 'All verified', badge: 'KY', tab: 'security', tone: 'accent', statusLabel: String(pendingStaffCount) },
    { label: 'Issues', subtitle: securityComplaints.length > 0 ? `${securityComplaints.length} issues` : 'No security issue', badge: 'IS', tab: 'helpdesk', tone: 'blue', statusLabel: String(securityComplaints.length) },
  ];

  const operationsTiles: HubTile[] = [
    { label: 'Helpdesk', subtitle: `${overview.openComplaints} open`, badge: 'HD', tab: 'helpdesk', tone: 'accent', statusLabel: String(overview.openComplaints) },
    { label: 'Amenities', subtitle: `${amenities.length} live`, badge: 'AM', tab: 'amenities', tone: 'gold', statusLabel: String(amenities.length) },
    { label: 'Bookings', subtitle: pendingBookings > 0 ? `${pendingBookings} pending` : `${bookings.length} total`, badge: 'BK', tab: 'amenities', tone: 'blue', statusLabel: String(bookings.length) },
    { label: 'Meetings', subtitle: scheduledMeetings.length > 0 ? `${scheduledMeetings.length} scheduled` : `${meetings.length} total`, badge: 'MT', tab: 'meetings', tone: 'primary', statusLabel: String(meetings.length) },
    { label: 'Notices', subtitle: `${announcements.length} published`, badge: 'AN', tab: 'announcements', tone: 'accent', statusLabel: String(announcements.length) },
    { label: 'Audit', subtitle: `${auditEvents.length} events`, badge: 'AU', tab: 'audit', tone: 'primary', statusLabel: String(auditEvents.length) },
    { label: 'Collect', subtitle: `${overview.collectionRate}% healthy`, badge: 'CL', tab: 'collections', tone: 'gold', statusLabel: `${overview.collectionRate}%` },
  ];

  const hubConfigs: Record<HomeHubSectionKey, HubConfig> = {
    residents: {
      pillLabel: 'Resident desk',
      pillTone: 'warning',
      title: 'Residents, access approvals, and occupancy in one view',
      description: 'Keep resident mapping, access claims, and member visibility clean with one premium admin hub.',
      metaValue: String(residentsTiles.length),
      metaLabel: 'resident tools',
      tiles: residentsTiles,
      spotlightPill: 'Residents',
      spotlightPillTone: 'accent',
      spotlightTitle: 'Resident operations stay calm when approvals and occupancy stay clean',
      spotlightDescription: 'Review claims faster, keep the resident directory reliable, and make every unit easier to manage.',
      facts: [
        { label: 'pending claims', value: String(pendingJoinRequests.length) },
        { label: 'units', value: String(residentsDirectory.length) },
        { label: 'linked members', value: String(residentsCount) },
      ],
      shortcuts: [
        { label: 'Approvals', value: `${pendingJoinRequests.length}`, onPress: () => onOpenTab('residents') },
        { label: 'Directory', value: `${residentsDirectory.length}`, onPress: () => onOpenTab('residents') },
        { label: 'Helpdesk', value: `${overview.openComplaints} open`, onPress: () => onOpenTab('helpdesk') },
      ],
      ctaLabel: 'Open Residents',
      ctaTab: 'residents',
    },
    billing: {
      pillLabel: 'Collections desk',
      pillTone: 'accent',
      title: 'Billing, collections, and ledger control in one place',
      description: 'Review dues, reconcile payments, and keep society billing audit-ready from one admin control board.',
      metaValue: String(billingTiles.length),
      metaLabel: 'billing tools',
      tiles: billingTiles,
      spotlightPill: 'Billing',
      spotlightPillTone: 'accent',
      spotlightTitle: 'Stay ahead of dues, proofs, and collection follow-ups',
      spotlightDescription: 'The faster billing is reviewed, the smoother resident trust and monthly operations stay.',
      facts: [
        { label: 'collection rate', value: `${overview.collectionRate}%` },
        { label: 'overdue', value: String(overdueCollectionCount) },
        { label: 'payment flags', value: String(pendingPayments) },
      ],
      shortcuts: [
        { label: 'Collections', value: `${overview.collectionRate}%`, onPress: () => onOpenTab('collections') },
        { label: 'Ledger', value: `${payments.length} items`, onPress: () => onOpenTab('ledger') },
        { label: 'Billing', value: `${remindersCount} reminders`, onPress: () => onOpenTab('billing') },
      ],
      ctaLabel: 'Open Billing',
      ctaTab: 'billing',
    },
    security: {
      pillLabel: 'Security desk',
      pillTone: 'primary',
      title: 'Security, visitors, and gate visibility without the clutter',
      description: 'Manage gate access, staff verification, and incident visibility from a cleaner security workspace.',
      metaValue: String(securityTiles.length),
      metaLabel: 'security tools',
      tiles: securityTiles,
      spotlightPill: 'Security',
      spotlightPillTone: 'primary',
      spotlightTitle: 'A stronger gate flow starts with verified access and clearer records',
      spotlightDescription: 'Keep guards, visitors, and staff aligned so residents get faster and safer entry operations.',
      facts: [
        { label: 'guards', value: String(guards.length) },
        { label: 'scheduled passes', value: String(scheduledVisitors) },
        { label: 'staff pending', value: String(pendingStaffCount) },
      ],
      shortcuts: [
        { label: 'Visitors', value: `${scheduledVisitors} pending`, onPress: () => onOpenTab('security') },
        { label: 'Logs', value: `${entryLogs.length} entries`, onPress: () => onOpenTab('security') },
        { label: 'Issues', value: `${securityComplaints.length}`, onPress: () => onOpenTab('helpdesk') },
      ],
      ctaLabel: 'Open Security',
      ctaTab: 'security',
    },
    operations: {
      pillLabel: 'Admin central',
      pillTone: 'warning',
      title: 'Operations, communication, and oversight beautifully connected',
      description: 'Move between helpdesk, amenities, announcements, collections, and audit from one polished admin hub.',
      metaValue: String(operationsTiles.length),
      metaLabel: 'core modules',
      tiles: operationsTiles,
      spotlightPill: 'Operations',
      spotlightPillTone: 'accent',
      spotlightTitle: 'Everything your admin team needs, in one control surface',
      spotlightDescription: 'Jump into daily operational modules, keep communication active, and stay ahead of the next queue.',
      facts: [
        { label: 'open complaints', value: String(overview.openComplaints) },
        { label: 'pending approvals', value: String(overview.pendingApprovals) },
        { label: 'announcements', value: String(announcements.length) },
      ],
      shortcuts: [
        { label: 'Helpdesk', value: `${overview.openComplaints} open`, onPress: () => onOpenTab('helpdesk') },
        { label: 'Announcements', value: `${announcements.length} live`, onPress: () => onOpenTab('announcements') },
        { label: 'Audit', value: `${auditEvents.length} logs`, onPress: () => onOpenTab('audit') },
      ],
      ctaLabel: 'Open Operations',
      ctaTab: 'helpdesk',
    },
  };

  const activeHubConfig = hubConfigs[activeHub];
  const useDensePhoneTiles = isPhone && activeHubConfig.tiles.length >= 6;

  return (
    <>
      {!isCompact ? (
      <View style={styles.utilityBar}>
        <Pressable onPress={() => onOpenTab('residents')} style={({ pressed }) => [styles.unitPill, pressed ? styles.pressed : null]}>
          <View style={styles.unitAvatar}>
            <Text style={styles.unitAvatarText}>AD</Text>
          </View>
          <View style={styles.unitMeta}>
            <Text style={styles.unitCode}>{society.name}</Text>
            <Caption style={styles.unitMetaText}>Admin workspace</Caption>
          </View>
        </Pressable>

        <Pressable onPress={onOpenWorkspaces} style={({ pressed }) => [styles.workspacePill, pressed ? styles.pressed : null]}>
          <View style={styles.workspaceBadge}>
            <Text style={styles.workspaceBadgeText}>{user.avatarInitials}</Text>
          </View>
          <View style={styles.workspaceCopy}>
            <Text style={styles.workspaceTitle}>{user.name}</Text>
            <Caption>{society.area}, {society.city}</Caption>
          </View>
        </Pressable>

        <View style={styles.utilityIcons}>
          <RoundUtilityButton label="WK" onPress={onOpenWorkspaces} />
          {canReturnToResident ? <RoundUtilityButton label="RS" onPress={onSwitchResident} /> : null}
          <View style={styles.profileRing}>
            <Text style={styles.profileRingText}>AD</Text>
          </View>
        </View>
      </View>
      ) : null}

      <View style={[styles.categoryStrip, isCompact ? styles.categoryStripCompact : null, isPhone ? styles.categoryStripPhone : null]}>
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
            phone={isPhone}
          />
        ))}
      </View>

      {isCompact ? (
        <SurfaceCard style={[styles.compactHubCard, isPhone ? styles.compactHubCardPhone : null]}>
          <View style={[styles.compactHubHeader, isPhone ? styles.compactHubHeaderPhone : null]}>
            <View style={styles.compactHubHeaderCopy}>
              <Text style={[styles.compactHubTitle, isPhone ? styles.compactHubTitlePhone : null]}>{activeHubConfig.pillLabel}</Text>
              <Caption>{activeHubConfig.metaValue} {activeHubConfig.metaLabel}</Caption>
            </View>
            <Pill label={activeHubConfig.metaValue} tone={activeHubConfig.pillTone} />
          </View>
          <View style={[styles.compactHubGrid, isPhone ? styles.compactHubGridPhone : null, useDensePhoneTiles ? styles.compactHubGridDensePhone : null]}>
            {activeHubConfig.tiles.map((tile) => (
              <BoardTile
                key={tile.label}
                label={tile.label}
                subtitle={tile.subtitle}
                badge={tile.badge}
                tone={tile.tone}
                statusLabel={tile.statusLabel}
                onPress={() => onOpenTab(tile.tab)}
                compact={isCompact}
                phone={isPhone}
                dense={useDensePhoneTiles}
                minimal={isPhone}
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
                onPress={() => onOpenTab(tile.tab)}
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
              onPress={() => onOpenTab(activeHubConfig.ctaTab)}
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

      <SurfaceCard style={[styles.actionsPanel, isPhone ? styles.actionsPanelPhone : null]}>
        <View style={[styles.panelHeader, isCompact ? styles.panelHeaderCompact : null, isPhone ? styles.panelHeaderPhone : null]}>
          <View style={styles.panelHeaderLeft}>
            <Text style={[styles.panelTitle, isPhone ? styles.panelTitlePhone : null]}>Admin actions</Text>
            <Pill label="Live" tone="accent" />
          </View>
          <Pressable onPress={() => onOpenTab('audit')} style={({ pressed }) => [styles.seeAllLink, pressed ? styles.pressed : null]}>
            <Text style={[styles.seeAllText, isPhone ? styles.seeAllTextPhone : null]}>See all</Text>
          </Pressable>
        </View>

        {isPhone ? (
          <View style={styles.actionGridPhone}>
            {actionCards.map((card) => (
              <ActionCard
                key={card.title}
                title={card.title}
                body={card.body}
                metric={card.metric}
                module={card.module}
                tone={card.tone}
                onPress={card.onPress}
                compact={isCompact}
                phone={isPhone}
              />
            ))}
          </View>
        ) : (
          <ScrollView horizontal contentContainerStyle={styles.actionScroller} showsHorizontalScrollIndicator={false}>
            {actionCards.map((card) => (
              <ActionCard
                key={card.title}
                title={card.title}
                body={card.body}
                metric={card.metric}
                module={card.module}
                tone={card.tone}
                onPress={card.onPress}
                compact={isCompact}
                phone={isPhone}
              />
            ))}
          </ScrollView>
        )}
      </SurfaceCard>

      <View style={[styles.summaryRow, isCompact ? styles.summaryRowCompact : null, isPhone ? styles.summaryRowPhone : null]}>
        <SurfaceCard style={[styles.summaryCard, isCompact ? styles.summaryCardCompact : null, isPhone ? styles.summaryCardPhone : null]}>
          <Text style={[styles.summaryTitle, isPhone ? styles.summaryTitlePhone : null]}>Live admin attention</Text>
          <View style={styles.summaryStack}>
            <View style={styles.summaryLine}>
              <View style={styles.summaryDot} />
              <View style={styles.summaryLineCopy}>
                <Text numberOfLines={1} style={[styles.summaryLineTitle, isPhone ? styles.summaryLineTitlePhone : null]}>Pending approvals</Text>
                <Text numberOfLines={isPhone ? 1 : 2} style={[styles.summaryCaption, isPhone ? styles.summaryCaptionPhone : null]}>{overview.pendingApprovals} queue item(s) need action right now.</Text>
              </View>
            </View>
            <View style={styles.summaryLine}>
              <View style={styles.summaryDot} />
              <View style={styles.summaryLineCopy}>
                <Text numberOfLines={1} style={[styles.summaryLineTitle, isPhone ? styles.summaryLineTitlePhone : null]}>Collection health</Text>
                <Text numberOfLines={isPhone ? 1 : 2} style={[styles.summaryCaption, isPhone ? styles.summaryCaptionPhone : null]}>{overview.collectionRate}% collected with {overdueCollectionCount} overdue invoice(s).</Text>
              </View>
            </View>
            <View style={styles.summaryLine}>
              <View style={styles.summaryDot} />
              <View style={styles.summaryLineCopy}>
                <Text numberOfLines={1} style={[styles.summaryLineTitle, isPhone ? styles.summaryLineTitlePhone : null]}>Security readiness</Text>
                <Text numberOfLines={isPhone ? 1 : 2} style={[styles.summaryCaption, isPhone ? styles.summaryCaptionPhone : null]}>{guards.length} guards, {scheduledVisitors} scheduled visitor pass(es), {pendingStaffCount} staff KYC pending.</Text>
              </View>
            </View>
          </View>
        </SurfaceCard>

        <SurfaceCard style={[styles.summaryCard, isCompact ? styles.summaryCardCompact : null, isPhone ? styles.summaryCardPhone : null]}>
          <Text style={[styles.summaryTitle, isPhone ? styles.summaryTitlePhone : null]}>Communication and audit pulse</Text>
          {latestAnnouncement ? (
            <View style={styles.summaryLine}>
              <View style={styles.helperBadge}>
                <Text style={styles.helperBadgeText}>AN</Text>
              </View>
              <View style={styles.summaryLineCopy}>
                <Text numberOfLines={1} style={[styles.summaryLineTitle, isPhone ? styles.summaryLineTitlePhone : null]}>{latestAnnouncement.title}</Text>
                <Text numberOfLines={1} style={[styles.summaryCaption, isPhone ? styles.summaryCaptionPhone : null]}>Latest notice on {formatShortDate(latestAnnouncement.createdAt)}</Text>
              </View>
            </View>
          ) : (
            <Caption>No announcements published yet.</Caption>
          )}
          {latestAuditEvent ? (
            <View style={styles.summaryLine}>
              <View style={styles.helperBadge}>
                <Text style={styles.helperBadgeText}>AU</Text>
              </View>
              <View style={styles.summaryLineCopy}>
                <Text numberOfLines={1} style={[styles.summaryLineTitle, isPhone ? styles.summaryLineTitlePhone : null]}>{latestAuditEvent.title}</Text>
                <Text numberOfLines={1} style={[styles.summaryCaption, isPhone ? styles.summaryCaptionPhone : null]}>{formatShortDate(latestAuditEvent.createdAt)}</Text>
              </View>
            </View>
          ) : null}
          <Text numberOfLines={isPhone ? 1 : 2} style={[styles.summaryCaption, isPhone ? styles.summaryCaptionPhone : null]}>
            Open complaints: {overview.openComplaints}. Pending bookings: {pendingBookings}. Published notices: {announcements.length}.
          </Text>
        </SurfaceCard>
      </View>
    </>
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
  phone,
}: {
  label: string;
  subtitle: string;
  badge: string;
  tone: AccentTone;
  active: boolean;
  onPress: () => void;
  compact?: boolean;
  phone?: boolean;
}) {
  const toneStyle = accentStyles[tone];

  return (
    <Pressable
      onPress={onPress}
      style={(state) => [
        styles.topCategoryCard,
        compact ? styles.topCategoryCardCompact : null,
        phone ? styles.topCategoryCardPhone : null,
        active ? styles.topCategoryCardActive : null,
        (state as { hovered?: boolean }).hovered ? styles.hoverLift : null,
        state.pressed ? styles.pressDip : null,
      ]}
    >
      <View style={[styles.topCategoryBadge, phone ? styles.topCategoryBadgePhone : null, { backgroundColor: toneStyle.badgeBackground }]}> 
        <ModuleGlyph module={badge} color={toneStyle.badgeText} size="md" />
      </View>
      <Text style={[styles.topCategoryTitle, phone ? styles.topCategoryTitlePhone : null, active ? styles.topCategoryTitleActive : null]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>{label}</Text>
      {!compact ? <Caption style={styles.topCategorySubtitle}>{subtitle}</Caption> : null}
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
  phone,
  dense,
  minimal,
}: {
  label: string;
  subtitle: string;
  badge: string;
  tone: AccentTone;
  statusLabel?: string;
  onPress: () => void;
  compact?: boolean;
  phone?: boolean;
  dense?: boolean;
  minimal?: boolean;
}) {
  const toneStyle = accentStyles[tone];
  const metricValue = statusLabel || subtitle;

  return (
    <Pressable
      onPress={onPress}
      style={(state) => [
        styles.boardTile,
        compact ? styles.boardTileCompact : null,
        phone ? styles.boardTilePhone : null,
        dense ? styles.boardTileDensePhone : null,
        minimal ? styles.boardTileMinimalPhone : null,
        (state as { hovered?: boolean }).hovered ? styles.hoverLift : null,
        state.pressed ? styles.pressDip : null,
      ]}
    >
      <View style={[styles.boardTileBadge, phone ? styles.boardTileBadgePhone : null, dense ? styles.boardTileBadgeDensePhone : null, { backgroundColor: toneStyle.badgeBackground }]}> 
        <ModuleGlyph module={badge} color={toneStyle.badgeText} size="lg" />
      </View>
      <View style={styles.boardTileCopy}>
        <Text style={[styles.boardTileTitle, phone ? styles.boardTileTitlePhone : null, dense ? styles.boardTileTitleDensePhone : null]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78}>{label}</Text>
        {minimal ? (
          <Text style={[styles.boardTileMetric, phone ? styles.boardTileMetricPhone : null, dense ? styles.boardTileMetricDensePhone : null, { color: toneStyle.badgeText }]} numberOfLines={1}>{metricValue}</Text>
        ) : (
          <Text style={[styles.boardTileSubtitle, phone ? styles.boardTileSubtitlePhone : null, dense ? styles.boardTileSubtitleDensePhone : null]} numberOfLines={phone ? 1 : dense ? 1 : 2} adjustsFontSizeToFit minimumFontScale={0.8}>{subtitle}</Text>
        )}
      </View>
      {!minimal ? <View style={styles.boardTileFooter}>
        <Text style={[styles.boardTileLink, { color: toneStyle.badgeText }]}>Open</Text>
      </View> : null}
    </Pressable>
  );
}

function ActionCard({
  title,
  body,
  metric,
  module,
  tone,
  onPress,
  compact,
  phone,
}: {
  title: string;
  body: string;
  metric: string;
  module: string;
  tone: AccentTone;
  onPress: () => void;
  compact?: boolean;
  phone?: boolean;
}) {
  const toneStyle = accentStyles[tone];

  return (
    <Pressable
      onPress={onPress}
      style={(state) => [
        styles.actionCard,
        compact ? styles.actionCardCompact : null,
        phone ? styles.actionCardPhone : null,
        (state as { hovered?: boolean }).hovered ? styles.hoverLift : null,
        state.pressed ? styles.pressDip : null,
      ]}
    >
      <View style={[styles.actionCardArt, phone ? styles.actionCardArtPhone : null, { backgroundColor: toneStyle.badgeBackground }]}> 
        <ModuleGlyph module={module} color={toneStyle.badgeText} size="lg" />
      </View>
      <Text style={[styles.actionCardTitle, phone ? styles.actionCardTitlePhone : null]} numberOfLines={1}>{title}</Text>
      <Text style={[styles.actionCardMetric, phone ? styles.actionCardMetricPhone : null, { color: toneStyle.badgeText }]} numberOfLines={1}>{metric}</Text>
      {!phone ? <Caption>{body}</Caption> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  utilityBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
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
  unitAvatarText: { color: palette.mutedInk, fontSize: 13, fontWeight: '800' },
  unitMeta: { gap: 1 },
  unitCode: { color: palette.ink, fontSize: 16, fontWeight: '800' },
  unitMetaText: { color: palette.mutedInk },
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
    backgroundColor: palette.accent,
  },
  workspaceBadgeText: { color: palette.white, fontSize: 12, fontWeight: '800' },
  workspaceCopy: { flex: 1, gap: 1 },
  workspaceTitle: { color: palette.ink, fontSize: 16, fontWeight: '800' },
  utilityIcons: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  roundUtility: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF8F0',
    borderWidth: 1,
    borderColor: '#E8D9C7',
  },
  roundUtilityText: { color: palette.ink, fontSize: 11, fontWeight: '800' },
  profileRing: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF8F0',
    borderWidth: 1.5,
    borderColor: palette.accent,
  },
  profileRingText: { color: palette.accent, fontSize: 11, fontWeight: '800' },
  categoryStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: 34,
    backgroundColor: '#EFE7DB',
  },
  categoryStripCompact: {
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: 28,
  },
  categoryStripPhone: {
    gap: 6,
    borderRadius: 22,
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  topCategoryCard: {
    flex: 1,
    minWidth: 140,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: 30,
  },
  topCategoryCardCompact: {
    flexBasis: '48%',
    minWidth: 0,
  },
  topCategoryCardPhone: {
    flex: 0,
    flexBasis: '23.5%',
    maxWidth: '23.5%',
    paddingHorizontal: 3,
    paddingVertical: 4,
    borderRadius: 14,
  },
  topCategoryCardActive: { backgroundColor: palette.surface, ...shadow.card },
  topCategoryBadge: { width: 48, height: 48, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  topCategoryBadgePhone: { width: 38, height: 38, borderRadius: 14 },
  topCategoryTitle: { color: '#3E4755', fontSize: 17, fontWeight: '700' },
  topCategoryTitlePhone: { fontSize: 11 },
  topCategoryTitleActive: { color: palette.ink },
  topCategorySubtitle: { textAlign: 'center' },
  compactHubCard: {
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: '#FFFCF8',
  },
  compactHubCardPhone: {
    borderRadius: 20,
  },
  compactHubHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  compactHubHeaderPhone: {
    alignItems: 'flex-start',
    gap: 6,
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
  compactHubTitlePhone: {
    fontSize: 16,
  },
  compactHubGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  compactHubGridPhone: {
    gap: 6,
  },
  compactHubGridDensePhone: {
    gap: 4,
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
  superBoardHeaderCopy: { flex: 1, minWidth: 260, gap: spacing.sm },
  superBoardHeaderCopyCompact: { minWidth: 0 },
  superBoardTitle: { color: palette.ink, fontSize: 28, lineHeight: 34, fontWeight: '800' },
  superBoardTitleCompact: { fontSize: 23, lineHeight: 29 },
  superBoardDescription: { maxWidth: 620 },
  superBoardDescriptionCompact: { maxWidth: '100%' },
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
  superBoardMetaValue: { color: palette.warning, fontSize: 26, fontWeight: '800' },
  superBoardMetaText: { textAlign: 'center' },
  superBoardMetaTextCompact: { textAlign: 'right' },
  superBoardBody: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'stretch', gap: spacing.lg },
  superBoardBodyCompact: { flexDirection: 'column', gap: spacing.md },
  superBoardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    justifyContent: 'space-between',
    flex: 1.2,
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
  boardTilePhone: {
    flexBasis: '48%',
    padding: 8,
    borderRadius: 16,
    minHeight: 94,
  },
  boardTileDensePhone: {
    flexBasis: '31.5%',
    flexGrow: 0,
    maxWidth: '31.5%',
    minHeight: 76,
    gap: 3,
    padding: 6,
    borderRadius: 12,
  },
  boardTileMinimalPhone: {
    justifyContent: 'space-between',
  },
  boardTileBadge: { width: 58, height: 58, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  boardTileBadgePhone: { width: 34, height: 34, borderRadius: 12 },
  boardTileBadgeDensePhone: { width: 28, height: 28, borderRadius: 10 },
  boardTileCopy: { gap: 4, flex: 1 },
  boardTileTitle: { color: palette.ink, fontSize: 16, fontWeight: '700' },
  boardTileTitlePhone: { fontSize: 12, lineHeight: 14 },
  boardTileTitleDensePhone: { fontSize: 10, lineHeight: 12 },
  boardTileSubtitle: { color: palette.mutedInk, fontSize: 11, lineHeight: 15 },
  boardTileSubtitlePhone: { fontSize: 9, lineHeight: 11 },
  boardTileSubtitleDensePhone: { fontSize: 8, lineHeight: 10 },
  boardTileMetric: { fontSize: 18, lineHeight: 20, fontWeight: '900' },
  boardTileMetricPhone: { fontSize: 16, lineHeight: 18 },
  boardTileMetricDensePhone: { fontSize: 15, lineHeight: 16 },
  boardTileFooter: { paddingTop: spacing.xs },
  boardTileLink: { fontSize: 13, fontWeight: '800' },
  mySocietyBanner: {
    flex: 0.95,
    minWidth: 310,
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
  mySocietyCopy: { flex: 1, minWidth: 240, gap: spacing.sm },
  mySocietyCopyCompact: { minWidth: 0 },
  mySocietyTitle: { color: palette.ink, fontSize: 24, lineHeight: 30, fontWeight: '800' },
  mySocietyTitleCompact: { fontSize: 21, lineHeight: 27 },
  mySocietyDescription: { maxWidth: 520 },
  mySocietyDescriptionCompact: { maxWidth: '100%' },
  mySocietyFacts: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
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
  mySocietyFactValue: { color: palette.ink, fontSize: 18, fontWeight: '800' },
  hubShortcutRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
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
  hubShortcutValue: { color: palette.ink, fontSize: 15, fontWeight: '800' },
  mySocietyVisual: { minWidth: 140, alignItems: 'flex-end', justifyContent: 'center', flex: 0 },
  mySocietyScene: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'flex-end', gap: spacing.xs, minHeight: 68 },
  sceneBuildingTall: { width: 26, height: 62, borderRadius: 10, backgroundColor: '#F0C46A' },
  sceneBuildingMedium: { width: 22, height: 46, borderRadius: 10, backgroundColor: '#E4B473' },
  sceneBuildingShort: { width: 20, height: 34, borderRadius: 10, backgroundColor: '#B6D3EC' },
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
  mySocietyButtonText: { color: palette.white, fontSize: 18, fontWeight: '800' },
  actionsPanel: { gap: spacing.md },
  actionsPanelPhone: { gap: spacing.xs },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  panelHeaderCompact: {
    alignItems: 'flex-start',
  },
  panelHeaderPhone: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  panelHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  panelTitle: { color: palette.ink, fontSize: 20, fontWeight: '800' },
  panelTitlePhone: { fontSize: 17 },
  seeAllLink: { paddingVertical: spacing.xs },
  seeAllText: { color: palette.mutedInk, fontSize: 14, fontWeight: '700' },
  seeAllTextPhone: { fontSize: 12 },
  actionScroller: { gap: spacing.sm },
  actionGridPhone: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  actionCard: {
    width: 260,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E9DECF',
    backgroundColor: '#FFFDFC',
    padding: spacing.md,
    gap: spacing.sm,
    ...shadow.card,
  },
  actionCardCompact: {
    width: 224,
  },
  actionCardPhone: {
    width: '48%',
    maxWidth: '48%',
    minWidth: 0,
    padding: spacing.xs,
    borderRadius: 16,
    gap: spacing.xs,
  },
  actionCardArt: {
    height: 70,
    borderRadius: 18,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  actionCardArtPhone: {
    height: 48,
    borderRadius: 14,
    paddingHorizontal: spacing.xs,
  },
  actionCardArtText: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  actionCardTitle: { color: palette.ink, fontSize: 16, fontWeight: '800' },
  actionCardTitlePhone: { fontSize: 12, lineHeight: 14 },
  actionCardMetric: { fontSize: 13, fontWeight: '800' },
  actionCardMetricPhone: { fontSize: 15, lineHeight: 18 },
  hoverLift: {
    transform: [{ translateY: -4 }, { scale: 1.01 }],
    shadowOpacity: 0.18,
  },
  pressDip: {
    transform: [{ translateY: 0 }, { scale: 0.985 }],
    opacity: 0.96,
  },
  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
  summaryRowCompact: { flexDirection: 'column', gap: spacing.md },
  summaryRowPhone: { gap: spacing.sm },
  summaryCard: { flex: 1, minWidth: 280, gap: spacing.md },
  summaryCardCompact: { minWidth: 0 },
  summaryCardPhone: { padding: spacing.sm },
  summaryTitle: { color: palette.ink, fontSize: 18, fontWeight: '800' },
  summaryTitlePhone: { fontSize: 16 },
  summaryStack: { gap: spacing.sm },
  summaryLine: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  summaryDot: {
    width: 10,
    height: 10,
    borderRadius: radius.pill,
    marginTop: 7,
    backgroundColor: palette.accent,
  },
  summaryLineCopy: { flex: 1, gap: 2 },
  summaryLineTitle: { color: palette.ink, fontSize: 15, fontWeight: '800' },
  summaryLineTitlePhone: { fontSize: 14 },
  summaryCaption: { color: palette.mutedInk, fontSize: 13, lineHeight: 18 },
  summaryCaptionPhone: { fontSize: 12, lineHeight: 16 },
  helperBadge: {
    width: 36,
    height: 36,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4EADF',
    borderWidth: 1,
    borderColor: '#E8D9C7',
  },
  helperBadgeText: { color: palette.ink, fontSize: 11, fontWeight: '800' },
  pressed: { opacity: 0.9 },
});
