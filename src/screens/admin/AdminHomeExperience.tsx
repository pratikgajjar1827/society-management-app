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
  | 'audit';
type AccentTone = 'accent' | 'blue' | 'gold' | 'primary';
type HomeHubSectionKey = 'residents' | 'billing' | 'security' | 'operations';
type HubTile = {
  label: string;
  subtitle: string;
  badge: string;
  tab: AdminTab;
  tone: AccentTone;
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
    { label: 'Access claims', subtitle: pendingJoinRequests.length > 0 ? `${pendingJoinRequests.length} pending` : 'No pending claim', badge: 'AC', tab: 'residents', tone: 'accent' },
    { label: 'Residents', subtitle: `${residentsCount} linked members`, badge: 'RD', tab: 'residents', tone: 'blue' },
    { label: 'Unit directory', subtitle: `${residentsDirectory.length} ${unitLabel}`, badge: 'UT', tab: 'residents', tone: 'primary' },
    { label: 'Staff links', subtitle: `${staffDirectory.length} records`, badge: 'ST', tab: 'security', tone: 'gold' },
    { label: 'Complaints', subtitle: `${complaints.length} total tickets`, badge: 'CP', tab: 'helpdesk', tone: 'accent' },
    { label: 'Announcements', subtitle: latestAnnouncement ? formatShortDate(latestAnnouncement.createdAt) : 'No update yet', badge: 'NT', tab: 'announcements', tone: 'blue' },
  ];

  const billingTiles: HubTile[] = [
    { label: 'Collections', subtitle: `${overview.collectionRate}% rate`, badge: 'CL', tab: 'collections', tone: 'accent' },
    { label: 'Overdue', subtitle: overdueCollectionCount > 0 ? `${overdueCollectionCount} invoices` : 'All clear', badge: 'DU', tab: 'collections', tone: 'gold' },
    { label: 'Payment flags', subtitle: pendingPayments > 0 ? `${pendingPayments} pending` : 'No review queue', badge: 'PF', tab: 'collections', tone: 'blue' },
    { label: 'Ledger', subtitle: `${payments.length} payment(s)`, badge: 'LG', tab: 'ledger', tone: 'primary' },
    { label: 'Reminders', subtitle: remindersCount > 0 ? `${remindersCount} sent` : 'No reminder', badge: 'RM', tab: 'billing', tone: 'accent' },
    { label: 'Billing setup', subtitle: 'Cycles and receiver details', badge: 'UP', tab: 'billing', tone: 'gold' },
  ];

  const securityTiles: HubTile[] = [
    { label: 'Visitor passes', subtitle: scheduledVisitors > 0 ? `${scheduledVisitors} scheduled` : 'No active pass', badge: 'VP', tab: 'security', tone: 'gold' },
    { label: 'Checked in', subtitle: checkedInVisitors > 0 ? `${checkedInVisitors} inside` : 'Gate is clear', badge: 'IN', tab: 'security', tone: 'blue' },
    { label: 'Entry logs', subtitle: `${entryLogs.length} records`, badge: 'LG', tab: 'security', tone: 'primary' },
    { label: 'Guard roster', subtitle: `${guards.length} guard(s)`, badge: 'GD', tab: 'security', tone: 'primary' },
    { label: 'Staff KYC', subtitle: pendingStaffCount > 0 ? `${pendingStaffCount} pending` : 'All verified', badge: 'KY', tab: 'security', tone: 'accent' },
    { label: 'Incidents', subtitle: securityComplaints.length > 0 ? `${securityComplaints.length} issues` : 'No security issue', badge: 'IS', tab: 'helpdesk', tone: 'blue' },
  ];

  const operationsTiles: HubTile[] = [
    { label: 'Helpdesk', subtitle: `${overview.openComplaints} open`, badge: 'HD', tab: 'helpdesk', tone: 'accent' },
    { label: 'Amenities', subtitle: `${amenities.length} live`, badge: 'AM', tab: 'amenities', tone: 'gold' },
    { label: 'Bookings', subtitle: pendingBookings > 0 ? `${pendingBookings} pending` : `${bookings.length} total`, badge: 'BK', tab: 'amenities', tone: 'blue' },
    { label: 'Announcements', subtitle: `${announcements.length} published`, badge: 'AN', tab: 'announcements', tone: 'accent' },
    { label: 'Audit trail', subtitle: `${auditEvents.length} events`, badge: 'AU', tab: 'audit', tone: 'primary' },
    { label: 'Collections', subtitle: `${overview.collectionRate}% healthy`, badge: 'CL', tab: 'collections', tone: 'gold' },
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

      <SurfaceCard style={styles.actionsPanel}>
        <View style={[styles.panelHeader, isCompact ? styles.panelHeaderCompact : null]}>
          <View style={styles.panelHeaderLeft}>
            <Text style={styles.panelTitle}>Admin actions</Text>
            <Pill label="Live" tone="accent" />
          </View>
          <Pressable onPress={() => onOpenTab('audit')} style={({ pressed }) => [styles.seeAllLink, pressed ? styles.pressed : null]}>
            <Text style={styles.seeAllText}>See all</Text>
          </Pressable>
        </View>

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
            />
          ))}
        </ScrollView>
      </SurfaceCard>

      <View style={[styles.summaryRow, isCompact ? styles.summaryRowCompact : null]}>
        <SurfaceCard style={[styles.summaryCard, isCompact ? styles.summaryCardCompact : null]}>
          <Text style={styles.summaryTitle}>Live admin attention</Text>
          <View style={styles.summaryStack}>
            <View style={styles.summaryLine}>
              <View style={styles.summaryDot} />
              <View style={styles.summaryLineCopy}>
                <Text style={styles.summaryLineTitle}>Pending approvals</Text>
                <Caption>{overview.pendingApprovals} queue item(s) need action right now.</Caption>
              </View>
            </View>
            <View style={styles.summaryLine}>
              <View style={styles.summaryDot} />
              <View style={styles.summaryLineCopy}>
                <Text style={styles.summaryLineTitle}>Collection health</Text>
                <Caption>{overview.collectionRate}% collected with {overdueCollectionCount} overdue invoice(s).</Caption>
              </View>
            </View>
            <View style={styles.summaryLine}>
              <View style={styles.summaryDot} />
              <View style={styles.summaryLineCopy}>
                <Text style={styles.summaryLineTitle}>Security readiness</Text>
                <Caption>{guards.length} guards, {scheduledVisitors} scheduled visitor pass(es), {pendingStaffCount} staff KYC pending.</Caption>
              </View>
            </View>
          </View>
        </SurfaceCard>

        <SurfaceCard style={[styles.summaryCard, isCompact ? styles.summaryCardCompact : null]}>
          <Text style={styles.summaryTitle}>Communication and audit pulse</Text>
          {latestAnnouncement ? (
            <View style={styles.summaryLine}>
              <View style={styles.helperBadge}>
                <Text style={styles.helperBadgeText}>AN</Text>
              </View>
              <View style={styles.summaryLineCopy}>
                <Text style={styles.summaryLineTitle}>{latestAnnouncement.title}</Text>
                <Caption>Latest notice on {formatShortDate(latestAnnouncement.createdAt)}</Caption>
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
                <Text style={styles.summaryLineTitle}>{latestAuditEvent.title}</Text>
                <Caption>{formatShortDate(latestAuditEvent.createdAt)}</Caption>
              </View>
            </View>
          ) : null}
          <Caption>
            Open complaints: {overview.openComplaints}. Pending bookings: {pendingBookings}. Published notices: {announcements.length}.
          </Caption>
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
      <Caption style={styles.topCategorySubtitle}>{subtitle}</Caption>
    </Pressable>
  );
}

function BoardTile({
  label,
  subtitle,
  badge,
  tone,
  onPress,
  compact,
}: {
  label: string;
  subtitle: string;
  badge: string;
  tone: AccentTone;
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
      <View style={[styles.boardTileBadge, { backgroundColor: toneStyle.badgeBackground }]}>
        <ModuleGlyph module={badge} color={toneStyle.badgeText} size="lg" />
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

function ActionCard({
  title,
  body,
  metric,
  module,
  tone,
  onPress,
  compact,
}: {
  title: string;
  body: string;
  metric: string;
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
      <Text style={[styles.actionCardMetric, { color: toneStyle.badgeText }]}>{metric}</Text>
      <Caption>{body}</Caption>
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
  topCategoryCardActive: { backgroundColor: palette.surface, ...shadow.card },
  topCategoryBadge: { width: 48, height: 48, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  topCategoryBadgeText: { fontSize: 13, fontWeight: '800' },
  topCategoryTitle: { color: '#3E4755', fontSize: 17, fontWeight: '700' },
  topCategoryTitleActive: { color: palette.ink },
  topCategorySubtitle: { textAlign: 'center' },
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
  boardTileBadge: { width: 58, height: 58, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  boardTileBadgeText: { fontSize: 13, fontWeight: '800' },
  boardTileCopy: { gap: 4, flex: 1 },
  boardTileTitle: { color: palette.ink, fontSize: 16, fontWeight: '700' },
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
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  panelHeaderCompact: {
    alignItems: 'flex-start',
  },
  panelHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  panelTitle: { color: palette.ink, fontSize: 20, fontWeight: '800' },
  seeAllLink: { paddingVertical: spacing.xs },
  seeAllText: { color: palette.mutedInk, fontSize: 14, fontWeight: '700' },
  actionScroller: { gap: spacing.sm },
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
  actionCardArt: {
    height: 70,
    borderRadius: 18,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  actionCardArtText: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  actionCardTitle: { color: palette.ink, fontSize: 16, fontWeight: '800' },
  actionCardMetric: { fontSize: 13, fontWeight: '800' },
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
  summaryCard: { flex: 1, minWidth: 280, gap: spacing.md },
  summaryCardCompact: { minWidth: 0 },
  summaryTitle: { color: palette.ink, fontSize: 18, fontWeight: '800' },
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
