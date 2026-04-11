import { useEffect, useMemo, useRef, useState } from 'react';
import * as Clipboard from 'expo-clipboard';
import { BackHandler, Image, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions, type ImageSourcePropType } from 'react-native';

import {
  ActionButton,
  Caption,
  ChoiceChip,
  DateTimeField,
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
import { useAppTheme } from '../../theme/appTheme';
import { palette, radius, shadow, spacing } from '../../theme/tokens';
import { openPhoneDialer, openWhatsAppConversation, startRingAlert, stopRingAlert } from '../../utils/communication';
import {
  downloadUploadedFileDataUrl,
  openUploadedFileDataUrl,
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
  getBookingsForSociety,
  getBookingsForUserSociety,
  getComplaintUpdatesForComplaint,
  getComplaintsForUserSociety,
  getCommunityMembersForSociety,
  getCurrentUser,
  getDirectChatThreadsForUser,
  getEntryLogsForSociety,
  getGuardRosterForSociety,
  getLeadershipProfilesForSociety,
  getImportantContactsForSociety,
  getJoinRequestsForSociety,
  getMeetingAgendaItems,
  getMeetingSignatures,
  getMeetingsForSociety,
  getMeetingVotesForItem,
  getMembershipForSociety,
  getPaymentRemindersForUser,
  getPendingSecurityGuestRequestsForResident,
  getPaymentsForUserSociety,
  getResidenceProfileForUserSociety,
  getResidentOverview,
  getRulesForSociety,
  getLatestSocietyDocumentDownloadRequestForUser,
  getSocietyDocuments,
  getSocietyChatThread,
  getSecurityGuestConversationForRequest,
  getSecurityGuestRequestTone,
  getSelectedSociety,
  getSecurityGuestRequestsForResident,
  getStaffVerificationDirectory,
  getUnitsForSociety,
  getVehicleDirectoryForSociety,
  getVisitorPassesForUserSociety,
  isSocietyDocumentDownloadRequestActive,
  humanizeMeetingStatus,
  humanizeMeetingType,
  getMeetingStatusTone,
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

type ResidentTab = 'home' | 'visitors' | 'community' | 'billing' | 'notices' | 'documents' | 'bookings' | 'meetings' | 'helpdesk' | 'profile';
type ResidentCommunitySection = 'members' | 'vehicles' | 'contacts' | 'staff' | 'chat';
type ResidentVisitorsSection = 'create' | 'approvals' | 'history' | 'desk';
type ResidentBillingSection = 'pay' | 'reminders' | 'outstanding' | 'history';
type ResidentNoticeSection = 'announcements' | 'unread' | 'priority' | 'rules';
type ResidentBookingsSection = 'booking' | 'amenities' | 'history';
type ResidentProfileSection = 'household' | 'contacts' | 'vehicles';
type AmenityRecord = SeedData['amenities'][number];
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
  { key: 'documents', label: 'Documents' },
  { key: 'bookings', label: 'Bookings' },
  { key: 'meetings', label: 'Meetings' },
  { key: 'helpdesk', label: 'Helpdesk' },
  { key: 'profile', label: 'Profile' },
];

const residentBottomTabs: Array<{
  key: 'home' | 'community' | 'bookings' | 'billing' | 'profile';
  label: string;
  badge: string;
}> = [
  { key: 'home', label: 'Home', badge: 'HM' },
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
const residentAmenityCategories = [
  {
    key: 'social',
    title: 'Social and hosting',
    amenities: ['Clubhouse Hall', 'Banquet Hall', 'Community Hall', 'Party Lawn', 'Guest Suites', 'Cafe Lounge', 'BBQ Deck'],
  },
  {
    key: 'work',
    title: 'Work and lounge',
    amenities: ['Coworking Lounge', 'Business Lounge', 'Indoor Games Lounge', 'Senior Citizen Lounge'],
  },
  {
    key: 'wellness',
    title: 'Wellness and recreation',
    amenities: ['Gym', 'Swimming Pool', 'Yoga Deck', 'Walking Track', 'Garden'],
  },
  {
    key: 'sports',
    title: 'Sports courts',
    amenities: ['Badminton Court', 'Squash Court', 'Tennis Court', 'Basketball Court'],
  },
  {
    key: 'family',
    title: 'Family and children',
    amenities: ['Childrens Play Area'],
  },
  {
    key: 'pet',
    title: 'Pet and mobility',
    amenities: ['Pet Park', 'Guest Parking'],
  },
] as const;

const residentProfileSections: Array<{ key: ResidentProfileSection; label: string }> = [
  { key: 'household', label: 'Household' },
  { key: 'contacts', label: 'Contacts' },
  { key: 'vehicles', label: 'Vehicles' },
];

function getAmenityVisual(amenityName: string): {
  module: string;
  color: string;
  background: string;
  border: string;
  accent: string;
} {
  const normalized = amenityName.toLowerCase();

  if (normalized.includes('gym') || normalized.includes('pool') || normalized.includes('yoga') || normalized.includes('track') || normalized.includes('garden')) {
    return {
      module: 'AM',
      color: palette.blue,
      background: '#E8F1FD',
      border: '#D2E1F6',
      accent: '#B9D3F7',
    };
  }

  if (normalized.includes('court') || normalized.includes('games')) {
    return {
      module: 'SV',
      color: palette.primary,
      background: '#E7EDF5',
      border: '#D6E0EB',
      accent: '#C2D1E3',
    };
  }

  if (normalized.includes('coworking') || normalized.includes('business') || normalized.includes('lounge')) {
    return {
      module: 'CP',
      color: palette.primary,
      background: '#EBF0F6',
      border: '#DCE4EE',
      accent: '#C8D6E7',
    };
  }

  if (normalized.includes('pet') || normalized.includes('parking')) {
    return {
      module: 'MV',
      color: palette.accent,
      background: '#FDEEE8',
      border: '#F2D7CC',
      accent: '#F6C3AF',
    };
  }

  return {
    module: 'BK',
    color: palette.warning,
    background: '#FFF1DB',
    border: '#F0DEC0',
    accent: '#F5CC84',
  };
}

function getAmenityPhotoUri(amenityName: string) {
  const photoByAmenity: Record<string, ImageSourcePropType> = {
    'Clubhouse Hall': require('../../../assets/amenities/clubhouse-hall.jpg'),
    'Banquet Hall': require('../../../assets/amenities/banquet-hall.jpg'),
    'Community Hall': require('../../../assets/amenities/community-hall.jpg'),
    'Party Lawn': require('../../../assets/amenities/party-lawn.jpg'),
    'Guest Suites': require('../../../assets/amenities/guest-suites.jpg'),
    'Cafe Lounge': require('../../../assets/amenities/cafe-lounge.jpg'),
    'BBQ Deck': require('../../../assets/amenities/bbq-deck.jpg'),
    'Coworking Lounge': require('../../../assets/amenities/coworking-lounge.jpg'),
    'Business Lounge': require('../../../assets/amenities/business-lounge.jpg'),
    'Indoor Games Lounge': require('../../../assets/amenities/indoor-games-lounge.jpg'),
    'Senior Citizen Lounge': require('../../../assets/amenities/senior-citizen-lounge.jpg'),
    Gym: require('../../../assets/amenities/gym.jpg'),
    'Swimming Pool': require('../../../assets/amenities/swimming-pool.jpg'),
    'Yoga Deck': require('../../../assets/amenities/yoga-deck.jpg'),
    'Walking Track': require('../../../assets/amenities/walking-track.jpg'),
    Garden: require('../../../assets/amenities/garden.jpg'),
    'Badminton Court': require('../../../assets/amenities/badminton-court.jpg'),
    'Squash Court': require('../../../assets/amenities/squash-court.jpg'),
    'Tennis Court': require('../../../assets/amenities/tennis-court.jpg'),
    'Basketball Court': require('../../../assets/amenities/basketball-court.jpg'),
    'Childrens Play Area': require('../../../assets/amenities/childrens-play-area.jpg'),
    'Pet Park': require('../../../assets/amenities/pet-park.jpg'),
    'Guest Parking': require('../../../assets/amenities/guest-parking.jpg'),
  };

  return photoByAmenity[amenityName] ?? require('../../../assets/amenities/clubhouse-hall.jpg');
}

function getResidentBottomTabKey(
  activeTab: ResidentTab,
): 'home' | 'community' | 'bookings' | 'billing' | 'profile' {
  switch (activeTab) {
    case 'visitors':
      return 'home';
    case 'helpdesk':
      return 'bookings';
    case 'notices':
    case 'documents':
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
    case 'documents':
      return 'Browse society records, open shared files, and request downloadable copies that require admin approval.';
    case 'bookings':
      return 'Manage amenity requests, schedules, and service-oriented daily actions.';
    case 'meetings':
      return 'Stay informed on society meetings, vote on resolutions, and sign digitally.';
    case 'helpdesk':
      return 'Raise issues, track updates, and follow service requests to resolution.';
    case 'profile':
      return 'Update residence details, household staff, vehicles, and privacy preferences.';
    case 'home':
    default:
      return 'A cleaner society home experience built around the tasks residents use every day.';
  }
}

function getResidentTabBadge(activeTab: ResidentTab) {
  switch (activeTab) {
    case 'home':
      return 'HM';
    case 'visitors':
      return 'VS';
    case 'community':
      return 'CM';
    case 'billing':
      return 'BL';
    case 'notices':
      return 'NT';
    case 'documents':
      return 'DC';
    case 'bookings':
      return 'BK';
    case 'meetings':
      return 'MT';
    case 'helpdesk':
      return 'HD';
    case 'profile':
      return 'PF';
    default:
      return 'RS';
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
  const { theme, toggleMode } = useAppTheme();
  const [activeTab, setActiveTab] = useState<ResidentTab>('home');
  const [preferredCommunitySection, setPreferredCommunitySection] = useState<ResidentCommunitySection>('members');
  const [preferredVisitorsSection, setPreferredVisitorsSection] = useState<ResidentVisitorsSection>('create');
  const [preferredBillingSection, setPreferredBillingSection] = useState<ResidentBillingSection>('pay');
  const [preferredBookingsSection, setPreferredBookingsSection] = useState<ResidentBookingsSection>('booking');
  const [preferredProfileSection, setPreferredProfileSection] = useState<ResidentProfileSection>('household');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const { width } = useWindowDimensions();
  const isCompact = width < 768;
  const isPhone = width < 420;
  const phoneDrawerWidth = Math.min(width - 28, 320);

  useEffect(() => {
    if (Platform.OS !== 'android') {
      return undefined;
    }

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isDrawerOpen) {
        setIsDrawerOpen(false);
        return true;
      }

      if (activeTab !== 'home') {
        setActiveTab('home');
        return true;
      }

      actions.goToRoleSelection();
      return true;
    });

    return () => subscription.remove();
  }, [actions, activeTab, isDrawerOpen]);

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
  const unitIds = new Set(membership.unitIds);
  const units = getUnitsForSociety(state.data, society.id).filter((unit) => unitIds.has(unit.id));
  const primaryUnitLabel = units[0]?.code ?? 'Resident';
  const residenceProfile = getResidenceProfileForUserSociety(state.data, user.id, society.id);
  const residentPhotoDataUrl = residenceProfile?.photoDataUrl ?? '';
  const profiles = deriveProfiles(membership.roles);
  const canUseAdmin = profiles.includes('admin');
  const pendingAccessApprovals = canUseAdmin
    ? getJoinRequestsForSociety(state.data, society.id, 'pending').filter(
        (request) => request.joinRequest.residentType !== 'chairman',
      )
    : [];
  const activeBottomTab = getResidentBottomTabKey(activeTab);

  return (
    <View style={styles.shellRoot}>
      <PageFrame
      footer={!isPhone ? (
        <View style={[styles.bottomNavigationCard, isCompact ? styles.bottomNavigationCardCompact : null, isPhone ? styles.bottomNavigationCardPhone : null]}>
          {residentBottomTabs.map((item) => {
            const isActive = activeBottomTab === item.key;

            return (
              <Pressable
                key={item.key}
                onPress={() => setActiveTab(item.key)}
                style={(state) => [
                  styles.bottomNavigationItem,
                  isCompact ? styles.bottomNavigationItemCompact : null,
                  isPhone ? styles.bottomNavigationItemPhone : null,
                  isActive ? styles.bottomNavigationItemActive : null,
                  (state as { hovered?: boolean }).hovered ? styles.bottomNavigationItemHover : null,
                  state.pressed ? styles.bottomNavigationItemPressed : null,
                ]}
              >
                <View
                  style={[
                    styles.bottomNavigationBadge,
                    isCompact ? styles.bottomNavigationBadgeCompact : null,
                    isPhone ? styles.bottomNavigationBadgePhone : null,
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
                    isPhone ? styles.bottomNavigationLabelPhone : null,
                    isActive ? styles.bottomNavigationLabelActive : null,
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.8}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : undefined}
    >
      {isCompact ? (
        <SurfaceCard style={[styles.compactWorkspaceCard, isPhone ? styles.compactWorkspaceCardPhone : null, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
          <View style={[styles.compactWorkspaceTopRow, isPhone ? styles.compactWorkspaceTopRowPhone : null]}>
            {isPhone ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => setIsDrawerOpen(true)}
                style={({ pressed }) => [styles.phoneMenuButton, pressed ? styles.leftDrawerHandlePressed : null]}
              >
                {residentPhotoDataUrl ? (
                  <Image source={{ uri: residentPhotoDataUrl }} style={styles.phoneMenuAvatarImage} />
                ) : (
                  <View style={styles.phoneMenuAvatarFallback}>
                    <Text style={styles.phoneMenuAvatarFallbackText}>{user.avatarInitials}</Text>
                  </View>
                )}
              </Pressable>
            ) : null}
            <View style={styles.compactWorkspaceTitleWrap}>
              <Pill label="Resident" tone="accent" />
              <Text style={[styles.compactWorkspaceTitle, isPhone ? styles.compactWorkspaceTitlePhone : null, { color: theme.ink }]}>{society.name}</Text>
              <Caption>{user.name.split(' ')[0]} | {residentTabs.find((item) => item.key === activeTab)?.label ?? 'Home'}</Caption>
            </View>
            {activeTab === 'home' ? (
              <Pressable
                accessibilityRole="button"
                onPress={toggleMode}
                style={({ pressed }) => [
                  styles.themeMoonButton,
                  {
                    backgroundColor: theme.mode === 'night' ? theme.primarySoft : theme.surface,
                    borderColor: theme.border,
                  },
                  pressed ? styles.themeMoonButtonPressed : null,
                ]}
              >
                <Text style={[styles.themeMoonIcon, { color: theme.mode === 'night' ? theme.gold : theme.primary }]}>☾</Text>
              </Pressable>
            ) : null}
            <View style={styles.compactWorkspaceStatsRow}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setActiveTab('notices')}
                style={({ pressed }) => [styles.compactWorkspaceStatPressable, pressed ? styles.interactiveCardPressed : null]}
              >
                <View style={[styles.compactWorkspaceStat, isPhone ? styles.compactWorkspaceStatPhone : null, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <Text style={[styles.compactWorkspaceStatValue, isPhone ? styles.compactWorkspaceStatValuePhone : null]}>{overview.unreadAnnouncements.length}</Text>
                  <Text style={[styles.compactWorkspaceStatLabel, { color: theme.mutedInk }]}>Unread</Text>
                </View>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => setActiveTab('helpdesk')}
                style={({ pressed }) => [styles.compactWorkspaceStatPressable, pressed ? styles.interactiveCardPressed : null]}
              >
                <View style={[styles.compactWorkspaceStat, isPhone ? styles.compactWorkspaceStatPhone : null, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <Text style={[styles.compactWorkspaceStatValue, isPhone ? styles.compactWorkspaceStatValuePhone : null]}>
                    {overview.myComplaints.filter((item) => item.status !== 'resolved').length}
                  </Text>
                  <Text style={[styles.compactWorkspaceStatLabel, { color: theme.mutedInk }]}>Open</Text>
                </View>
              </Pressable>
            </View>
          </View>
          <View style={[styles.compactWorkspaceActionRow, isPhone ? styles.compactWorkspaceActionRowPhone : null]}>
            {activeTab !== 'home' ? (
              <ActionButton label="← Back" onPress={() => setActiveTab('home')} variant="secondary" />
            ) : null}
            <ActionButton label="Societies" onPress={actions.goToWorkspaces} variant="secondary" />
            {canUseAdmin ? (
              <ActionButton label="Admin" onPress={actions.goToRoleSelection} variant="secondary" />
            ) : null}
          </View>
          {!isPhone ? <NavigationStrip items={residentTabs} activeKey={activeTab} onChange={setActiveTab} /> : null}
        </SurfaceCard>
      ) : null}

      {!isCompact ? (
        <ResidentWorkspaceRibbon
          societyName={society.name}
          societyArea={society.area}
          societyCity={society.city}
          primaryUnitLabel={primaryUnitLabel}
          userInitials={user.avatarInitials}
          userFirstName={user.name.split(' ')[0] ?? user.name}
          photoDataUrl={residentPhotoDataUrl}
          canUseAdmin={canUseAdmin}
          showThemeToggle={activeTab === 'home'}
          isNightMode={theme.mode === 'night'}
          onOpenProfile={() => setActiveTab('profile')}
          onOpenWorkspaces={actions.goToWorkspaces}
          onSwitchAdmin={actions.goToRoleSelection}
          onToggleTheme={toggleMode}
        />
      ) : null}

      {activeTab === 'home' ? (
        <>
          {pendingAccessApprovals.length > 0 ? (
            <SurfaceCard style={styles.pendingApprovalBanner}>
              <Text style={styles.cardTitle}>Pending access approvals need admin review</Text>
              <Caption>
                {pendingAccessApprovals.length === 1
                  ? '1 owner or tenant request is waiting. Open the admin workspace to approve or reject it.'
                  : `${pendingAccessApprovals.length} owner or tenant requests are waiting. Open the admin workspace to approve or reject them.`}
              </Caption>
              <View style={styles.heroActions}>
                <ActionButton label="Switch to Admin" onPress={actions.goToRoleSelection} />
              </View>
            </SurfaceCard>
          ) : null}
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
          />
        </>
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
          <ActionButton label="← Back" onPress={() => setActiveTab('home')} variant="secondary" />
          <ActionButton label="Workspaces" onPress={actions.goToWorkspaces} variant="secondary" />
          {canUseAdmin ? (
            <ActionButton label="Switch to Admin" onPress={actions.goToRoleSelection} variant="primary" />
          ) : null}
        </View>
        <View style={styles.metricGrid}>
          <MetricCard label="Outstanding dues" value={formatCurrency(overview.totalDue)} tone="accent" onPress={() => setActiveTab('billing')} />
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
      {activeTab === 'documents' ? <ResidentDocuments societyId={society.id} userId={user.id} /> : null}
      {activeTab === 'bookings' ? (
        <ResidentBookings
          societyId={society.id}
          userId={user.id}
          preferredSection={preferredBookingsSection}
        />
      ) : null}
      {activeTab === 'meetings' ? <ResidentMeetings societyId={society.id} userId={user.id} /> : null}
      {activeTab === 'helpdesk' ? <ResidentHelpdesk societyId={society.id} userId={user.id} /> : null}
      {activeTab === 'profile' ? (
        <ResidentProfile
          societyId={society.id}
          userId={user.id}
          preferredSection={preferredProfileSection}
        />
      ) : null}
    </PageFrame>

    {isPhone ? (
      <>
        {isDrawerOpen ? (
          <Pressable style={styles.drawerBackdrop} onPress={() => setIsDrawerOpen(false)} />
        ) : null}

        <View style={[styles.sideDrawer, { width: phoneDrawerWidth, left: isDrawerOpen ? 0 : -phoneDrawerWidth }]}>
          <View style={styles.sideDrawerHeader}>
            <View style={styles.sideDrawerTitleWrap}>
              <Pill label="Resident" tone="accent" />
              <Text style={styles.sideDrawerTitle}>Resident Menu</Text>
            </View>
            <Pressable onPress={() => setIsDrawerOpen(false)} style={({ pressed }) => [styles.sideDrawerClose, pressed ? styles.interactiveCardPressed : null]}>
              <Text style={styles.sideDrawerCloseText}>Close</Text>
            </Pressable>
          </View>

          <View style={styles.sideDrawerProfileCard}>
            <View style={styles.sideDrawerProfileTopRow}>
              <View style={styles.sideDrawerIdentityRow}>
                {residentPhotoDataUrl ? (
                  <Image source={{ uri: residentPhotoDataUrl }} style={styles.sideDrawerAvatarImage} />
                ) : (
                  <View style={styles.sideDrawerAvatarFallback}>
                    <Text style={styles.sideDrawerAvatarFallbackText}>{user.avatarInitials}</Text>
                  </View>
                )}
                <View style={styles.sideDrawerIdentityCopy}>
                  <Text style={styles.sideDrawerResidentName}>{user.name}</Text>
                  <Text style={styles.sideDrawerResidentMeta}>{primaryUnitLabel} · {society.name}</Text>
                </View>
              </View>
              <View style={styles.sideDrawerActiveBadge}>
                <Text style={styles.sideDrawerActiveBadgeText}>{getResidentTabBadge(activeTab)}</Text>
              </View>
            </View>
          </View>

          <Caption style={styles.sideDrawerCaption}>Modules</Caption>
          <ScrollView style={styles.sideDrawerScroller} contentContainerStyle={styles.sideDrawerList} showsVerticalScrollIndicator={false}>
            {residentTabs.map((item) => {
              const isActive = activeTab === item.key;

              return (
                <Pressable
                  key={item.key}
                  onPress={() => {
                    setActiveTab(item.key);
                    setIsDrawerOpen(false);
                  }}
                  style={({ pressed }) => [
                    styles.sideDrawerItem,
                    isActive ? styles.sideDrawerItemActive : null,
                    pressed ? styles.interactiveCardPressed : null,
                  ]}
                >
                  <View style={[styles.sideDrawerItemBadge, isActive ? styles.sideDrawerItemBadgeActive : null]}>
                    <ModuleGlyph
                      module={getResidentTabBadge(item.key)}
                      color={isActive ? palette.primary : palette.ink}
                      size="sm"
                    />
                  </View>
                  <View style={styles.sideDrawerItemCopy}>
                    <Text style={[styles.sideDrawerItemText, isActive ? styles.sideDrawerItemTextActive : null]}>
                      {item.label}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </>
    ) : null}
    </View>
  );
}

function ResidentWorkspaceRibbon({
  societyName,
  societyArea,
  societyCity,
  primaryUnitLabel,
  userInitials,
  userFirstName,
  photoDataUrl,
  canUseAdmin,
  showThemeToggle,
  isNightMode,
  onOpenProfile,
  onOpenWorkspaces,
  onSwitchAdmin,
  onToggleTheme,
}: {
  societyName: string;
  societyArea: string;
  societyCity: string;
  primaryUnitLabel: string;
  userInitials: string;
  userFirstName: string;
  photoDataUrl: string;
  canUseAdmin: boolean;
  showThemeToggle: boolean;
  isNightMode: boolean;
  onOpenProfile: () => void;
  onOpenWorkspaces: () => void;
  onSwitchAdmin: () => void;
  onToggleTheme: () => void;
}) {
  const { theme } = useAppTheme();

  return (
    <View style={styles.utilityBar}>
      <Pressable onPress={onOpenProfile} style={({ pressed }) => [styles.unitPill, pressed ? styles.pressed : null]}>
        {photoDataUrl ? (
          <Image source={{ uri: photoDataUrl }} style={styles.unitAvatarImage} />
        ) : (
          <View style={styles.unitAvatar}>
            <Text style={styles.unitAvatarText}>{userInitials}</Text>
          </View>
        )}
        <View style={styles.unitMeta}>
          <Text style={styles.unitCode}>{primaryUnitLabel}</Text>
          <Caption style={styles.unitMetaText}>{userFirstName}</Caption>
        </View>
      </Pressable>

      <Pressable onPress={onOpenWorkspaces} style={({ pressed }) => [styles.workspacePill, pressed ? styles.pressed : null]}>
        <View style={styles.workspaceBadge}>
          <Text style={styles.workspaceBadgeText}>SO</Text>
        </View>
        <View style={styles.workspaceCopy}>
          <Text style={styles.workspaceTitle}>{societyName}</Text>
          <Caption>{societyArea}, {societyCity}</Caption>
        </View>
      </Pressable>

      <View style={styles.utilityIcons}>
        {showThemeToggle ? (
          <Pressable
            accessibilityRole="button"
            onPress={onToggleTheme}
            style={({ pressed }) => [
              styles.themeMoonButton,
              {
                backgroundColor: isNightMode ? theme.primarySoft : theme.surface,
                borderColor: theme.border,
              },
              pressed ? styles.themeMoonButtonPressed : null,
            ]}
          >
            <Text style={[styles.themeMoonIcon, { color: isNightMode ? theme.gold : theme.primary }]}>☾</Text>
          </Pressable>
        ) : null}
        <RoundUtilityButton label="WK" onPress={onOpenWorkspaces} />
        {canUseAdmin ? <RoundUtilityButton label="AD" onPress={onSwitchAdmin} /> : null}
        {photoDataUrl ? (
          <Image source={{ uri: photoDataUrl }} style={styles.profileRingImage} />
        ) : (
          <View style={styles.profileRing}>
            <Text style={styles.profileRingText}>{userInitials}</Text>
          </View>
        )}
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
          <ActionButton label="View meetings" onPress={() => onOpenTab('meetings')} variant="secondary" />
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
          <MetricCard label="Scheduled passes" value={String(scheduledPasses.length)} tone="accent" onPress={() => setActiveSection('create')} />
          <MetricCard label="Checked in" value={String(activePasses.length)} tone="blue" onPress={() => setActiveSection('history')} />
          <MetricCard label="Completed visits" value={String(visitorPasses.filter(({ visitorPass }) => visitorPass.status === 'completed').length)} onPress={() => setActiveSection('history')} />
          <MetricCard label="Gate approvals" value={String(pendingSecurityGuestRequests.length)} tone="accent" onPress={() => setActiveSection('approvals')} />
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
            <DateTimeField label="Expected arrival" value={expectedAt} onChangeText={setExpectedAt} placeholder="2026-03-24T18:30" mode="datetime" />
          </View>
          <View style={styles.formField}>
            <DateTimeField label="Valid until" value={validUntil} onChangeText={setValidUntil} placeholder="2026-03-24T22:00" mode="datetime" />
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
  const { width } = useWindowDimensions();
  const isCompact = width < 768;
  const isPhone = width < 420;
  const [activeSection, setActiveSection] = useState<ResidentCommunitySection>(preferredSection ?? 'members');
  const [selectedDirectChatUserId, setSelectedDirectChatUserId] = useState('');
  const [groupMessageDraft, setGroupMessageDraft] = useState('');
  const [directMessageDraft, setDirectMessageDraft] = useState('');
  const members = getCommunityMembersForSociety(state.data, societyId);
  const leadershipDirectory = getLeadershipProfilesForSociety(state.data, societyId);
  const society = getSelectedSociety(state.data, societyId);
  const vehicles = getVehicleDirectoryForSociety(state.data, societyId);
  const contacts = getImportantContactsForSociety(state.data, societyId);
  const guards = getGuardRosterForSociety(state.data, societyId);
  const staffDirectory = getStaffVerificationDirectory(state.data, societyId);
  const myMembership = getMembershipForSociety(state.data, userId, societyId);
  const residentDirectoryMembers = members.filter(
    ({ membership }) => !membership.roles.includes('chairman') && !membership.roles.includes('committee'),
  );
  const chairmanMember = leadershipDirectory.find(({ membership }) => membership.roles.includes('chairman'));
  const committeeMembers = leadershipDirectory.filter(
    ({ membership }) => membership.roles.includes('committee') && !membership.roles.includes('chairman'),
  );
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

  function openDirectChatForMember(memberUserId: string) {
    setActiveSection('chat');
    setSelectedDirectChatUserId(memberUserId);
  }

  const communityOverviewCards = [
    {
      key: 'leadership',
      label: isPhone ? 'Leaders' : 'Leadership',
      value: String(leadershipDirectory.length),
      tone: 'accent' as const,
      onPress: () => setActiveSection('members'),
    },
    {
      key: 'members',
      label: 'Members',
      value: String(residentDirectoryMembers.length),
      tone: 'primary' as const,
      onPress: () => setActiveSection('members'),
    },
    {
      key: 'chat',
      label: isPhone ? 'Chats' : 'Chat rooms',
      value: String((groupThread ? 1 : 0) + directThreads.length),
      tone: 'blue' as const,
      onPress: () => setActiveSection('chat'),
    },
    {
      key: 'vehicles',
      label: 'Vehicles',
      value: String(vehicles.length),
      tone: 'accent' as const,
      onPress: () => setActiveSection('vehicles'),
    },
    {
      key: 'contacts',
      label: isPhone ? 'Contacts' : 'Important contacts',
      value: String(contacts.length),
      tone: 'blue' as const,
      onPress: () => setActiveSection('contacts'),
    },
    {
      key: 'staff',
      label: isPhone ? 'Staff' : 'Staff and guards',
      value: String(staffDirectory.length + guards.length),
      tone: 'primary' as const,
      onPress: () => setActiveSection('staff'),
    },
  ];

  return (
    <>
      <SectionHeader
        title="Community hub"
        description="Browse the chairman and committee directory, resident contacts, vehicles, important society numbers, staff coverage, and community chats from one place."
      />
      <SurfaceCard>
        {isPhone ? (
          <View style={styles.communityHubGridPhone}>
            {communityOverviewCards.map((card) => (
              <Pressable
                key={card.key}
                accessibilityRole="button"
                onPress={card.onPress}
                style={({ pressed }) => [
                  styles.communityHubTile,
                  card.tone === 'accent' ? styles.communityHubTileAccent : null,
                  card.tone === 'blue' ? styles.communityHubTileBlue : null,
                  pressed ? styles.interactiveCardPressed : null,
                ]}
              >
                <Text style={styles.communityHubTileLabel} numberOfLines={2}>{card.label}</Text>
                <Text style={styles.communityHubTileValue}>{card.value}</Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <View style={styles.metricGrid}>
            {communityOverviewCards.map((card) => (
              <MetricCard
                key={card.key}
                label={card.label}
                value={card.value}
                tone={card.tone}
                onPress={card.onPress}
              />
            ))}
          </View>
        )}
      </SurfaceCard>

      {activeSection === 'members' ? (
        members.length > 0 ? (
          <>
            {leadershipDirectory.length > 0 ? (
              <SurfaceCard style={styles.leadershipDeskCard}>
                <SectionHeader
                  title="Society leadership directory"
                  description="Quick access cards for the chairman and committee members. Residents can find photo, unit, availability, and direct contact details here."
                />
                <View style={styles.leadershipOverviewRow}>
                  <View style={[styles.leadershipOverviewCard, !isCompact ? styles.leadershipOverviewCardDesktop : null]}>
                    <Caption>Chairman</Caption>
                    <Text style={styles.leadershipOverviewValue}>
                      {chairmanMember
                        ? chairmanMember.leadershipProfile?.displayName ?? chairmanMember.user.name
                        : 'Not assigned'}
                    </Text>
                  </View>
                  <View style={[styles.leadershipOverviewCard, !isCompact ? styles.leadershipOverviewCardDesktop : null]}>
                    <Caption>Committee members</Caption>
                    <Text style={styles.leadershipOverviewValue}>{committeeMembers.length}</Text>
                  </View>
                  <View style={[styles.leadershipOverviewCard, !isCompact ? styles.leadershipOverviewCardDesktop : null]}>
                    <Caption>Help desk contact</Caption>
                    <Text style={styles.leadershipOverviewValue}>
                      {society?.name ?? 'Society team'}
                    </Text>
                  </View>
                </View>
                <View style={styles.leadershipFeatureGrid}>
                  {leadershipDirectory.map((entry) => {
                    const publicName = entry.leadershipProfile?.displayName ?? entry.user.name;
                    const publicRole = entry.leadershipProfile?.roleLabel
                      ?? (entry.membership.roles.includes('chairman') ? 'Chairman' : 'Committee member');
                    const publicPhone = entry.leadershipProfile?.phone ?? entry.user.phone;
                    const publicEmail = entry.leadershipProfile?.email;
                    const publicPhotoDataUrl = entry.leadershipProfile?.photoDataUrl ?? entry.residenceProfile?.photoDataUrl;
                    const unitLabel = entry.units.map((unit) => unit.code).join(', ') || 'Unit pending';
                    const canOpenChat = entry.user.id !== userId;

                    return (
                      <View key={`leadership-${entry.user.id}`} style={styles.leadershipFeatureCard}>
                        <View style={styles.leadershipFeatureHeader}>
                          {publicPhotoDataUrl ? (
                            <Image source={{ uri: publicPhotoDataUrl }} style={styles.leadershipFeatureImage} />
                          ) : (
                            <View style={styles.leadershipFeatureAvatar}>
                              <Text style={styles.leadershipFeatureAvatarText}>{entry.user.avatarInitials}</Text>
                            </View>
                          )}
                          <View style={styles.compactText}>
                            <Text style={styles.directoryMemberName}>{publicName}</Text>
                            <Caption>{publicRole}</Caption>
                            <Caption>{unitLabel}</Caption>
                          </View>
                          <Pill
                            label={entry.membership.roles.includes('chairman') ? 'Chairman' : 'Committee'}
                            tone={entry.membership.roles.includes('chairman') ? 'warning' : 'primary'}
                          />
                        </View>
                        <View style={styles.leadershipDetailGrid}>
                          <View style={styles.leadershipDetailCard}>
                            <Caption>Phone</Caption>
                            <Text style={styles.leadershipDetailValue}>{publicPhone}</Text>
                          </View>
                          <View style={styles.leadershipDetailCard}>
                            <Caption>Unit</Caption>
                            <Text style={styles.leadershipDetailValue}>{unitLabel}</Text>
                          </View>
                          {entry.leadershipProfile?.availability ? (
                            <View style={styles.leadershipDetailCard}>
                              <Caption>Availability</Caption>
                              <Text style={styles.leadershipDetailValue}>{entry.leadershipProfile.availability}</Text>
                            </View>
                          ) : null}
                        </View>
                        {publicEmail ? <Caption>{publicEmail}</Caption> : null}
                        <Caption>
                          {entry.leadershipProfile?.bio
                            ?? 'Available for society approvals, billing questions, maintenance follow-up, and shared community operations.'}
                        </Caption>
                        <View style={styles.directoryActionRow}>
                          {canOpenChat ? (
                            <Pressable
                              accessibilityRole="button"
                              onPress={() => openDirectChatForMember(entry.user.id)}
                              style={({ pressed }) => [styles.memberQuickAction, pressed ? styles.interactiveCardPressed : null]}
                            >
                              <Text style={styles.memberQuickActionText}>Chat</Text>
                            </Pressable>
                          ) : null}
                          <Pressable
                            accessibilityRole="button"
                            onPress={() => {
                              void openPhoneDialer(publicPhone);
                            }}
                            style={({ pressed }) => [styles.memberQuickAction, pressed ? styles.interactiveCardPressed : null]}
                          >
                            <Text style={styles.memberQuickActionText}>Call</Text>
                          </Pressable>
                          <Pressable
                            accessibilityRole="button"
                            onPress={() => {
                              void openWhatsAppConversation(
                                publicPhone,
                                `Hello ${publicName.split(' ')[0]}, I am messaging from the resident app.`,
                              );
                            }}
                            style={({ pressed }) => [styles.memberQuickAction, pressed ? styles.interactiveCardPressed : null]}
                          >
                            <Text style={styles.memberQuickActionText}>WhatsApp</Text>
                          </Pressable>
                          {publicEmail ? (
                            <Pressable
                              accessibilityRole="button"
                              onPress={() => {
                                void openEmailComposer(
                                  publicEmail,
                                  `${publicRole} - ${society?.name ?? societyId}`,
                                );
                              }}
                              style={({ pressed }) => [styles.memberQuickAction, pressed ? styles.interactiveCardPressed : null]}
                            >
                              <Text style={styles.memberQuickActionText}>Email</Text>
                            </Pressable>
                          ) : null}
                        </View>
                      </View>
                    );
                  })}
                </View>
              </SurfaceCard>
            ) : null}
            <SurfaceCard>
              <SectionHeader
                title={leadershipDirectory.length > 0 ? 'Resident directory' : 'Community members'}
                description={
                  leadershipDirectory.length > 0
                    ? 'Leadership contacts stay above for quick access. Browse the remaining resident contacts here.'
                    : 'Browse resident contacts for this society.'
                }
              />
              {residentDirectoryMembers.length > 0 ? (
                <View style={styles.directoryGrid}>
                  {residentDirectoryMembers.map((member) => {
                    const unitLabel = member.units.map((unit) => unit.code).join(', ') || 'Unit pending';
                    const canOpenChat = member.user.id !== userId;
                    const cardContent = (
                      <SurfaceCard
                        style={[
                          styles.directoryCard,
                          canOpenChat ? styles.directoryCardInteractive : null,
                        ]}
                      >
                        <View style={styles.directoryCardHeader}>
                          <View style={styles.directoryCardIdentity}>
                            <Text style={styles.directoryMemberName}>{member.user.name}</Text>
                            <Caption>{member.user.phone}</Caption>
                          </View>
                          <Pill label={unitLabel} tone="accent" />
                        </View>
                        <View style={styles.pillRow}>
                          {member.membership.roles.map((role) => (
                            <Pill key={`${member.membership.id}-${role}`} label={humanizeRole(role)} tone="primary" />
                          ))}
                        </View>
                        <View style={styles.directoryActionRow}>
                          {canOpenChat ? (
                            <Pressable
                              accessibilityRole="button"
                              onPress={() => openDirectChatForMember(member.user.id)}
                              style={({ pressed }) => [styles.memberQuickAction, pressed ? styles.interactiveCardPressed : null]}
                            >
                              <Text style={styles.memberQuickActionText}>Chat</Text>
                            </Pressable>
                          ) : null}
                          <Pressable
                            accessibilityRole="button"
                            onPress={() => {
                              void openPhoneDialer(member.user.phone);
                            }}
                            style={({ pressed }) => [styles.memberQuickAction, pressed ? styles.interactiveCardPressed : null]}
                          >
                            <Text style={styles.memberQuickActionText}>Call</Text>
                          </Pressable>
                          <Pressable
                            accessibilityRole="button"
                            onPress={() => {
                              void openWhatsAppConversation(
                                member.user.phone,
                                `Hi ${member.user.name.split(' ')[0]}, messaging from the society app.`,
                              );
                            }}
                            style={({ pressed }) => [styles.memberQuickAction, pressed ? styles.interactiveCardPressed : null]}
                          >
                            <Text style={styles.memberQuickActionText}>WhatsApp</Text>
                          </Pressable>
                        </View>
                      </SurfaceCard>
                    );

                    return (
                      <View
                        key={member.membership.id}
                        style={[styles.directoryCardSlot, !isCompact ? styles.directoryCardSlotDesktop : null]}
                      >
                        {cardContent}
                      </View>
                    );
                  })}
                </View>
              ) : (
                <Caption>No other resident directory entries are available yet.</Caption>
              )}
            </SurfaceCard>
          </>
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
  const [billingCopyMessage, setBillingCopyMessage] = useState('');
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
  const bankDetailItems = [
    { label: 'Account holder', value: plan?.bankAccountName?.trim() || '' },
    { label: 'Account number', value: plan?.bankAccountNumber?.trim() || '' },
    { label: 'IFSC code', value: plan?.bankIfscCode?.trim() || '' },
    { label: 'Bank name', value: plan?.bankName?.trim() || '' },
    { label: 'Branch', value: plan?.bankBranchName?.trim() || '' },
  ].filter((entry) => entry.value);
  const hasBankSetup = bankDetailItems.length > 0;
  const shouldShowBankSection = Boolean(plan);
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

  async function handleCopyPaymentField(value: string, label: string) {
    const trimmedValue = value.trim();

    if (!trimmedValue) {
      return;
    }

    await Clipboard.setStringAsync(trimmedValue);
    setBillingCopyMessage(`${label} copied.`);
  }

  function renderPaymentCopyButton(value: string, label: string) {
    return (
      <Pressable
        onPress={() => {
          void handleCopyPaymentField(value, label);
        }}
        style={({ pressed }) => [styles.paymentFieldCopyButton, pressed ? styles.paymentFieldCopyButtonPressed : null]}
      >
        <View style={styles.paymentFieldCopyIcon}>
          <View style={styles.paymentFieldCopyIconBack} />
          <View style={styles.paymentFieldCopyIconFront} />
        </View>
      </Pressable>
    );
  }

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
          <MetricCard label="Outstanding dues" value={formatCurrency(overview.totalDue)} tone="accent" onPress={() => setActiveSection('outstanding')} />
          <MetricCard label="Payment flags" value={String(overview.myPendingPayments.length)} tone="primary" onPress={() => setActiveSection('pay')} />
          <MetricCard label="Reminder notices" value={String(reminders.length)} tone="blue" onPress={() => setActiveSection('reminders')} />
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
          description="Use these society payment details in UPI apps or direct bank transfers like NEFT, RTGS, and IMPS. After you pay, share the UTR and screenshot below so the admin desk can verify it."
        />
        {hasUpiSetup || hasBankSetup ? (
          <View style={styles.inlineSection}>
            <Text style={styles.compactTitle}>Pay to the society account</Text>
            {hasUpiSetup ? (
              <View style={styles.inlineSection}>
                <Text style={styles.inlineTitle}>UPI payment details</Text>
                <View style={styles.formGrid}>
                  <View style={styles.profileInfoCard}>
                    <View style={styles.paymentFieldHeader}>
                      <Text style={styles.profileInfoLabel}>Receiver name</Text>
                    </View>
                    <Text style={styles.profileInfoValue}>{upiPayeeName}</Text>
                  </View>
                  {plan?.upiId ? (
                    <View style={styles.profileInfoCard}>
                      <View style={styles.paymentFieldHeader}>
                        <Text style={styles.profileInfoLabel}>UPI ID</Text>
                        {renderPaymentCopyButton(plan.upiId, 'UPI ID')}
                      </View>
                      <Text style={styles.profileInfoValue}>{plan.upiId}</Text>
                    </View>
                  ) : null}
                  {plan?.upiMobileNumber ? (
                    <View style={styles.profileInfoCard}>
                      <View style={styles.paymentFieldHeader}>
                        <Text style={styles.profileInfoLabel}>UPI mobile number</Text>
                        {renderPaymentCopyButton(plan.upiMobileNumber, 'UPI mobile number')}
                      </View>
                      <Text style={styles.profileInfoValue}>{plan.upiMobileNumber}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            ) : null}

            {shouldShowBankSection ? (
              <View style={styles.inlineSection}>
                <Text style={styles.inlineTitle}>Bank transfer details</Text>
                {hasBankSetup ? (
                  <View style={styles.formGrid}>
                    {bankDetailItems.map((entry) => (
                      <View key={entry.label} style={styles.profileInfoCard}>
                        <View style={styles.paymentFieldHeader}>
                          <Text style={styles.profileInfoLabel}>{entry.label}</Text>
                          {renderPaymentCopyButton(entry.value, entry.label)}
                        </View>
                        <Text style={styles.profileInfoValue}>{entry.value}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Caption>The admin has not completed the bank transfer setup yet. UPI details are available above.</Caption>
                )}
              </View>
            ) : null}

            <View style={styles.inlineSection}>
              <Text style={styles.inlineTitle}>Payment reference</Text>
              <View style={styles.formGrid}>
                {residentNumber ? (
                  <View style={styles.profileInfoCard}>
                    <View style={styles.paymentFieldHeader}>
                      <Text style={styles.profileInfoLabel}>Resident / unit number</Text>
                    </View>
                    <Text style={styles.profileInfoValue}>{residentNumber}</Text>
                  </View>
                ) : null}
                <View style={styles.profileInfoCard}>
                  <View style={styles.paymentFieldHeader}>
                    <Text style={styles.profileInfoLabel}>Suggested payment note</Text>
                    {renderPaymentCopyButton(receiverNote, 'Payment note')}
                  </View>
                  <Text style={styles.profileInfoValue}>{receiverNote}</Text>
                </View>
              </View>
            </View>

            {billingCopyMessage ? <Caption>{billingCopyMessage}</Caption> : null}
            {plan?.upiQrCodeDataUrl ? (
              <View style={styles.qrSection}>
                <Text style={styles.compactTitle}>Scan QR to pay</Text>
                <Caption>Open your UPI app and scan this QR code to pay the maintenance bill.</Caption>
                <View style={styles.qrCard}>
                  <Image source={{ uri: plan?.upiQrCodeDataUrl }} style={styles.qrImage} />
                </View>
              </View>
            ) : hasUpiSetup ? (
              <Caption>The admin has not uploaded a QR image yet, so please use the UPI ID or mobile number above in your UPI app.</Caption>
            ) : null}

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
                        <DateTimeField label="Paid on" value={upiPaidAt} onChangeText={setUpiPaidAt} placeholder="2026-03-20T10:30" mode="datetime" />
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
                    <DateTimeField label="Paid on" value={manualPaidAt} onChangeText={setManualPaidAt} placeholder="2026-03-20T10:30" mode="datetime" />
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
        <Caption>No unpaid maintenance invoices are linked to your units right now.</Caption>
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
  const [activeSection, setActiveSection] = useState<ResidentNoticeSection>('announcements');
  const membership = getMembershipForSociety(state.data, userId, societyId);
  const announcements = getAnnouncementsForSociety(state.data, societyId, membership?.roles);
  const rules = getRulesForSociety(state.data, societyId);
  const unreadAnnouncements = announcements.filter((announcement) => !announcement.readByUserIds.includes(userId));
  const highPriorityAnnouncementList = announcements.filter((announcement) => announcement.priority === 'high');
  const visibleAnnouncements =
    activeSection === 'unread'
      ? unreadAnnouncements
      : activeSection === 'priority'
        ? highPriorityAnnouncementList
        : announcements;
  const announcementSectionTitle =
    activeSection === 'unread'
      ? 'Unread announcements'
      : activeSection === 'priority'
        ? 'High priority announcements'
        : 'Society announcements';
  const announcementSectionDescription =
    activeSection === 'unread'
      ? 'Open unread notices here and tap them once to mark them as read.'
      : activeSection === 'priority'
        ? 'Priority communication from the society team stays grouped here for quick review.'
        : 'Tap an unread notice to mark it as read and keep your resident communication queue current.';

  return (
    <>
      <SectionHeader
        title="Notice board"
        description="Stay on top of announcements, unread communication, and society rules from one notice hub."
      />
      <SurfaceCard>
        <View style={styles.metricGrid}>
          <MetricCard label="Announcements" value={String(announcements.length)} tone="primary" onPress={() => setActiveSection('announcements')} />
          <MetricCard label="Unread" value={String(unreadAnnouncements.length)} tone="accent" onPress={() => setActiveSection('unread')} />
          <MetricCard label="High priority" value={String(highPriorityAnnouncementList.length)} tone="blue" onPress={() => setActiveSection('priority')} />
          <MetricCard label="Rules" value={String(rules.length)} tone="primary" onPress={() => setActiveSection('rules')} />
        </View>
        <View style={styles.inlineSection}>
          <Caption>
            Tap a card above to open announcements, unread notices, high-priority updates, or current rules.
          </Caption>
        </View>
      </SurfaceCard>

      {activeSection === 'announcements' || activeSection === 'unread' || activeSection === 'priority' ? (
        <>
      <SectionHeader
        title={announcementSectionTitle}
        description={announcementSectionDescription}
      />
      {visibleAnnouncements.map((announcement) => {
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
      {visibleAnnouncements.length === 0 ? (
        <SurfaceCard>
          <Caption>
            {activeSection === 'unread'
              ? 'You have no unread announcements right now.'
              : activeSection === 'priority'
                ? 'No high-priority announcements are active right now.'
                : 'No society announcements are available yet.'}
          </Caption>
        </SurfaceCard>
      ) : null}
        </>
      ) : null}

      {activeSection === 'rules' ? (
        <>
      <SurfaceCard>
        <SectionHeader
          title="Society rules"
          description="Resident-facing policies, acknowledgements, and current rule versions are managed here."
        />
      </SurfaceCard>
      {rules.length > 0 ? rules.map((rule) => (
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
      )) : (
        <SurfaceCard>
          <Caption>No society rules have been published yet.</Caption>
        </SurfaceCard>
      )}
        </>
      ) : null}
    </>
  );
}

function ResidentDocuments({ societyId, userId }: { societyId: string; userId: string }) {
  const { state, actions } = useApp();
  const societyDocuments = getSocietyDocuments(state.data, societyId);
  const approvedDocumentAccessCount = societyDocuments.filter((document) =>
    isSocietyDocumentDownloadRequestActive(
      getLatestSocietyDocumentDownloadRequestForUser(state.data, document.id, userId),
    ),
  ).length;
  const pendingDocumentAccessCount = societyDocuments.filter((document) => {
    const latestRequest = getLatestSocietyDocumentDownloadRequestForUser(state.data, document.id, userId);
    return latestRequest?.status === 'pending';
  }).length;

  return (
    <>
      <SectionHeader
        title="Documents desk"
        description="Open society office records here and request downloadable copies through the admin approval workflow."
      />
      <SurfaceCard>
        <View style={styles.metricGrid}>
          <MetricCard label="Published docs" value={String(societyDocuments.length)} tone="primary" />
          <MetricCard label="Approved access" value={String(approvedDocumentAccessCount)} tone="blue" />
          <MetricCard label="Pending requests" value={String(pendingDocumentAccessCount)} tone="accent" />
        </View>
        <View style={styles.inlineSection}>
          <Caption>
            You can view every shared record here. Downloading creates a request that the admin team approves or rejects.
          </Caption>
        </View>
      </SurfaceCard>
      {societyDocuments.length > 0 ? societyDocuments.map((document) => {
        const latestRequest = getLatestSocietyDocumentDownloadRequestForUser(state.data, document.id, userId);
        const hasActiveDownloadAccess = isSocietyDocumentDownloadRequestActive(latestRequest);
        const documentRequestStatusMessage =
          latestRequest?.status === 'pending'
            ? `Download requested on ${formatLongDate(latestRequest.requestedAt)}. Waiting for admin approval.`
            : latestRequest?.status === 'approved' && latestRequest.accessExpiresAt
              ? hasActiveDownloadAccess
                ? `Download approved until ${formatLongDate(latestRequest.accessExpiresAt)}.`
                : `Previous approval expired on ${formatLongDate(latestRequest.accessExpiresAt)}. Request access again to download.`
              : latestRequest?.status === 'rejected' && latestRequest.reviewedAt
                ? `Last request was declined on ${formatLongDate(latestRequest.reviewedAt)}.`
                : 'View the document now, or request a downloadable copy for admin approval.';

        return (
          <SurfaceCard key={document.id}>
            <View style={styles.rowBetween}>
              <Text style={styles.cardTitle}>{document.title}</Text>
              <Pill label={humanizeSocietyDocumentCategory(document.category)} tone="warning" />
            </View>
            <Caption>{document.fileName}</Caption>
            {document.summary ? <Caption>{document.summary}</Caption> : null}
            <Caption>
              Uploaded {formatLongDate(document.uploadedAt)}
              {document.issuedOn ? ` | Issued ${document.issuedOn}` : ''}
              {document.validUntil ? ` | Valid until ${document.validUntil}` : ''}
            </Caption>
            <Caption>{documentRequestStatusMessage}</Caption>
            {latestRequest?.reviewNote ? <Caption>Admin note: {latestRequest.reviewNote}</Caption> : null}
            <View style={styles.heroActions}>
              <ActionButton
                label="View document"
                variant="secondary"
                onPress={() => {
                  void openUploadedFileDataUrl(document.fileDataUrl);
                }}
              />
              <ActionButton
                label={
                  hasActiveDownloadAccess
                    ? 'Download file'
                    : latestRequest?.status === 'pending'
                      ? 'Request pending'
                      : 'Request download'
                }
                disabled={state.isSyncing || latestRequest?.status === 'pending'}
                onPress={() => {
                  if (hasActiveDownloadAccess) {
                    void downloadUploadedFileDataUrl(document.fileDataUrl, document.fileName);
                    return;
                  }

                  void actions.requestSocietyDocumentDownload(societyId, document.id, {});
                }}
              />
            </View>
          </SurfaceCard>
        );
      }) : (
        <SurfaceCard>
          <Caption>No office or compliance records have been published yet.</Caption>
        </SurfaceCard>
      )}
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
  const { width } = useWindowDimensions();
  const isPhone = width < 420;
  const { state, actions } = useApp();
  const membership = getMembershipForSociety(state.data, userId, societyId);
  const units = getUnitsForSociety(state.data, societyId).filter((unit) => membership?.unitIds.includes(unit.id));
  const amenities = getAmenitiesForSociety(state.data, societyId);
  const amenityBookings = getBookingsForSociety(state.data, societyId);
  const bookings = getBookingsForUserSociety(state.data, userId, societyId);
  const bookableAmenities = amenities.filter((amenity) => amenity.bookingType !== 'info');
  const categorizedAmenitySections = residentAmenityCategories
    .map((section) => ({
      ...section,
      amenities: section.amenities
        .map((amenityName) => bookableAmenities.find((amenity) => amenity.name === amenityName) ?? null)
        .filter((amenity): amenity is typeof bookableAmenities[number] => amenity !== null),
    }))
    .filter((section) => section.amenities.length > 0);
  const categorizedAmenityIds = new Set(
    categorizedAmenitySections.flatMap((section) => section.amenities.map((amenity) => amenity.id)),
  );
  const uncategorizedBookableAmenities = bookableAmenities.filter(
    (amenity) => !categorizedAmenityIds.has(amenity.id),
  );
  const amenityPhoneSections = [
    ...categorizedAmenitySections,
    ...(uncategorizedBookableAmenities.length > 0
      ? [{ key: 'other', title: 'Other amenities', amenities: uncategorizedBookableAmenities }]
      : []),
  ];
  const [selectedAmenityId, setSelectedAmenityId] = useState<string | null>(bookableAmenities[0]?.id ?? null);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(units[0]?.id ?? null);
  const [bookingDate, setBookingDate] = useState(todayString());
  const [startTime, setStartTime] = useState('18:00');
  const [endTime, setEndTime] = useState('20:00');
  const [guests, setGuests] = useState('4');
  const [activeSection, setActiveSection] = useState<ResidentBookingsSection>(preferredSection ?? 'booking');
  const [activeAmenityCategoryKey, setActiveAmenityCategoryKey] = useState<string>(amenityPhoneSections[0]?.key ?? '');
  const selectedAmenity = bookableAmenities.find((amenity) => amenity.id === selectedAmenityId) ?? null;
  const selectedAmenityRules = state.data.amenityScheduleRules.filter(
    (rule) => rule.amenityId === selectedAmenity?.id,
  );
  const selectedAmenityVisibleBookings = selectedAmenity
    ? amenityBookings.filter(
      ({ booking, amenity }) =>
        amenity?.id === selectedAmenity.id &&
        booking.date === bookingDate &&
        (booking.status === 'pending' || booking.status === 'confirmed'),
    )
    : [];

  useEffect(() => {
    if (preferredSection) {
      setActiveSection(preferredSection);
    }
  }, [preferredSection]);

  useEffect(() => {
    if (selectedAmenityRules.length === 0) {
      return;
    }

    setStartTime(selectedAmenityRules[0].startTime);
    setEndTime(selectedAmenityRules[0].endTime);
  }, [selectedAmenityId]);

  useEffect(() => {
    if (!amenityPhoneSections.some((section) => section.key === activeAmenityCategoryKey)) {
      setActiveAmenityCategoryKey(amenityPhoneSections[0]?.key ?? '');
    }
  }, [activeAmenityCategoryKey, amenityPhoneSections]);

  useEffect(() => {
    if (!isPhone) {
      return;
    }

    const activeSectionAmenities = amenityPhoneSections.find(
      (section) => section.key === activeAmenityCategoryKey,
    )?.amenities ?? [];

    const hasSelectedAmenityInActiveSection = activeSectionAmenities.some(
      (amenity) => amenity.id === selectedAmenityId,
    );

    if (!hasSelectedAmenityInActiveSection && activeSectionAmenities[0]) {
      setSelectedAmenityId(activeSectionAmenities[0].id);
    }
  }, [activeAmenityCategoryKey, amenityPhoneSections, isPhone, selectedAmenityId]);

  const pendingBookings = bookings.filter((booking) => booking.status === 'pending').length;
  const confirmedBookings = bookings.filter((booking) => booking.status === 'confirmed').length;
  const visiblePhoneAmenities = amenityPhoneSections.find((section) => section.key === activeAmenityCategoryKey)?.amenities
    ?? bookableAmenities;

  function handleSelectAmenityCategory(sectionKey: string) {
    setActiveAmenityCategoryKey(sectionKey);

    const nextAmenity = amenityPhoneSections.find((section) => section.key === sectionKey)?.amenities[0];

    if (nextAmenity) {
      setSelectedAmenityId(nextAmenity.id);
    }
  }

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
        <View style={[styles.metricGrid, isPhone ? styles.metricGridPhone : null]}>
          <MetricCard label="Bookable amenities" value={String(bookableAmenities.length)} tone="accent" onPress={() => setActiveSection('amenities')} />
          <MetricCard label="My bookings" value={String(bookings.length)} tone="primary" onPress={() => setActiveSection('history')} />
          {!isPhone ? <MetricCard label="Pending" value={String(pendingBookings)} tone="blue" onPress={() => setActiveSection('history')} /> : null}
          {!isPhone ? <MetricCard label="Confirmed" value={String(confirmedBookings)} tone="primary" onPress={() => setActiveSection('history')} /> : null}
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
            title={isPhone ? 'Book an amenity' : 'Raise an amenity booking'}
            description={isPhone ? 'Pick an amenity, confirm the slot, and submit the request from one compact phone layout.' : 'Choose the amenity, slot, and linked unit here. The same request then appears in the admin amenities module for review.'}
          />
      <SurfaceCard>
        {bookableAmenities.length > 0 ? (
          <View style={[styles.inlineSection, isPhone ? styles.inlineSectionPhone : null]}>
            <Text style={styles.compactTitle}>Amenity</Text>
            {isPhone ? (
              <>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.amenityCategoryScroller}>
                  {amenityPhoneSections.map((section) => (
                    <ChoiceChip
                      key={section.key}
                      label={section.title}
                      selected={activeAmenityCategoryKey === section.key}
                      onPress={() => handleSelectAmenityCategory(section.key)}
                    />
                  ))}
                </ScrollView>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.amenityCardScroller}>
                  {visiblePhoneAmenities.map((amenity) => (
                    <AmenityBookingCard
                      key={amenity.id}
                      amenity={amenity}
                      selected={selectedAmenity?.id === amenity.id}
                      onPress={() => setSelectedAmenityId(amenity.id)}
                      compact
                    />
                  ))}
                </ScrollView>
              </>
            ) : (
              <>
                {categorizedAmenitySections.map((section) => (
                  <View key={section.key} style={styles.inlineSection}>
                    <Text style={styles.inlineTitle}>{section.title}</Text>
                    <View style={styles.amenityCardGrid}>
                      {section.amenities.map((amenity) => (
                        <AmenityBookingCard
                          key={amenity.id}
                          amenity={amenity}
                          selected={selectedAmenity?.id === amenity.id}
                          onPress={() => setSelectedAmenityId(amenity.id)}
                        />
                      ))}
                    </View>
                  </View>
                ))}
                {uncategorizedBookableAmenities.length > 0 ? (
                  <View style={styles.inlineSection}>
                    <Text style={styles.inlineTitle}>Other amenities</Text>
                    <View style={styles.amenityCardGrid}>
                      {uncategorizedBookableAmenities.map((amenity) => (
                        <AmenityBookingCard
                          key={amenity.id}
                          amenity={amenity}
                          selected={selectedAmenity?.id === amenity.id}
                          onPress={() => setSelectedAmenityId(amenity.id)}
                        />
                      ))}
                    </View>
                  </View>
                ) : null}
              </>
            )}
            {selectedAmenity ? (
              <View style={[styles.amenitySelectionSummary, isPhone ? styles.amenitySelectionSummaryPhone : null]}>
                <View style={styles.amenitySelectionSummaryHeader}>
                  <AmenityThumbnail amenityName={selectedAmenity.name} compact={isPhone} />
                  <View style={styles.amenitySelectionSummaryCopy}>
                    <Text style={styles.inlineTitle}>{selectedAmenity.name}</Text>
                    <Caption>
                      {selectedAmenity.approvalMode === 'committee' ? 'Chairman review' : 'Auto confirm'}
                      {' · '}
                      {selectedAmenity.reservationScope === 'fullDay' ? 'Full-day booking' : 'Slot-wise booking'}
                    </Caption>
                  </View>
                </View>
                {selectedAmenityRules.length > 0 ? (
                  <View style={styles.choiceRow}>
                    {selectedAmenityRules.map((rule) => (
                      <Pill key={rule.id} label={`${rule.slotLabel} ${rule.startTime}-${rule.endTime}`} tone="primary" />
                    ))}
                  </View>
                ) : null}
              </View>
            ) : null}
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
            <View style={[styles.formGrid, isPhone ? styles.formGridPhone : null]}>
              <View style={[styles.formField, isPhone ? styles.formFieldPhone : null]}>
                <DateTimeField label="Booking date" value={bookingDate} onChangeText={setBookingDate} placeholder="2026-03-24" mode="date" />
              </View>
              <View style={[styles.formField, isPhone ? styles.formFieldPhone : null]}>
                <DateTimeField label="Start time" value={startTime} onChangeText={setStartTime} placeholder="18:00" mode="time" />
              </View>
              <View style={[styles.formField, isPhone ? styles.formFieldPhone : null]}>
                <DateTimeField label="End time" value={endTime} onChangeText={setEndTime} placeholder="20:00" mode="time" />
              </View>
              <View style={[styles.formField, isPhone ? styles.formFieldPhone : null]}>
                <InputField label="Guests" value={guests} onChangeText={setGuests} keyboardType="numeric" placeholder="4" />
              </View>
            </View>
            {selectedAmenity && !isPhone ? (
              <>
                <Caption>
                  Approval mode: {selectedAmenity.approvalMode === 'committee' ? 'Chairman review' : 'Auto confirm if the slot is free'}.
                </Caption>
                <Caption>
                  Booking mode: {selectedAmenity.reservationScope === 'fullDay' ? 'Full-day lock once any resident books it' : 'Slot-wise booking based on the configured timings'}.
                </Caption>
                {selectedAmenityRules.length > 0 ? (
                  <Caption>
                    Configured slots: {selectedAmenityRules.map((rule) => `${rule.slotLabel} (${rule.startTime}-${rule.endTime})`).join(', ')}
                  </Caption>
                ) : null}
                {selectedAmenityVisibleBookings.length > 0 ? (
                      <View style={[styles.inlineSection, isPhone ? styles.inlineSectionPhone : null]}>
                    <Text style={styles.compactTitle}>Current bookings for {bookingDate}</Text>
                    {selectedAmenityVisibleBookings.map(({ booking, unit, user }) => (
                      <Caption key={booking.id}>
                        {booking.startTime} - {booking.endTime} · {unit?.code ?? 'Unit'} · {user?.name ?? 'Resident'} · {humanizeBookingStatus(booking.status)}
                      </Caption>
                    ))}
                  </View>
                ) : (
                  <Caption>No confirmed or pending bookings are visible yet for this amenity on {bookingDate}.</Caption>
                )}
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
      <SurfaceCard>
        {amenities.length > 0 ? amenities.map((amenity, index) => (
          <View
            key={amenity.id}
            style={[
              styles.amenityListRow,
              index < amenities.length - 1 ? styles.amenityListRowDivider : null,
            ]}
          >
            <View style={styles.amenityListRowLeft}>
              <View style={styles.amenityDiscoveryRow}>
                <AmenityThumbnail amenityName={amenity.name} compact />
                <View style={styles.amenityDiscoveryCopy}>
                  <Text style={styles.amenityListRowTitle}>{amenity.name}</Text>
                  <Text style={styles.amenityListRowMeta}>
                    {amenity.approvalMode}{amenity.capacity ? ` · Cap ${amenity.capacity}` : ''} · {amenity.reservationScope === 'fullDay' ? 'Full-day' : 'Timed slots'}
                  </Text>
                </View>
              </View>
            </View>
            <Pill label={amenity.bookingType} tone="accent" />
          </View>
        )) : (
          <Caption>No amenities are configured yet.</Caption>
        )}
      </SurfaceCard>
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

function AmenityThumbnail({ amenityName, compact }: { amenityName: string; compact?: boolean }) {
  const visual = getAmenityVisual(amenityName);
  const photoSource = getAmenityPhotoUri(amenityName);

  return (
    <View
      style={[
        styles.amenityThumbnail,
        compact ? styles.amenityThumbnailCompact : null,
        { backgroundColor: visual.background, borderColor: visual.border },
      ]}
    >
      <Image source={photoSource} style={styles.amenityThumbnailImage} resizeMode="cover" />
      <View style={styles.amenityThumbnailOverlay} />
      <View style={[styles.amenityThumbnailAccentLarge, { backgroundColor: visual.accent }]} />
      <View style={[styles.amenityThumbnailAccentSmall, { backgroundColor: visual.border }]} />
      <View style={styles.amenityThumbnailGlyphWrap}>
        <ModuleGlyph module={visual.module} color={visual.color} size={compact ? 'md' : 'lg'} />
      </View>
      <Text style={[styles.amenityThumbnailLabel, compact ? styles.amenityThumbnailLabelCompact : null]} numberOfLines={1}>
        {amenityName}
      </Text>
    </View>
  );
}

function AmenityBookingCard({
  amenity,
  selected,
  onPress,
  compact,
}: {
  amenity: AmenityRecord;
  selected: boolean;
  onPress: () => void;
  compact?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.amenityBookingCard,
        compact ? styles.amenityBookingCardCompact : null,
        selected ? styles.amenityBookingCardSelected : null,
        pressed ? styles.interactiveCardPressed : null,
      ]}
    >
      <AmenityThumbnail amenityName={amenity.name} compact={compact} />
      <View style={styles.amenityBookingCardCopy}>
        <Text numberOfLines={compact ? 2 : 1} style={[styles.amenityBookingCardTitle, compact ? styles.amenityBookingCardTitleCompact : null]}>
          {amenity.name}
        </Text>
        <Text numberOfLines={1} style={styles.amenityBookingCardMeta}>
          {amenity.reservationScope === 'fullDay' ? 'Full-day' : 'Timed slots'}
        </Text>
      </View>
      <Pill label={amenity.approvalMode === 'committee' ? 'Review' : 'Auto'} tone={selected ? 'accent' : 'primary'} />
    </Pressable>
  );
}

function ResidentMeetings({ societyId, userId }: { societyId: string; userId: string }) {
  const { state, actions } = useApp();
  const meetings = getMeetingsForSociety(state.data, societyId);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  const [signatureText, setSignatureText] = useState('');
  const currentUser = state.data.users.find((u) => u.id === userId);

  const selectedMeeting = selectedMeetingId
    ? meetings.find((m) => m.id === selectedMeetingId) ?? null
    : null;
  const agendaItems = selectedMeetingId
    ? getMeetingAgendaItems(state.data, selectedMeetingId)
    : [];
  const signatures = selectedMeetingId
    ? getMeetingSignatures(state.data, selectedMeetingId)
    : [];
  const hasAlreadySigned = selectedMeetingId
    ? signatures.some((s) => s.userId === userId)
    : false;

  async function handleVote(agendaItemId: string, meetingId: string, vote: 'yes' | 'no' | 'abstain') {
    await actions.castMeetingVote(societyId, agendaItemId, meetingId, vote);
  }

  async function handleSign() {
    if (!selectedMeetingId || !signatureText.trim()) {
      return;
    }

    const saved = await actions.signMeeting(societyId, selectedMeetingId, signatureText);

    if (saved) {
      setSignatureText('');
    }
  }

  if (selectedMeeting) {
    return (
      <>
        <SectionHeader
          title={selectedMeeting.title}
          description={`${humanizeMeetingType(selectedMeeting.meetingType)} · ${selectedMeeting.venue}`}
        />
        <SurfaceCard>
          <View style={styles.rowBetween}>
            <Pill label={humanizeMeetingStatus(selectedMeeting.status)} tone={getMeetingStatusTone(selectedMeeting.status) as 'primary' | 'accent' | 'warning' | 'success'} />
            <Pill label={humanizeMeetingType(selectedMeeting.meetingType)} tone="primary" />
          </View>
          {selectedMeeting.summary ? (
            <Caption>{selectedMeeting.summary}</Caption>
          ) : null}
          <Caption>{formatLongDate(selectedMeeting.scheduledAt)} · {selectedMeeting.venue}</Caption>
          <ActionButton label="Back to all meetings" onPress={() => setSelectedMeetingId(null)} variant="secondary" />
        </SurfaceCard>

        {selectedMeeting.minutesDocumentDataUrl ? (
          <SurfaceCard>
            <Text style={styles.cardTitle}>Meeting minutes</Text>
            <Caption>The admin has uploaded the official minutes for this meeting.</Caption>
            <ActionButton
              label="Open minutes document"
              onPress={() => {
                if (selectedMeeting.minutesDocumentDataUrl) {
                  openUploadedFileDataUrl(selectedMeeting.minutesDocumentDataUrl);
                }
              }}
              variant="secondary"
            />
          </SurfaceCard>
        ) : null}

        {agendaItems.length > 0 ? (
          <SurfaceCard>
            <SectionHeader
              title="Agenda"
              description="Review items on the agenda. Cast your vote where voting is open."
            />
            {agendaItems.map((item) => {
              const votes = getMeetingVotesForItem(state.data, item.id);
              const myVote = votes.find((v) => v.userId === userId);
              const yesVotes = votes.filter((v) => v.vote === 'yes').length;
              const noVotes = votes.filter((v) => v.vote === 'no').length;
              const abstainVotes = votes.filter((v) => v.vote === 'abstain').length;
              const isOpen = item.votingStatus === 'open';

              return (
                <View key={item.id} style={styles.meetingAgendaRow}>
                  <Text style={styles.meetingAgendaTitle}>{item.sortOrder}. {item.title}</Text>
                  {item.description ? <Caption>{item.description}</Caption> : null}

                  {item.requiresVoting ? (
                    <>
                      {item.resolution ? (
                        <View style={styles.meetingVoteBadgeRow}>
                          <Pill
                            label={`Resolution: ${item.resolution.toUpperCase()}`}
                            tone={item.resolution === 'passed' ? 'success' : item.resolution === 'rejected' ? 'warning' : 'neutral'}
                          />
                        </View>
                      ) : null}

                      {item.votingStatus !== 'notRequired' ? (
                        <Caption>
                          Votes: Yes {yesVotes} · No {noVotes} · Abstain {abstainVotes}
                        </Caption>
                      ) : null}

                      {isOpen ? (
                        <View style={styles.meetingVoteButtonRow}>
                          {myVote ? (
                            <Caption>Your vote: {myVote.vote.toUpperCase()} (tap to change)</Caption>
                          ) : null}
                          <View style={styles.chipRow}>
                            <ChoiceChip
                              label="Yes"
                              selected={myVote?.vote === 'yes'}
                              onPress={() => handleVote(item.id, item.meetingId, 'yes')}
                            />
                            <ChoiceChip
                              label="No"
                              selected={myVote?.vote === 'no'}
                              onPress={() => handleVote(item.id, item.meetingId, 'no')}
                            />
                            <ChoiceChip
                              label="Abstain"
                              selected={myVote?.vote === 'abstain'}
                              onPress={() => handleVote(item.id, item.meetingId, 'abstain')}
                            />
                          </View>
                        </View>
                      ) : null}
                    </>
                  ) : null}
                </View>
              );
            })}
          </SurfaceCard>
        ) : (
          <SurfaceCard><Caption>No agenda items added yet for this meeting.</Caption></SurfaceCard>
        )}

        <SurfaceCard>
          <SectionHeader
            title="Digital signature"
            description="Confirm your attendance and agreement by signing this meeting digitally."
          />
          {hasAlreadySigned ? (
            <Caption>You have already signed this meeting. Your digital signature is recorded.</Caption>
          ) : (
            <>
              <Caption>
                Type your full name as it appears in your resident profile to apply your digital signature.
              </Caption>
              <InputField
                label="Full name (digital signature)"
                value={signatureText}
                onChangeText={setSignatureText}
                placeholder={currentUser?.name ?? 'Your full name'}
              />
              <ActionButton
                label={state.isSyncing ? 'Signing...' : 'Sign this meeting'}
                onPress={handleSign}
                disabled={state.isSyncing || !signatureText.trim()}
              />
            </>
          )}
          {signatures.length > 0 ? (
            <View style={styles.inlineSection}>
              <Caption>{signatures.length} resident(s) have signed:</Caption>
              {signatures.map((sign) => (
                <View key={sign.id} style={styles.meetingSignRow}>
                  <Text style={styles.meetingSignName}>{sign.signatureText}</Text>
                  <Caption>{formatShortDate(sign.signedAt)}</Caption>
                </View>
              ))}
            </View>
          ) : null}
        </SurfaceCard>
      </>
    );
  }

  return (
    <>
      <SectionHeader
        title="Society meetings"
        description="Review past and upcoming society meetings, vote on agenda items, and sign digitally."
      />
      <SurfaceCard>
        <View style={styles.metricGrid}>
          <MetricCard label="Total meetings" value={String(meetings.length)} tone="primary" onPress={() => setSelectedMeetingId(meetings[0]?.id ?? null)} />
          <MetricCard
            label="Upcoming"
            value={String(meetings.filter((m) => m.status === 'scheduled').length)}
            tone="accent"
            onPress={() => setSelectedMeetingId(meetings.find((m) => m.status === 'scheduled')?.id ?? meetings[0]?.id ?? null)}
          />
        </View>
      </SurfaceCard>

      {meetings.length > 0 ? (
        <SurfaceCard>
          {meetings.map((meeting, index) => {
            const items = getMeetingAgendaItems(state.data, meeting.id);
            const openVoteItems = items.filter((item) => item.votingStatus === 'open');
            const mySignature = getMeetingSignatures(state.data, meeting.id).find((s) => s.userId === userId);

            return (
              <Pressable
                key={meeting.id}
                onPress={() => setSelectedMeetingId(meeting.id)}
                style={[
                  styles.meetingListRow,
                  index < meetings.length - 1 ? styles.meetingListRowDivider : null,
                ]}
              >
                <View style={styles.meetingListRowLeft}>
                  <View style={styles.meetingListTopRow}>
                    <Pill label={humanizeMeetingType(meeting.meetingType)} tone="primary" />
                    <Pill label={humanizeMeetingStatus(meeting.status)} tone={getMeetingStatusTone(meeting.status) as 'primary' | 'accent' | 'warning' | 'success'} />
                    {mySignature ? <Pill label="Signed" tone="success" /> : null}
                  </View>
                  <Text style={styles.meetingListTitle}>{meeting.title}</Text>
                  <Caption>{meeting.venue} · {formatShortDate(meeting.scheduledAt)}</Caption>
                  {openVoteItems.length > 0 ? (
                    <Caption>{openVoteItems.length} vote(s) open — tap to cast your vote</Caption>
                  ) : null}
                </View>
                <Text style={styles.meetingListChevron}>›</Text>
              </Pressable>
            );
          })}
        </SurfaceCard>
      ) : (
        <SurfaceCard>
          <Caption>No society meetings have been scheduled yet.</Caption>
        </SurfaceCard>
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
  const [activeComplaintFilter, setActiveComplaintFilter] = useState<'all' | 'open' | 'resolved' | 'updates'>('all');
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
  const visibleComplaints = complaints.filter((complaint) => {
    switch (activeComplaintFilter) {
      case 'open':
        return complaint.status !== 'resolved';
      case 'resolved':
        return complaint.status === 'resolved';
      case 'updates':
        return getComplaintUpdatesForComplaint(state.data, complaint.id).length > 0;
      default:
        return true;
    }
  });

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
          <MetricCard label="Open tickets" value={String(openComplaints.length)} tone="accent" onPress={() => setActiveComplaintFilter('open')} />
          <MetricCard label="Resolved" value={String(resolvedComplaints.length)} tone="primary" onPress={() => setActiveComplaintFilter('resolved')} />
          <MetricCard label="Updates" value={String(complaintUpdateCount)} tone="blue" onPress={() => setActiveComplaintFilter('updates')} />
          <MetricCard label="Linked units" value={String(userUnits.length)} tone="primary" onPress={() => setActiveComplaintFilter('all')} />
        </View>
        <View style={styles.inlineSection}>
          <View style={styles.choiceRow}>
            <ChoiceChip label="All tickets" selected={activeComplaintFilter === 'all'} onPress={() => setActiveComplaintFilter('all')} />
            <ChoiceChip label="Open" selected={activeComplaintFilter === 'open'} onPress={() => setActiveComplaintFilter('open')} />
            <ChoiceChip label="Resolved" selected={activeComplaintFilter === 'resolved'} onPress={() => setActiveComplaintFilter('resolved')} />
            <ChoiceChip label="With updates" selected={activeComplaintFilter === 'updates'} onPress={() => setActiveComplaintFilter('updates')} />
          </View>
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
      {visibleComplaints.length > 0 ? visibleComplaints.map((complaint) => (
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
        <SurfaceCard><Caption>{complaints.length > 0 ? 'No tickets match the current filter.' : 'No helpdesk tickets raised yet.'}</Caption></SurfaceCard>
      )}
    </>
  );
}

function ResidentProfile({
  societyId,
  userId,
  preferredSection,
}: {
  societyId: string;
  userId: string;
  preferredSection?: ResidentProfileSection;
}) {
  const { state, actions } = useApp();
  const { width } = useWindowDimensions();
  const isCompact = width < 768;
  const isPhone = width < 420;
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
  const residentType =
    residenceProfile?.residentType ??
    (membership?.roles.includes('committee')
      ? 'committee'
      : membership?.roles.includes('tenant')
        ? 'tenant'
        : 'owner');
  const [activeSection, setActiveSection] = useState<ResidentProfileSection>(preferredSection ?? 'household');
  const [profileFullName, setProfileFullName] = useState(residenceProfile?.fullName ?? currentUser?.name ?? '');
  const [profilePhotoDataUrl, setProfilePhotoDataUrl] = useState(residenceProfile?.photoDataUrl ?? '');
  const [profileEmail, setProfileEmail] = useState(residenceProfile?.email ?? currentUser?.email ?? '');
  const [profileBusinessName, setProfileBusinessName] = useState(residenceProfile?.businessName ?? '');
  const [profileBusinessDetails, setProfileBusinessDetails] = useState(residenceProfile?.businessDetails ?? '');
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
  const unitCodesLabel = units.map((unit) => unit.code).join(', ') || 'Not assigned yet';
  const showBusinessProfileFields = units.some((unit) => unit.unitType === 'office' || unit.unitType === 'shed');
  const residenceStatusLabel =
    residentType === 'committee'
      ? 'Committee resident'
      : residentType === 'tenant'
        ? 'Tenant resident'
        : 'Owner resident';
  const emergencyContactCount = [
    profileEmergencyContactPhone,
    profileSecondaryEmergencyContactPhone,
  ].filter((value) => value.trim()).length;
  const profileOverviewSummaryCards = [
    {
      label: 'Primary unit',
      value: units[0]?.code ?? 'Awaiting mapping',
      caption: units.length > 1 ? `${units.length} linked units` : 'Single linked unit',
    },
    {
      label: 'Emergency contacts',
      value: String(emergencyContactCount),
      caption: 'Primary and backup household contacts',
    },
    {
      label: 'Vehicles',
      value: String(userVehicles.length),
      caption: 'Registered for gate visibility',
    },
    ...(!isPhone
      ? [
          {
            label: 'Move-in date',
            value: profileMoveInDate || 'Pending',
            caption: 'Occupancy start kept for society records',
          },
        ]
      : []),
  ];
  const saveResidenceProfileDisabled =
    state.isSyncing ||
    !profileFullName.trim() ||
    !profileMoveInDate ||
    hasIncompleteProfileVehicle ||
    !profileConsent;

  useEffect(() => {
    setProfileFullName(residenceProfile?.fullName ?? currentUser?.name ?? '');
    setProfilePhotoDataUrl(residenceProfile?.photoDataUrl ?? '');
    setProfileEmail(residenceProfile?.email ?? currentUser?.email ?? '');
    setProfileBusinessName(residenceProfile?.businessName ?? '');
    setProfileBusinessDetails(residenceProfile?.businessDetails ?? '');
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
    residenceProfile?.businessDetails,
    residenceProfile?.businessName,
    residenceProfile?.dataProtectionConsentAt,
    residenceProfile?.email,
    residenceProfile?.emergencyContactName,
    residenceProfile?.emergencyContactPhone,
    residenceProfile?.fullName,
    residenceProfile?.moveInDate,
    residenceProfile?.photoDataUrl,
    residenceProfile?.rentAgreementDataUrl,
    residenceProfile?.rentAgreementFileName,
    residenceProfile?.secondaryEmergencyContactName,
    residenceProfile?.secondaryEmergencyContactPhone,
    userVehicles,
  ]);

  useEffect(() => {
    if (preferredSection) {
      setActiveSection(preferredSection);
    }
  }, [preferredSection]);

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

  async function handleUploadProfilePhoto(capture?: 'user' | 'environment') {
    try {
      const file = await pickWebFileAsDataUrl({
        accept: 'image/png,image/jpeg,image/webp',
        capture,
        maxSizeInBytes: 4 * 1024 * 1024,
        unsupportedMessage: 'Resident photo upload is available from the web workspace right now.',
        tooLargeMessage: 'Choose a resident profile photo smaller than 4 MB.',
        readErrorMessage: 'Could not read the selected resident profile photo.',
      });

      if (!file) {
        return;
      }

      setProfilePhotoDataUrl(file.dataUrl);
      setProfileActionMessage('Resident photo is ready to save.');
    } catch (error) {
      setProfileActionMessage(
        error instanceof Error ? error.message : 'Could not attach the resident profile photo.',
      );
    }
  }

  async function handleSaveResidenceProfile() {
    const saved = await actions.updateResidenceProfile(societyId, {
      residentType,
      fullName: profileFullName,
      photoDataUrl: profilePhotoDataUrl || undefined,
      email: profileEmail,
      businessName: showBusinessProfileFields ? profileBusinessName : undefined,
      businessDetails: showBusinessProfileFields ? profileBusinessDetails : undefined,
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
        title="Residence profile"
        description="Housing apps usually keep resident profiles focused on unit mapping, verified contact details, emergency contacts, vehicles, and tenancy proof. This page now follows that simpler residence-first structure."
      />
      <SurfaceCard
        style={[
          isCompact ? styles.profileOverviewCardCompact : null,
          isPhone ? styles.profileOverviewCardPhone : null,
        ]}
      >
        <View style={styles.profileOverviewHeader}>
          <View
            style={[
              styles.profileOverviewTopRow,
              isPhone ? styles.profileOverviewTopRowPhone : null,
            ]}
          >
            <View
              style={[
                styles.profileOverviewCopy,
                isPhone ? styles.profileOverviewCopyPhone : null,
              ]}
            >
              <Text style={styles.cardTitle}>Your home in this society</Text>
              <Caption>
                Keep only your residence, contact, and vehicle details here.
              </Caption>
            </View>
            <View
              style={[
                styles.profileIdentityCard,
                isPhone ? styles.profileIdentityCardPhone : null,
              ]}
            >
              {profilePhotoDataUrl ? (
                <Image source={{ uri: profilePhotoDataUrl }} style={styles.profileIdentityImage} />
              ) : (
                <View style={styles.profileIdentityAvatar}>
                  <Text style={styles.profileIdentityAvatarText}>{currentUser?.avatarInitials ?? 'ME'}</Text>
                </View>
              )}
              <View style={styles.profileIdentityCopy}>
                <Text style={styles.profileIdentityName} numberOfLines={1}>
                  {profileFullName || currentUser?.name || 'Resident'}
                </Text>
                <Caption>
                  {isPhone
                    ? currentUser?.phone
                      ? `Verified mobile ${currentUser.phone}`
                      : 'Verified mobile pending'
                    : profilePhotoDataUrl
                      ? 'Workspace photo ready'
                      : 'Add a workspace photo'}
                </Caption>
              </View>
            </View>
          </View>
          {!isPhone ? (
            <View style={styles.pillRow}>
              <Pill label={residenceStatusLabel} tone={residentType === 'tenant' ? 'accent' : 'primary'} />
              <Pill label={`Verified mobile ${currentUser?.phone ?? ''}`.trim()} tone="primary" />
              {residentType === 'tenant' ? (
                <Pill
                  label={rentAgreementFileName ? 'Agreement on file' : 'Agreement pending'}
                  tone={rentAgreementFileName ? 'success' : 'warning'}
                />
              ) : null}
            </View>
          ) : null}
        </View>
        <View style={[styles.profileSummaryGrid, isPhone ? styles.profileSummaryGridPhone : null]}>
          {profileOverviewSummaryCards.map((card) => (
            <View
              key={card.label}
              style={[styles.profileSummaryCard, isPhone ? styles.profileSummaryCardPhone : null]}
            >
              <Text style={styles.profileSummaryLabel}>{card.label}</Text>
              <Text style={styles.profileSummaryValue}>{card.value}</Text>
              <Caption>{card.caption}</Caption>
            </View>
          ))}
        </View>
      </SurfaceCard>

      <SurfaceCard>
        <NavigationStrip items={residentProfileSections} activeKey={activeSection} onChange={(key) => setActiveSection(key as ResidentProfileSection)} />
      </SurfaceCard>

      {activeSection === 'household' ? (
        <SurfaceCard>
          <Text style={styles.cardTitle}>Residence profile and verification</Text>
          <Caption>
            This section is limited to identity, unit occupancy, and the minimum residence verification details used by your society.
          </Caption>
          <View style={styles.inlineSection}>
            <View style={styles.profilePhotoPanel}>
              {profilePhotoDataUrl ? (
                <Image source={{ uri: profilePhotoDataUrl }} style={styles.profilePhotoPreview} />
              ) : (
                <View style={styles.profilePhotoPlaceholder}>
                  <Text style={styles.profilePhotoPlaceholderText}>{currentUser?.avatarInitials ?? 'ME'}</Text>
                </View>
              )}
              <View style={styles.profilePhotoPanelCopy}>
                <Text style={styles.compactTitle}>Resident profile photo</Text>
                <Caption>
                  This photo is shown on your resident workspace when you sign in, so the profile area displays your saved picture instead of only initials.
                </Caption>
                <View style={styles.heroActions}>
                  <ActionButton
                    label="Take photo"
                    onPress={() => {
                      void handleUploadProfilePhoto('user');
                    }}
                    variant="secondary"
                  />
                  <ActionButton
                    label={profilePhotoDataUrl ? 'Replace photo' : 'Upload photo'}
                    onPress={() => {
                      void handleUploadProfilePhoto();
                    }}
                    variant="secondary"
                  />
                  {profilePhotoDataUrl ? (
                    <ActionButton
                      label="Remove photo"
                      onPress={() => {
                        setProfilePhotoDataUrl('');
                        setProfileActionMessage('Resident photo removed. Save the profile to update the workspace.');
                      }}
                      variant="danger"
                    />
                  ) : null}
                </View>
              </View>
            </View>
            <View style={styles.profileInfoGrid}>
              <View style={styles.profileInfoCard}>
                <Text style={styles.profileInfoLabel}>Linked unit access</Text>
                <Text style={styles.profileInfoValue}>{unitCodesLabel}</Text>
                <Caption>{units.length > 1 ? 'All units tied to this membership' : 'Primary residence unit'}</Caption>
              </View>
              <View style={styles.profileInfoCard}>
                <Text style={styles.profileInfoLabel}>Resident status</Text>
                <Text style={styles.profileInfoValue}>{residenceStatusLabel}</Text>
                <Caption>
                  {membership?.roles.map((role) => humanizeRole(role)).join(', ') || 'Resident access pending'}
                </Caption>
              </View>
              <View style={styles.profileInfoCard}>
                <Text style={styles.profileInfoLabel}>Verified mobile</Text>
                <Text style={styles.profileInfoValue}>{currentUser?.phone ?? 'Not available'}</Text>
                <Caption>Primary contact already verified at sign-in</Caption>
              </View>
              <View style={styles.profileInfoCard}>
                <Text style={styles.profileInfoLabel}>Tenant verification</Text>
                <Text style={styles.profileInfoValue}>
                  {residentType === 'tenant'
                    ? rentAgreementFileName
                      ? 'Agreement saved'
                      : 'Agreement needed'
                    : 'Not required'}
                </Text>
                <Caption>
                  {residentType === 'tenant'
                    ? 'Keep the current rent agreement on file for occupancy proof.'
                    : 'Only tenant households need a document on this page.'}
                </Caption>
              </View>
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
            {showBusinessProfileFields ? (
              <View style={styles.inlineSection}>
                <Text style={styles.compactTitle}>Business identity</Text>
                <Caption>
                  Add the business or trade name linked to this office or shed so society records reflect the commercial occupant, not just the verified mobile user.
                </Caption>
                <View style={styles.formGrid}>
                  <View style={styles.formField}>
                    <InputField
                      label="Business name (optional)"
                      value={profileBusinessName}
                      onChangeText={setProfileBusinessName}
                      placeholder="Mindsflux Technologies"
                      autoCapitalize="words"
                    />
                  </View>
                </View>
                <InputField
                  label="Business details (optional)"
                  value={profileBusinessDetails}
                  onChangeText={setProfileBusinessDetails}
                  placeholder="Software development office, warehouse operations, fabrication unit, consulting desk, etc."
                  multiline
                />
              </View>
            ) : null}
            {residentType === 'tenant' ? (
              <View style={styles.inlineSection}>
                <Text style={styles.compactTitle}>Tenant rent agreement</Text>
                <Caption>Keep the latest agreement here so the society can verify current occupancy.</Caption>
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
          </View>
        </SurfaceCard>
      ) : null}

      {activeSection === 'contacts' ? (
        <SurfaceCard>
          <Text style={styles.cardTitle}>Emergency contacts</Text>
          <Caption>
            Only household emergency contacts and notice reachability stay here so the society can contact the right person when needed.
          </Caption>
          <View style={styles.profileInfoGrid}>
            <View style={styles.profileInfoCard}>
              <Text style={styles.profileInfoLabel}>Primary contact status</Text>
              <Text style={styles.profileInfoValue}>
                {profileEmergencyContactPhone.trim() ? 'Added' : 'Pending'}
              </Text>
              <Caption>Best person to reach for your flat in urgent situations</Caption>
            </View>
            <View style={styles.profileInfoCard}>
              <Text style={styles.profileInfoLabel}>Backup contact status</Text>
              <Text style={styles.profileInfoValue}>
                {profileSecondaryEmergencyContactPhone.trim() ? 'Added' : 'Optional'}
              </Text>
              <Caption>Useful when the primary family contact is unavailable</Caption>
            </View>
          </View>
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
        </SurfaceCard>
      ) : null}

      {activeSection === 'vehicles' ? (
        <SurfaceCard>
          <Text style={styles.cardTitle}>Vehicle registrations</Text>
          <Caption>
            Resident apps usually keep vehicle details inside the home profile because they feed gate security, parking visibility, and resident directory lookups.
          </Caption>
          <View style={styles.heroActions}>
            <ActionButton label="Add vehicle" onPress={addProfileVehicle} variant="secondary" />
          </View>
          {profileVehicles.length > 0 ? profileVehicles.map((vehicle, index) => (
            <View key={vehicle.id} style={styles.profileVehicleCard}>
              <View style={styles.rowBetween}>
                <View style={styles.profileVehicleHeaderCopy}>
                  <Text style={styles.inlineTitle}>Vehicle {index + 1}</Text>
                  <Caption>
                    {humanizeVehicleType(vehicle.vehicleType)} for {units.find((unit) => unit.id === vehicle.unitId)?.code ?? 'select a unit'}
                  </Caption>
                </View>
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
            <Caption>No vehicle saved in your residence profile yet.</Caption>
          )}
        </SurfaceCard>
      ) : null}

      <SurfaceCard>
        <Text style={styles.cardTitle}>Save residence details</Text>
        <Caption>
          These details are used only for society access, occupancy verification, resident communication, emergency contact, and vehicle identification.
        </Caption>
        <View style={styles.choiceRow}>
          <ChoiceChip
            label="Residence data consent accepted"
            selected={profileConsent}
            onPress={() => setProfileConsent((currentValue) => !currentValue)}
          />
        </View>
        {profileActionMessage ? <Caption>{profileActionMessage}</Caption> : null}
        <ActionButton
          label={state.isSyncing ? 'Saving...' : 'Save residence profile'}
          onPress={handleSaveResidenceProfile}
          disabled={saveResidenceProfileDisabled}
        />
      </SurfaceCard>
    </>
  );
}

const styles = StyleSheet.create({
  shellRoot: {
    flex: 1,
  },
  compactWorkspaceCard: {
    gap: spacing.xs,
    backgroundColor: '#FFF8F0',
  },
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
  unitAvatarImage: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: '#F4F1EB',
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
  profileRingImage: {
    width: 42,
    height: 42,
    borderRadius: radius.pill,
    backgroundColor: '#F4F1EB',
    borderWidth: 2,
    borderColor: palette.accent,
  },
  profileRingText: {
    color: palette.accent,
    fontSize: 11,
    fontWeight: '800',
  },
  compactWorkspaceCardPhone: {
    gap: 6,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
  },
  compactWorkspaceTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  compactWorkspaceTopRowPhone: {
    gap: 6,
    alignItems: 'stretch',
  },
  compactWorkspaceTitleWrap: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xs,
  },
  compactWorkspaceTitle: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '900',
    color: palette.ink,
  },
  compactWorkspaceTitlePhone: {
    fontSize: 17,
    lineHeight: 21,
  },
  compactWorkspaceStatsRow: {
    flexDirection: 'row',
    gap: 4,
    width: '100%',
  },
  compactWorkspaceStatPressable: {
    flex: 1,
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
  compactWorkspaceStatPhone: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 6,
    borderRadius: 14,
    minHeight: 86,
  },
  compactWorkspaceStatValue: {
    fontSize: 16,
    fontWeight: '800',
    color: palette.accent,
  },
  compactWorkspaceStatValuePhone: {
    fontSize: 14,
  },
  compactWorkspaceStatLabel: {
    color: palette.mutedInk,
    fontSize: 12,
    fontWeight: '700',
  },
  compactWorkspaceActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  compactWorkspaceActionRowPhone: {
    gap: 6,
  },
  themeMoonButton: {
    width: 42,
    height: 42,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  themeMoonButtonPressed: {
    opacity: 0.72,
  },
  themeMoonIcon: {
    fontSize: 18,
    fontWeight: '800',
  },
  residentNavigationCard: {
    gap: spacing.md,
    backgroundColor: '#FFFAF4',
  },
  pendingApprovalBanner: {
    gap: spacing.sm,
    backgroundColor: '#FFF8F0',
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
  bottomNavigationCardPhone: {
    paddingHorizontal: 4,
    paddingVertical: 4,
    borderRadius: 18,
    gap: 2,
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
  bottomNavigationItemPhone: {
    minHeight: 42,
    borderRadius: 12,
    gap: 2,
    paddingHorizontal: 1,
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
  bottomNavigationBadgePhone: {
    width: 22,
    height: 22,
    borderRadius: 7,
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
  bottomNavigationLabelPhone: {
    fontSize: 9,
  },
  bottomNavigationLabelActive: {
    color: palette.accent,
  },
  leftDrawerHandle: {
    position: 'absolute',
    left: 0,
    top: 260,
    paddingHorizontal: 6,
    paddingVertical: 10,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    backgroundColor: palette.primary,
    ...shadow.card,
  },
  leftDrawerHandlePressed: {
    opacity: 0.92,
  },
  leftDrawerHandleText: {
    color: palette.white,
    fontSize: 10,
    fontWeight: '800',
  },
  phoneMenuButton: {
    alignSelf: 'flex-start',
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#EEF3F8',
    borderWidth: 1,
    borderColor: '#D7E2EE',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.card,
  },
  phoneMenuAvatarImage: {
    width: 34,
    height: 34,
    borderRadius: 11,
  },
  phoneMenuAvatarFallback: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.primary,
  },
  phoneMenuAvatarFallbackText: {
    color: palette.white,
    fontSize: 13,
    fontWeight: '900',
  },
  drawerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8, 17, 28, 0.24)',
  },
  sideDrawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: -286,
    paddingTop: 52,
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
    backgroundColor: '#FFF9F1',
    borderRightWidth: 1,
    borderRightColor: '#E8DCCB',
    borderTopRightRadius: 22,
    borderBottomRightRadius: 22,
    gap: spacing.sm,
    shadowColor: '#291D13',
    shadowOpacity: 0.22,
    shadowRadius: 24,
    shadowOffset: { width: 6, height: 0 },
    elevation: 12,
  },
  sideDrawerOpen: {
    left: 0,
  },
  sideDrawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  sideDrawerTitleWrap: {
    flex: 1,
    gap: spacing.xs,
  },
  sideDrawerTitle: {
    color: palette.ink,
    fontSize: 15,
    fontWeight: '800',
  },
  sideDrawerProfileCard: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    borderRadius: 18,
    backgroundColor: palette.primary,
    borderWidth: 1,
    borderColor: '#314B63',
    gap: 0,
  },
  sideDrawerProfileTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  sideDrawerIdentityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
    minWidth: 0,
  },
  sideDrawerAvatarImage: {
    width: 46,
    height: 46,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.45)',
  },
  sideDrawerAvatarFallback: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1E0C8',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  sideDrawerAvatarFallbackText: {
    color: palette.primary,
    fontSize: 16,
    fontWeight: '900',
  },
  sideDrawerIdentityCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  sideDrawerResidentName: {
    color: palette.white,
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '900',
  },
  sideDrawerResidentMeta: {
    color: '#D5E1EE',
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '700',
  },
  sideDrawerActiveBadge: {
    minWidth: 32,
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E9F2FC',
  },
  sideDrawerActiveBadgeText: {
    color: palette.primary,
    fontSize: 10,
    fontWeight: '900',
  },
  sideDrawerClose: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    backgroundColor: '#F8F1E7',
    borderWidth: 1,
    borderColor: '#E8DAC4',
  },
  sideDrawerCloseText: {
    color: palette.ink,
    fontSize: 12,
    fontWeight: '800',
  },
  sideDrawerCaption: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '700',
    color: palette.mutedInk,
  },
  sideDrawerScroller: {
    flex: 1,
  },
  sideDrawerList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    paddingBottom: 36,
  },
  sideDrawerItem: {
    width: '31.5%',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 6,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8DDCF',
    backgroundColor: '#FFFCF8',
    minHeight: 78,
  },
  sideDrawerItemActive: {
    backgroundColor: '#F1F6FC',
    borderColor: '#C8D9ED',
  },
  sideDrawerItemBadge: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3E9DB',
    borderWidth: 1,
    borderColor: '#E7D7C1',
  },
  sideDrawerItemBadgeActive: {
    backgroundColor: '#E3EEF9',
    borderColor: '#C8D9ED',
  },
  sideDrawerItemCopy: {
    minWidth: 0,
    gap: 0,
  },
  sideDrawerItemText: {
    color: palette.ink,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '800',
  },
  sideDrawerItemTextActive: {
    color: palette.primary,
  },
  heroActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  metricGridPhone: {
    justifyContent: 'space-between',
    gap: 6,
  },
  communityHubGridPhone: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  communityHubTile: {
    width: '48.5%',
    minHeight: 94,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D6E0EB',
    backgroundColor: '#EAF1FA',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  communityHubTileAccent: {
    backgroundColor: '#FBE7E0',
    borderColor: '#F0D0C6',
  },
  communityHubTileBlue: {
    backgroundColor: '#E7F0FB',
    borderColor: '#C9DCF0',
  },
  communityHubTileLabel: {
    color: palette.mutedInk,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '700',
  },
  communityHubTileValue: {
    color: palette.ink,
    fontSize: 30,
    lineHeight: 32,
    fontWeight: '900',
  },
  profileOverviewCardCompact: {
    gap: spacing.sm,
  },
  profileOverviewCardPhone: {
    gap: spacing.xs,
  },
  profileOverviewHeader: {
    gap: spacing.sm,
  },
  profileOverviewTopRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.md,
    alignItems: 'center',
  },
  profileOverviewTopRowPhone: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  profileOverviewCopy: {
    flex: 1,
    minWidth: 220,
    gap: spacing.xs,
  },
  profileOverviewCopyPhone: {
    minWidth: 0,
  },
  profileIdentityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minWidth: 220,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E7D9C8',
    backgroundColor: '#FFF8F0',
  },
  profileIdentityCardPhone: {
    width: '100%',
    minWidth: 0,
  },
  profileIdentityAvatar: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4EADF',
    borderWidth: 1,
    borderColor: '#E7D8C5',
  },
  profileIdentityAvatarText: {
    color: palette.mutedInk,
    fontSize: 16,
    fontWeight: '800',
  },
  profileIdentityImage: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: '#F4F1EB',
  },
  profileIdentityCopy: {
    flex: 1,
    gap: 2,
  },
  profileIdentityName: {
    color: palette.ink,
    fontSize: 15,
    fontWeight: '800',
  },
  profileSummaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  profileSummaryGridPhone: {
    gap: spacing.xs,
  },
  profileSummaryCard: {
    flexGrow: 1,
    flexBasis: 180,
    minWidth: 0,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E6D9C9',
    backgroundColor: '#FFF8F0',
    gap: 4,
  },
  profileSummaryCardPhone: {
    flexBasis: '100%',
  },
  profileSummaryLabel: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: palette.mutedInk,
  },
  profileSummaryValue: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '900',
    color: palette.ink,
  },
  profileInfoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  profilePhotoPanel: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E7D9C8',
    backgroundColor: '#FFF8F0',
  },
  profilePhotoPanelCopy: {
    flex: 1,
    minWidth: 220,
    gap: spacing.xs,
  },
  profilePhotoPreview: {
    width: 96,
    height: 96,
    borderRadius: 28,
    backgroundColor: '#F4F1EB',
  },
  profilePhotoPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4EADF',
    borderWidth: 1,
    borderColor: '#E7D8C5',
  },
  profilePhotoPlaceholderText: {
    color: palette.mutedInk,
    fontSize: 24,
    fontWeight: '800',
  },
  profileInfoCard: {
    flexGrow: 1,
    flexBasis: 220,
    minWidth: 0,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E7D9C8',
    backgroundColor: '#FFFDF9',
    gap: 4,
  },
  profileInfoLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: palette.mutedInk,
  },
  profileInfoValue: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '900',
    color: palette.ink,
  },
  paymentFieldHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  paymentFieldCopyButton: {
    width: 24,
    height: 24,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2A2A2A',
  },
  paymentFieldCopyButtonPressed: {
    opacity: 0.82,
  },
  paymentFieldCopyIcon: {
    width: 12,
    height: 12,
    position: 'relative',
  },
  paymentFieldCopyIconBack: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#D8D8D8',
  },
  paymentFieldCopyIconFront: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    width: 8,
    height: 8,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    backgroundColor: 'transparent',
  },
  directoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  directoryCardSlot: {
    width: '100%',
  },
  directoryCardSlotDesktop: {
    flexBasis: '32%',
    maxWidth: '32%',
  },
  directoryCard: {
    gap: spacing.xs,
    minWidth: 0,
    padding: spacing.sm,
    borderRadius: 18,
  },
  directoryCardInteractive: {
    backgroundColor: '#FFFCF9',
  },
  directoryCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  directoryCardIdentity: {
    flex: 1,
    gap: 2,
  },
  directoryMemberName: {
    fontSize: 16,
    fontWeight: '800',
    color: palette.ink,
  },
  directoryActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  memberQuickAction: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E8DAC4',
    backgroundColor: '#F8F1E7',
  },
  memberQuickActionText: {
    color: palette.ink,
    fontSize: 12,
    fontWeight: '800',
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
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
  amenityListRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    gap: spacing.sm,
  },
  amenityListRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  amenityListRowLeft: {
    flex: 1,
    gap: 2,
  },
  amenityDiscoveryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  amenityDiscoveryCopy: {
    flex: 1,
    gap: 2,
  },
  amenityListRowTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: palette.ink,
  },
  amenityListRowMeta: {
    fontSize: 11,
    color: palette.mutedInk,
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
  inlineSectionPhone: {
    paddingTop: spacing.sm,
    gap: spacing.xs,
  },
  communityHintPhone: {
    fontSize: 12,
    lineHeight: 18,
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
    gap: spacing.xs,
  },
  amenityCategoryScroller: {
    gap: spacing.xs,
    paddingBottom: 2,
  },
  amenityCardScroller: {
    gap: spacing.sm,
    paddingBottom: spacing.xs,
  },
  amenityCardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  amenityBookingCard: {
    flexBasis: 180,
    maxWidth: 200,
    minWidth: 160,
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E9DECF',
    backgroundColor: '#FFFDFC',
    ...shadow.card,
  },
  amenityBookingCardCompact: {
    width: 134,
    minWidth: 134,
    maxWidth: 134,
    gap: 6,
    padding: spacing.xs,
    borderRadius: 16,
  },
  amenityBookingCardSelected: {
    borderColor: '#C8D9EE',
    backgroundColor: '#F7FBFF',
  },
  amenityBookingCardCopy: {
    gap: 2,
  },
  amenityBookingCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: palette.ink,
  },
  amenityBookingCardTitleCompact: {
    fontSize: 13,
    lineHeight: 17,
  },
  amenityBookingCardMeta: {
    fontSize: 11,
    color: palette.mutedInk,
  },
  amenityThumbnail: {
    height: 96,
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  amenityThumbnailCompact: {
    height: 64,
    borderRadius: 14,
    paddingHorizontal: spacing.xs,
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  amenityThumbnailImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  amenityThumbnailOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(18, 28, 39, 0.24)',
  },
  amenityThumbnailAccentLarge: {
    position: 'absolute',
    top: -12,
    right: -12,
    width: 54,
    height: 54,
    borderRadius: 27,
    opacity: 0.8,
  },
  amenityThumbnailAccentSmall: {
    position: 'absolute',
    bottom: -8,
    left: -8,
    width: 34,
    height: 34,
    borderRadius: 17,
    opacity: 0.75,
  },
  amenityThumbnailGlyphWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  amenityThumbnailLabel: {
    color: palette.white,
    fontSize: 13,
    fontWeight: '800',
    textShadowColor: 'rgba(0, 0, 0, 0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  amenityThumbnailLabelCompact: {
    fontSize: 11,
  },
  amenitySelectionSummary: {
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E6D9C9',
    backgroundColor: '#FFF9F1',
  },
  amenitySelectionSummaryPhone: {
    gap: spacing.xs,
  },
  amenitySelectionSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  amenitySelectionSummaryCopy: {
    flex: 1,
    gap: 2,
  },
  formGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  formGridPhone: {
    gap: spacing.xs,
  },
  formField: {
    flexGrow: 1,
    flexBasis: 220,
  },
  formFieldPhone: {
    flexBasis: '48%',
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
  profileVehicleHeaderCopy: {
    flex: 1,
    gap: 2,
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
  leadershipDeskCard: {
    gap: spacing.md,
  },
  leadershipOverviewRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  leadershipOverviewCard: {
    width: '100%',
    gap: 4,
    padding: spacing.xs,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E7D0B5',
    backgroundColor: '#FFF4E6',
  },
  leadershipOverviewCardDesktop: {
    flexBasis: '31.5%',
    maxWidth: '31.5%',
  },
  leadershipOverviewValue: {
    fontSize: 14,
    fontWeight: '800',
    color: palette.ink,
  },
  leadershipFeatureGrid: {
    gap: spacing.sm,
  },
  leadershipFeatureCard: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E6D6C3',
    backgroundColor: '#FFF9F2',
  },
  leadershipFeatureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  leadershipFeatureAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#24364A',
  },
  leadershipFeatureAvatarText: {
    color: palette.white,
    fontSize: 22,
    fontWeight: '800',
  },
  leadershipFeatureImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F4F1EB',
  },
  leadershipDetailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  leadershipDetailCard: {
    flexGrow: 1,
    minWidth: 120,
    gap: 2,
    padding: spacing.sm,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EEDCC8',
    backgroundColor: palette.white,
  },
  leadershipDetailValue: {
    fontSize: 13,
    fontWeight: '700',
    color: palette.ink,
  },
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
  meetingAgendaTitle: { fontSize: 14, fontWeight: '700', color: palette.ink },
  meetingVoteBadgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: 2 },
  meetingVoteButtonRow: { gap: spacing.xs, marginTop: spacing.xs },
  meetingSignRow: {
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: '#F0E8DF',
    gap: 2,
  },
  meetingSignName: { fontSize: 14, fontWeight: '700', color: palette.ink, fontStyle: 'italic' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
});

async function openEmailComposer(email: string, subject?: string) {
  const normalized = String(email ?? '').trim();

  if (!normalized) {
    return false;
  }

  const url = `mailto:${encodeURIComponent(normalized)}${subject ? `?subject=${encodeURIComponent(subject)}` : ''}`;

  try {
    await Linking.openURL(url);
    return true;
  } catch (error) {
    return false;
  }
}

function humanizeSocietyDocumentCategory(category: string) {
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
    default:
      return 'Other document';
  }
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
