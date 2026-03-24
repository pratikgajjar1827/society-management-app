import {
  AnnouncementAudience,
  CommercialSpaceType,
  ComplaintTicket,
  JoinRequest,
  Membership,
  MembershipRole,
  ResidenceProfile,
  RoleProfile,
  SeedData,
  SocietySetupDraft,
  SocietyStructureOption,
  SocietyWorkspace,
  UserProfile,
} from '../types/domain';

export type AdminRecommendationTab =
  | 'residents'
  | 'billing'
  | 'collections'
  | 'amenities'
  | 'helpdesk'
  | 'security'
  | 'announcements'
  | 'audit';

export interface AdminRecommendation {
  tab: AdminRecommendationTab;
  title: string;
  summary: string;
  metric: string;
  tone: 'primary' | 'accent' | 'warning' | 'success';
  actionLabel: string;
  priority: number;
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatShortDate(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(value));
}

export function formatLongDate(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

export function isAdminRole(role: MembershipRole) {
  return role === 'chairman' || role === 'committee';
}

export function isResidentRole(role: MembershipRole) {
  return role === 'owner' || role === 'tenant' || role === 'family' || role === 'authorizedOccupant';
}

export function humanizeRole(role: MembershipRole) {
  switch (role) {
    case 'authorizedOccupant':
      return 'Authorized occupant';
    default:
      return role.charAt(0).toUpperCase() + role.slice(1);
  }
}

export function humanizeProfile(profile: RoleProfile) {
  return profile === 'admin' ? 'Admin view' : 'Resident view';
}

function doesAnnouncementReachRoles(
  audience: AnnouncementAudience,
  roles?: MembershipRole[],
) {
  if (!roles) {
    return true;
  }

  switch (audience) {
    case 'residents':
      return roles.some(isResidentRole);
    case 'committee':
      return roles.some(isAdminRole);
    case 'owners':
      return roles.includes('owner');
    case 'tenants':
      return roles.includes('tenant');
    case 'all':
    default:
      return true;
  }
}

type StructureDescriptor =
  | Pick<
      SocietySetupDraft,
      'structure' | 'enabledStructures' | 'commercialSpaceType' | 'enabledCommercialSpaceTypes'
    >
  | Pick<
      SocietyWorkspace,
      'structure' | 'enabledStructures' | 'commercialSpaceType' | 'enabledCommercialSpaceTypes'
    >;

const structureOptions: SocietyStructureOption[] = ['apartment', 'bungalow', 'commercial'];
const commercialSpaceTypes: CommercialSpaceType[] = ['shed', 'office'];

function normalizeStructureList(value?: SocietyStructureOption[] | null) {
  return [...new Set((value ?? []).filter((item): item is SocietyStructureOption => structureOptions.includes(item)))];
}

function normalizeCommercialSpaceTypeList(value?: CommercialSpaceType[] | null) {
  return [...new Set((value ?? []).filter((item): item is CommercialSpaceType => commercialSpaceTypes.includes(item)))];
}

export function getEnabledStructures(society: StructureDescriptor) {
  const configuredStructures = normalizeStructureList(society.enabledStructures);

  if (configuredStructures.length > 0) {
    return configuredStructures;
  }

  return structureOptions.includes(society.structure as SocietyStructureOption)
    ? [society.structure as SocietyStructureOption]
    : [];
}

export function getEnabledCommercialSpaceTypes(society: StructureDescriptor) {
  const configuredTypes = normalizeCommercialSpaceTypeList(society.enabledCommercialSpaceTypes);

  if (configuredTypes.length > 0) {
    return configuredTypes;
  }

  if (!getEnabledStructures(society).includes('commercial')) {
    return [];
  }

  return commercialSpaceTypes.includes(society.commercialSpaceType as CommercialSpaceType)
    ? [society.commercialSpaceType as CommercialSpaceType]
    : [];
}

export function societySupportsOfficeSpaces(society: StructureDescriptor) {
  return getEnabledCommercialSpaceTypes(society).includes('office');
}

export function getSocietyStructureLabel(society: StructureDescriptor) {
  const enabledStructures = getEnabledStructures(society);
  const enabledCommercialTypes = getEnabledCommercialSpaceTypes(society);

  if (enabledStructures.length > 1) {
    return 'Mixed-use';
  }

  if (enabledStructures[0] === 'commercial') {
    if (enabledCommercialTypes.length > 1) {
      return 'Commercial mixed-use';
    }

    return enabledCommercialTypes[0] === 'office' ? 'Commercial office' : 'Commercial shed';
  }

  if (enabledStructures[0] === 'bungalow') {
    return 'Bungalow';
  }

  return 'Apartment';
}

export function getSocietyWorkspaceLabel(society: StructureDescriptor) {
  const enabledStructures = getEnabledStructures(society);
  const enabledCommercialTypes = getEnabledCommercialSpaceTypes(society);

  if (enabledStructures.length > 1) {
    return 'Mixed-use society';
  }

  if (enabledStructures[0] === 'commercial') {
    if (enabledCommercialTypes.length > 1) {
      return 'Commercial mixed-use society';
    }

    return enabledCommercialTypes[0] === 'office'
      ? 'Commercial office society'
      : 'Commercial shed society';
  }

  return enabledStructures[0] === 'bungalow' ? 'Bungalow society' : 'Apartment society';
}

export function getSocietyUnitCollectionLabel(society: StructureDescriptor) {
  const enabledStructures = getEnabledStructures(society);
  const enabledCommercialTypes = getEnabledCommercialSpaceTypes(society);

  if (enabledStructures.length > 1) {
    return 'units and spaces';
  }

  if (enabledStructures[0] === 'commercial') {
    return enabledCommercialTypes[0] === 'office' ? 'spaces' : 'sheds';
  }

  return enabledStructures[0] === 'bungalow' ? 'plots' : 'homes';
}

export function getSocietyStructurePreviewLabel(society: StructureDescriptor) {
  const enabledStructures = getEnabledStructures(society);
  const enabledCommercialTypes = getEnabledCommercialSpaceTypes(society);

  if (enabledStructures.length > 1) {
    return 'Mixed structure enabled';
  }

  if (enabledStructures[0] === 'commercial') {
    if (enabledCommercialTypes.length > 1) {
      return 'Office and shed registry enabled';
    }

    return enabledCommercialTypes[0] === 'office' ? 'Office floors enabled' : 'Shed registry enabled';
  }

  return enabledStructures[0] === 'apartment' ? 'Tower hierarchy enabled' : 'Plot hierarchy enabled';
}

export function deriveProfiles(roles: MembershipRole[]): RoleProfile[] {
  const profiles: RoleProfile[] = [];

  if (roles.some(isResidentRole)) {
    profiles.push('resident');
  }

  if (roles.some(isAdminRole)) {
    profiles.push('admin');
  }

  return profiles;
}

export function getCurrentUser(data: SeedData, userId?: string) {
  return data.users.find((user) => user.id === userId);
}

export function getSelectedSociety(data: SeedData, societyId?: string) {
  return data.societies.find((society) => society.id === societyId);
}

export function getMembershipForSociety(data: SeedData, userId: string, societyId: string) {
  return data.memberships.find(
    (membership) => membership.userId === userId && membership.societyId === societyId,
  );
}

export function getSocietyOptions(data: SeedData, userId: string) {
  return data.memberships
    .filter((membership) => membership.userId === userId)
    .map((membership) => {
      const society = data.societies.find((item) => item.id === membership.societyId);
      if (!society) {
        return undefined;
      }

      const userUnitIds = new Set(membership.unitIds);
      const totalDue = data.invoices
        .filter(
          (invoice) =>
            invoice.societyId === society.id &&
            userUnitIds.has(invoice.unitId) &&
            invoice.status !== 'paid',
        )
        .reduce((sum, invoice) => sum + invoice.amountInr, 0);
      const unreadAnnouncements = data.announcements.filter(
        (announcement) =>
          announcement.societyId === society.id &&
          doesAnnouncementReachRoles(announcement.audience, membership.roles) &&
          !announcement.readByUserIds.includes(userId),
      ).length;
      const openComplaints = data.complaints.filter(
        (complaint) =>
          complaint.societyId === society.id &&
          complaint.createdByUserId === userId &&
          complaint.status !== 'resolved',
      ).length;

      return {
        society,
        membership,
        totalDue,
        unreadAnnouncements,
        openComplaints,
      };
    })
    .filter(Boolean) as Array<{
    society: SocietyWorkspace;
    membership: Membership;
    totalDue: number;
    unreadAnnouncements: number;
    openComplaints: number;
  }>;
}

export function getResidentOverview(data: SeedData, userId: string, societyId: string) {
  const membership = getMembershipForSociety(data, userId, societyId);
  const unitIds = new Set(membership?.unitIds ?? []);
  const outstandingInvoices = data.invoices.filter(
    (invoice) =>
      invoice.societyId === societyId && unitIds.has(invoice.unitId) && invoice.status !== 'paid',
  );
  const myBookings = data.bookings.filter(
    (booking) => booking.societyId === societyId && booking.userId === userId,
  );
  const myComplaints = data.complaints.filter(
    (complaint) => complaint.societyId === societyId && complaint.createdByUserId === userId,
  );
  const unreadAnnouncements = data.announcements.filter(
    (announcement) =>
      announcement.societyId === societyId &&
      doesAnnouncementReachRoles(announcement.audience, membership?.roles ?? []) &&
      !announcement.readByUserIds.includes(userId),
  );
  const myStaffAssignments = data.staffAssignments.filter((assignment) => unitIds.has(assignment.unitId));
  const myPendingPayments = data.payments.filter((payment) => {
    const invoice = data.invoices.find((invoiceRecord) => invoiceRecord.id === payment.invoiceId);
    return (
      payment.societyId === societyId &&
      payment.status === 'pending' &&
      (payment.submittedByUserId === userId || (invoice ? unitIds.has(invoice.unitId) : false))
    );
  });
  const myPaymentReminders = data.paymentReminders.filter((reminder) =>
    reminder.societyId === societyId && reminder.unitIds.some((unitId) => unitIds.has(unitId)),
  );

  return {
    totalDue: outstandingInvoices.reduce((sum, invoice) => sum + invoice.amountInr, 0),
    outstandingInvoices,
    myBookings,
    myComplaints,
    unreadAnnouncements,
    myStaffAssignments,
    myPendingPayments,
    myPaymentReminders,
  };
}

export function getAdminOverview(data: SeedData, societyId: string) {
  const invoices = data.invoices.filter((invoice) => invoice.societyId === societyId);
  const totalBilled = invoices.reduce((sum, invoice) => sum + invoice.amountInr, 0);
  const totalCollected = invoices
    .filter((invoice) => invoice.status === 'paid')
    .reduce((sum, invoice) => sum + invoice.amountInr, 0);
  const pendingApprovals =
    data.bookings.filter((booking) => booking.societyId === societyId && booking.status === 'pending')
      .length +
    data.payments.filter((payment) => payment.societyId === societyId && payment.status === 'pending')
      .length +
    data.staffProfiles.filter(
      (staff) => staff.societyId === societyId && staff.verificationState === 'pending',
    ).length +
    data.joinRequests.filter(
      (joinRequest) => joinRequest.societyId === societyId && joinRequest.status === 'pending',
    ).length;

  return {
    collectionRate: totalBilled === 0 ? 100 : Math.round((totalCollected / totalBilled) * 100),
    overdueInvoices: invoices.filter((invoice) => invoice.status === 'overdue').length,
    pendingApprovals,
    openComplaints: data.complaints.filter(
      (complaint) => complaint.societyId === societyId && complaint.status !== 'resolved',
    ).length,
    activeGuards: data.securityGuards.filter((guard) => guard.societyId === societyId).length,
  };
}

export function getAdminRecommendations(data: SeedData, societyId: string) {
  const overview = getAdminOverview(data, societyId);
  const units = getUnitsForSociety(data, societyId);
  const occupiedUnitIds = new Set(
    data.occupancy
      .filter((occupancy) => occupancy.societyId === societyId)
      .map((occupancy) => occupancy.unitId),
  );
  const vacantUnitCount = Math.max(units.length - occupiedUnitIds.size, 0);
  const pendingJoinRequests = data.joinRequests.filter(
    (joinRequest) => joinRequest.societyId === societyId && joinRequest.status === 'pending',
  );
  const invoices = getInvoicesForSociety(data, societyId);
  const overdueInvoices = invoices.filter((invoice) => invoice.status === 'overdue');
  const pendingInvoices = invoices.filter((invoice) => invoice.status === 'pending');
  const pendingPaymentFlags = getPaymentsForSociety(data, societyId).filter((payment) => payment.status === 'pending');
  const amenities = getAmenitiesForSociety(data, societyId);
  const bookings = data.bookings.filter((booking) => booking.societyId === societyId);
  const pendingBookings = bookings.filter((booking) => booking.status === 'pending');
  const waitlistedBookings = bookings.filter((booking) => booking.status === 'waitlisted');
  const openComplaints = data.complaints.filter(
    (complaint) => complaint.societyId === societyId && complaint.status !== 'resolved',
  );
  const staff = getStaffForSociety(data, societyId);
  const pendingStaff = staff.filter((member) => member.verificationState === 'pending');
  const securityComplaints = data.complaints.filter(
    (complaint) =>
      complaint.societyId === societyId &&
      complaint.status !== 'resolved' &&
      complaint.category === 'security',
  );
  const guards = data.securityGuards.filter((guard) => guard.societyId === societyId);
  const entries = data.entryLogs.filter((entry) => entry.societyId === societyId);
  const announcements = getAnnouncementsForSociety(data, societyId);
  const latestAnnouncementAgeDays = announcements[0]
    ? getAgeInDays(announcements[0].createdAt)
    : Number.POSITIVE_INFINITY;
  const recentAuditEvents = getAuditEvents(data, societyId).filter(
    (event) => getAgeInDays(event.createdAt) <= 14,
  ).length;

  const recommendations: AdminRecommendation[] = [
    pendingJoinRequests.length > 0
      ? {
          tab: 'residents',
          title: 'Review access claims',
          summary:
            'Ownership, tenancy, or committee requests are waiting. Clear them here before any unit or space is linked.',
          metric: `${pluralize(pendingJoinRequests.length, 'claim')} waiting`,
          tone: 'warning',
          actionLabel: 'Open residents',
          priority: 140 + pendingJoinRequests.length * 12,
        }
      : vacantUnitCount > 0
        ? {
            tab: 'residents',
            title: 'Tidy occupancy mapping',
            summary:
              'Some units or spaces are still not linked to residents. Keeping the directory clean makes joins and billing easier.',
            metric: `${pluralize(vacantUnitCount, 'unit')} open`,
            tone: 'primary',
            actionLabel: 'Review occupancy',
            priority: 58 + Math.min(vacantUnitCount, 24),
          }
        : {
            tab: 'residents',
            title: 'Keep the resident directory sharp',
            summary:
              'Occupancy looks steady. Use this module to keep member roles and linked units accurate as ownership changes.',
            metric: `${pluralize(units.length, 'unit')} mapped`,
            tone: 'success',
            actionLabel: 'Open residents',
            priority: 18,
          },
    pendingPaymentFlags.length > 0
      ? {
          tab: 'collections',
          title: 'Review resident payment flags',
          summary:
            'Residents have submitted maintenance payments for review. Confirm them quickly so the collection ledger stays current.',
          metric: `${pluralize(pendingPaymentFlags.length, 'payment flag')} pending`,
          tone: 'accent',
          actionLabel: 'Open collections',
          priority: 134 + pendingPaymentFlags.length * 15 + overdueInvoices.length * 6,
        }
      : overdueInvoices.length > 0
      ? {
          tab: 'collections',
          title: 'Follow up collections',
          summary:
            'Billing pressure is visible in this society. Tackle overdue maintenance and close the current cycle before the gap widens.',
          metric: `${pluralize(overdueInvoices.length, 'overdue invoice')}`,
          tone: 'accent',
          actionLabel: 'Open collections',
          priority: 128 + overdueInvoices.length * 14 + pendingInvoices.length * 5,
        }
      : pendingInvoices.length > 0 || overview.collectionRate < 100
        ? {
            tab: 'collections',
            title: 'Finish the maintenance cycle',
            summary:
              'Some invoices are still awaiting payment. This is the right place to reconcile receipts before they become overdue.',
            metric: `${overview.collectionRate}% collected`,
            tone: 'warning',
            actionLabel: 'Open collections',
            priority: 82 + pendingInvoices.length * 10 + (100 - overview.collectionRate),
          }
        : {
            tab: 'collections',
            title: 'Keep billing audit-ready',
            summary:
              'Collections look healthy right now. Use collections to keep receipts, periods, and reconciliation ready for the next run.',
            metric: `${overview.collectionRate}% collected`,
            tone: 'success',
            actionLabel: 'Open collections',
            priority: 20,
          },
    pendingBookings.length > 0 || waitlistedBookings.length > 0
      ? {
          tab: 'amenities',
          title: 'Clear booking decisions',
          summary:
            'Residents are waiting on amenity approvals. Approve or rebalance requests before the preferred slots expire.',
          metric: `${pluralize(
            pendingBookings.length + waitlistedBookings.length,
            'booking',
          )} active`,
          tone: 'primary',
          actionLabel: 'Open amenities',
          priority: 96 + pendingBookings.length * 10 + waitlistedBookings.length * 12,
        }
      : amenities.length > 0
        ? {
            tab: 'amenities',
            title: 'Review amenity operations',
            summary:
              'Your amenity catalog is live. Use this module to keep approval rules, pricing, and slot expectations aligned.',
            metric: `${pluralize(amenities.length, 'amenity')} live`,
            tone: 'success',
            actionLabel: 'Open amenities',
            priority: 22,
          }
        : {
            tab: 'amenities',
            title: 'Keep amenities ready for scale',
            summary:
              'No bookings need action right now, but this module is where amenity operations stay predictable as demand grows.',
            metric: 'No pending bookings',
            tone: 'primary',
            actionLabel: 'Open amenities',
            priority: 9,
          },
    openComplaints.length > 0
      ? {
          tab: 'helpdesk',
          title: 'Clear resident tickets',
          summary:
            'Residents have active helpdesk tickets. Update ownership, move work in progress forward, and close the loop visibly.',
          metric: `${pluralize(openComplaints.length, 'ticket')} open`,
          tone: 'warning',
          actionLabel: 'Open helpdesk',
          priority: 90 + openComplaints.length * 12,
        }
      : {
          tab: 'helpdesk',
          title: 'Keep helpdesk responsive',
          summary:
            'The complaint queue is clear right now. Use helpdesk to keep issue status, assignment, and resolution history visible as requests come in.',
          metric: 'No open tickets',
          tone: 'success',
          actionLabel: 'Open helpdesk',
          priority: 11,
        },
    pendingStaff.length > 0
      ? {
          tab: 'security',
          title: 'Verify staff access',
          summary:
            'Domestic staff verification is still pending. Clear KYC before entry permissions become a trust issue.',
          metric: `${pluralize(pendingStaff.length, 'staff profile')} pending`,
          tone: 'warning',
          actionLabel: 'Open security',
          priority: 88 + pendingStaff.length * 14,
        }
      : securityComplaints.length > 0
        ? {
            tab: 'security',
            title: 'Investigate security incidents',
            summary:
              'A live security complaint is open. Review guard coverage and entry activity before the issue becomes repeatable.',
            metric: `${pluralize(securityComplaints.length, 'security issue')} open`,
            tone: 'accent',
            actionLabel: 'Open security',
            priority: 84 + securityComplaints.length * 15,
          }
        : guards.length > 0 || staff.length > 0 || entries.length > 0
          ? {
              tab: 'security',
              title: 'Keep gate operations under watch',
              summary:
                'Roster and entry activity already exist here. Use this module to keep staff, guards, and gate visibility disciplined.',
              metric: `${pluralize(guards.length, 'guard')} on roster`,
              tone: 'success',
              actionLabel: 'Open security',
              priority: 17,
            }
          : {
              tab: 'security',
              title: 'Set the security baseline',
              summary:
                'Even a low-footfall society benefits from verified staff and a clear gate record before exceptions start piling up.',
              metric: 'Security not configured',
              tone: 'primary',
              actionLabel: 'Open security',
              priority: 10,
            },
    announcements.length === 0
      ? {
          tab: 'announcements',
          title: 'Publish a first resident update',
          summary:
            'New workspaces need a communication rhythm early. A baseline notice reduces repeated questions and ad-hoc calls.',
          metric: 'No announcements yet',
          tone: 'accent',
          actionLabel: 'Open announcements',
          priority: 74,
        }
      : latestAnnouncementAgeDays > 10
        ? {
            tab: 'announcements',
            title: 'Refresh resident communication',
            summary:
              'The notice board has gone quiet. A quick update on operations or rules usually reduces support overhead.',
            metric: `${pluralize(latestAnnouncementAgeDays, 'day')} since last update`,
            tone: 'warning',
            actionLabel: 'Open announcements',
            priority: 52,
          }
        : {
            tab: 'announcements',
            title: 'Keep communication proactive',
            summary:
              'Communication is active. Use announcements to steer maintenance updates, meeting notices, and policy reminders.',
            metric: `${pluralize(announcements.length, 'notice')} published`,
            tone: 'success',
            actionLabel: 'Open announcements',
            priority: 16,
          },
    overview.pendingApprovals > 0 || overview.overdueInvoices > 0 || overview.openComplaints > 0
      ? {
          tab: 'audit',
          title: 'Review the operational trail',
          summary:
            'Approvals, dues, and complaints all benefit from a visible paper trail. Audit is the quickest way to confirm who changed what.',
          metric: `${pluralize(recentAuditEvents, 'recent event')} logged`,
          tone: 'primary',
          actionLabel: 'Open audit',
          priority:
            40 +
            overview.pendingApprovals * 6 +
            overview.overdueInvoices * 8 +
            overview.openComplaints * 6,
        }
      : recentAuditEvents === 0
        ? {
            tab: 'audit',
            title: 'Wake up the audit trail',
            summary:
              'A quiet audit history usually means admins are working without enough traceability. Confirm that actions leave a record.',
            metric: 'No recent events',
            tone: 'warning',
            actionLabel: 'Open audit',
            priority: 28,
          }
        : {
            tab: 'audit',
            title: 'Keep the trail verifiable',
            summary:
              'Use audit as the last stop after approvals, notices, and money movement so the workspace stays high-trust.',
            metric: `${pluralize(recentAuditEvents, 'recent event')} logged`,
            tone: 'success',
            actionLabel: 'Open audit',
            priority: 14,
          },
  ];

  return recommendations.sort((left, right) => right.priority - left.priority).slice(0, 4);
}

function buildJoinRequestView(data: SeedData, joinRequest: JoinRequest) {
  const society = getSelectedSociety(data, joinRequest.societyId);
  const user = getCurrentUser(data, joinRequest.userId);
  const units = joinRequest.unitIds
    .map((unitId) => data.units.find((unit) => unit.id === unitId))
    .filter(Boolean);
  const residenceProfile = getResidenceProfileForUserSociety(
    data,
    joinRequest.userId,
    joinRequest.societyId,
  );
  const reviewer = joinRequest.reviewedByUserId
    ? getCurrentUser(data, joinRequest.reviewedByUserId)
    : undefined;

  return {
    joinRequest,
    society,
    user,
    reviewer,
    residenceProfile,
    units,
  };
}

export function getResidenceProfileForUserSociety(
  data: SeedData,
  userId: string,
  societyId: string,
): ResidenceProfile | undefined {
  const residenceProfiles = Array.isArray(data.residenceProfiles) ? data.residenceProfiles : [];

  return residenceProfiles.find(
    (profile) => profile.userId === userId && profile.societyId === societyId,
  );
}

export function getJoinRequestsForSociety(
  data: SeedData,
  societyId: string,
  status?: JoinRequest['status'],
) {
  return data.joinRequests
    .filter((joinRequest) => joinRequest.societyId === societyId)
    .filter((joinRequest) => (status ? joinRequest.status === status : true))
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
    .map((joinRequest) => buildJoinRequestView(data, joinRequest));
}

export function getPendingJoinRequestsForUser(data: SeedData, userId: string) {
  return data.joinRequests
    .filter((joinRequest) => joinRequest.userId === userId && joinRequest.status === 'pending')
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
    .map((joinRequest) => buildJoinRequestView(data, joinRequest));
}

export function getAnnouncementsForSociety(
  data: SeedData,
  societyId: string,
  roles?: MembershipRole[],
) {
  return [...data.announcements]
    .filter((announcement) => announcement.societyId === societyId)
    .filter((announcement) => doesAnnouncementReachRoles(announcement.audience, roles))
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
}

export function getRulesForSociety(data: SeedData, societyId: string) {
  return [...data.rules]
    .filter((rule) => rule.societyId === societyId)
    .sort((left, right) => Date.parse(right.publishedAt) - Date.parse(left.publishedAt));
}

export function getAmenitiesForSociety(data: SeedData, societyId: string) {
  return data.amenities.filter((amenity) => amenity.societyId === societyId);
}

export function getBookingsForUserSociety(data: SeedData, userId: string, societyId: string) {
  return [...data.bookings]
    .filter((booking) => booking.societyId === societyId && booking.userId === userId)
    .sort(
      (left, right) =>
        Date.parse(`${left.date}T${left.startTime}:00`) - Date.parse(`${right.date}T${right.startTime}:00`),
    );
}

export function getComplaintsForUserSociety(data: SeedData, userId: string, societyId: string) {
  return [...data.complaints]
    .filter((complaint) => complaint.societyId === societyId && complaint.createdByUserId === userId)
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
}

export function getComplaintUpdatesForComplaint(data: SeedData, complaintId: string) {
  return [...(Array.isArray(data.complaintUpdates) ? data.complaintUpdates : [])]
    .filter((update) => update.complaintId === complaintId)
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
    .map((update) => ({
      update,
      user: getCurrentUser(data, update.createdByUserId),
    }));
}

export function getBookingsForSociety(data: SeedData, societyId: string) {
  return [...data.bookings]
    .filter((booking) => booking.societyId === societyId)
    .sort(
      (left, right) =>
        Date.parse(`${left.date}T${left.startTime}:00`) - Date.parse(`${right.date}T${right.startTime}:00`),
    )
    .map((booking) => ({
      booking,
      amenity: data.amenities.find((amenity) => amenity.id === booking.amenityId),
      unit: booking.unitId ? data.units.find((unit) => unit.id === booking.unitId) : undefined,
      user: getCurrentUser(data, booking.userId),
    }));
}

export function getComplaintsForSociety(data: SeedData, societyId: string) {
  return [...data.complaints]
    .filter((complaint) => complaint.societyId === societyId)
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
    .map((complaint) => ({
      complaint,
      unit: data.units.find((unit) => unit.id === complaint.unitId),
      user: getCurrentUser(data, complaint.createdByUserId),
    }));
}

export function getUnitsForSociety(data: SeedData, societyId: string) {
  return data.units.filter((unit) => unit.societyId === societyId);
}

export function getInvoicesForSociety(data: SeedData, societyId: string) {
  return [...data.invoices]
    .filter((invoice) => invoice.societyId === societyId)
    .sort((left, right) => Date.parse(left.dueDate) - Date.parse(right.dueDate));
}

export function getPaymentsForSociety(data: SeedData, societyId: string) {
  return [...data.payments]
    .filter((payment) => payment.societyId === societyId)
    .sort((left, right) => Date.parse(right.paidAt) - Date.parse(left.paidAt));
}

export function getPaymentsForUserSociety(data: SeedData, userId: string, societyId: string) {
  const membership = getMembershipForSociety(data, userId, societyId);
  const unitIds = new Set(membership?.unitIds ?? []);

  return getPaymentsForSociety(data, societyId)
    .map((payment) => {
      const invoice = data.invoices.find((invoiceRecord) => invoiceRecord.id === payment.invoiceId);

      if (!invoice) {
        return undefined;
      }

      if (payment.submittedByUserId !== userId && !unitIds.has(invoice.unitId)) {
        return undefined;
      }

      return {
        payment,
        invoice,
        unit: data.units.find((unit) => unit.id === invoice.unitId),
        receipt: data.receipts.find((receipt) => receipt.paymentId === payment.id),
        reviewedBy: payment.reviewedByUserId ? getCurrentUser(data, payment.reviewedByUserId) : undefined,
      };
    })
    .filter(Boolean) as Array<{
    payment: SeedData['payments'][number];
    invoice: SeedData['invoices'][number];
    unit?: SeedData['units'][number];
    receipt?: SeedData['receipts'][number];
    reviewedBy?: UserProfile;
  }>;
}

export function getPaymentRemindersForSociety(data: SeedData, societyId: string) {
  return [...data.paymentReminders]
    .filter((reminder) => reminder.societyId === societyId)
    .sort((left, right) => Date.parse(right.sentAt) - Date.parse(left.sentAt))
    .map((reminder) => ({
      reminder,
      invoices: reminder.invoiceIds
        .map((invoiceId) => data.invoices.find((invoice) => invoice.id === invoiceId))
        .filter(Boolean) as SeedData['invoices'],
      units: reminder.unitIds
        .map((unitId) => data.units.find((unit) => unit.id === unitId))
        .filter(Boolean) as SeedData['units'],
      sentBy: getCurrentUser(data, reminder.sentByUserId),
    }));
}

export function getPaymentRemindersForUser(data: SeedData, userId: string, societyId: string) {
  const membership = getMembershipForSociety(data, userId, societyId);
  const unitIds = new Set(membership?.unitIds ?? []);

  return getPaymentRemindersForSociety(data, societyId).filter(({ reminder }) =>
    reminder.unitIds.some((unitId) => unitIds.has(unitId)),
  );
}

export function getInvoiceCollectionDirectory(data: SeedData, societyId: string) {
  const payments = getPaymentsForSociety(data, societyId);
  const reminders = getPaymentRemindersForSociety(data, societyId);

  return getInvoicesForSociety(data, societyId).map((invoice) => {
    const unit = data.units.find((unitRecord) => unitRecord.id === invoice.unitId);
    const unitResidents = data.occupancy
      .filter((occupancy) => occupancy.societyId === societyId && occupancy.unitId === invoice.unitId)
      .map((occupancy) => getCurrentUser(data, occupancy.userId))
      .filter(Boolean) as UserProfile[];
    const invoicePayments = payments.filter((payment) => payment.invoiceId === invoice.id);
    const latestPayment = invoicePayments[0];
    const relevantReminders = reminders.filter(({ reminder }) => reminder.invoiceIds.includes(invoice.id));

    return {
      invoice,
      unit,
      residents: unitResidents,
      payments: invoicePayments,
      latestPayment,
      reminders: relevantReminders,
      latestReminder: relevantReminders[0],
    };
  });
}

export function getExpenseRecordsForSociety(data: SeedData, societyId: string) {
  return [...data.expenseRecords]
    .filter((expense) => expense.societyId === societyId)
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
}

export function getStaffForSociety(data: SeedData, societyId: string) {
  return data.staffProfiles.filter((staff) => staff.societyId === societyId);
}

export function getStaffForUser(data: SeedData, userId: string, societyId: string) {
  const membership = getMembershipForSociety(data, userId, societyId);
  const unitIds = new Set(membership?.unitIds ?? []);

  return data.staffProfiles.filter(
    (staff) =>
      staff.requestedByUserId === userId || staff.employerUnitIds.some((unitId) => unitIds.has(unitId)),
  );
}

export function getResidentsDirectory(data: SeedData, societyId: string) {
  return getUnitsForSociety(data, societyId).map((unit) => {
    const unitOccupancy = data.occupancy
      .filter((occupancy) => occupancy.unitId === unit.id)
      .sort((left, right) => Date.parse(right.startDate) - Date.parse(left.startDate));
    const building = unit.buildingId
      ? data.buildings.find((item) => item.id === unit.buildingId)
      : undefined;
    const unitInvoices = data.invoices.filter((invoice) => invoice.unitId === unit.id);
    const unitPaymentMap = new Map(
      data.payments
        .filter(
          (payment) =>
            payment.status === 'captured' &&
            unitInvoices.some((invoice) => invoice.id === payment.invoiceId),
        )
        .sort((left, right) => Date.parse(right.paidAt) - Date.parse(left.paidAt))
        .map((payment) => [payment.invoiceId, payment] as const),
    );
    const residents = unitOccupancy
      .map((occupancy) => {
        const user = data.users.find((item) => item.id === occupancy.userId);
        const membership = data.memberships.find(
          (item) =>
            item.userId === occupancy.userId &&
            item.societyId === societyId &&
            item.unitIds.includes(unit.id),
        );

        if (!user) {
          return undefined;
        }

        return {
          user,
          category: occupancy.category,
          roles: membership?.roles ?? [],
          startDate: occupancy.startDate,
          endDate: occupancy.endDate,
        };
      })
      .filter(Boolean) as Array<{
      user: UserProfile;
      category: string;
      roles: MembershipRole[];
      startDate: string;
      endDate?: string;
    }>;

    const outstandingAmount = unitInvoices
      .filter((invoice) => invoice.status !== 'paid')
      .reduce((sum, invoice) => sum + invoice.amountInr, 0);
    const unpaidInvoices = unitInvoices.filter((invoice) => invoice.status !== 'paid');
    const latestPayment = unitInvoices
      .map((invoice) => unitPaymentMap.get(invoice.id))
      .filter((payment): payment is NonNullable<typeof payment> => Boolean(payment))
      .sort((left, right) => Date.parse(right.paidAt) - Date.parse(left.paidAt))[0];
    const unitStaffRecords = getStaffVerificationDirectory(data, societyId).filter(({ employerUnits }) =>
      employerUnits.some((employerUnit) => employerUnit.id === unit.id),
    );

    return {
      unit,
      building,
      residents,
      outstandingAmount,
      unpaidInvoices,
      latestPayment,
      unitStaffRecords,
    };
  });
}

export function getCommunityMembersForSociety(data: SeedData, societyId: string) {
  return data.memberships
    .filter((membership) => membership.societyId === societyId)
    .map((membership) => {
      const user = getCurrentUser(data, membership.userId);

      if (!user) {
        return undefined;
      }

      const units = membership.unitIds
        .map((unitId) => data.units.find((unit) => unit.id === unitId))
        .filter((unit): unit is SeedData['units'][number] => Boolean(unit));
      const residenceProfile = data.residenceProfiles.find(
        (profile) => profile.userId === membership.userId && profile.societyId === societyId,
      );

      return {
        membership,
        user,
        units,
        residenceProfile,
      };
    })
    .filter(Boolean)
    .sort((left, right) => {
      const leftMember = left as NonNullable<typeof left>;
      const rightMember = right as NonNullable<typeof right>;
      const leftUnitCode = leftMember.units[0]?.code ?? 'ZZZ';
      const rightUnitCode = rightMember.units[0]?.code ?? 'ZZZ';

      if (leftUnitCode !== rightUnitCode) {
        return leftUnitCode.localeCompare(rightUnitCode);
      }

      return leftMember.user.name.localeCompare(rightMember.user.name);
    }) as Array<{
    membership: Membership;
    user: UserProfile;
    units: SeedData['units'];
    residenceProfile?: ResidenceProfile;
  }>;
}

export function getVehicleDirectoryForSociety(data: SeedData, societyId: string) {
  return [...(Array.isArray(data.vehicleRegistrations) ? data.vehicleRegistrations : [])]
    .filter((vehicle) => vehicle.societyId === societyId)
    .map((vehicle) => ({
      vehicle,
      user: getCurrentUser(data, vehicle.userId),
      unit: data.units.find((unit) => unit.id === vehicle.unitId),
    }))
    .sort((left, right) => left.vehicle.registrationNumber.localeCompare(right.vehicle.registrationNumber));
}

export function getImportantContactsForSociety(data: SeedData, societyId: string) {
  const categoryOrder = {
    management: 1,
    security: 2,
    maintenance: 3,
    amenity: 4,
    emergency: 5,
  } as const;

  return [...(Array.isArray(data.importantContacts) ? data.importantContacts : [])]
    .filter((contact) => contact.societyId === societyId)
    .sort((left, right) => {
      const leftRank = categoryOrder[left.category] ?? 99;
      const rightRank = categoryOrder[right.category] ?? 99;

      if (leftRank !== rightRank) {
        return leftRank - rightRank;
      }

      return left.name.localeCompare(right.name);
    });
}

export function getGuardRosterForSociety(data: SeedData, societyId: string) {
  return data.securityGuards
    .filter((guard) => guard.societyId === societyId)
    .map((guard) => ({
      guard,
      latestShift: [...data.securityShifts]
        .filter((shift) => shift.guardId === guard.id)
        .sort((left, right) => Date.parse(right.start) - Date.parse(left.start))[0],
    }));
}

export function getStaffVerificationDirectory(data: SeedData, societyId: string) {
  return getStaffForSociety(data, societyId).map((staff) => {
    const assignments = data.staffAssignments.filter((assignment) => assignment.staffId === staff.id);
    const employerUnits = staff.employerUnitIds
      .map((unitId) => data.units.find((unit) => unit.id === unitId))
      .filter((unit): unit is SeedData['units'][number] => Boolean(unit));
    const requestedBy = staff.requestedByUserId
      ? getCurrentUser(data, staff.requestedByUserId)
      : undefined;
    const reviewedBy = staff.reviewedByUserId
      ? getCurrentUser(data, staff.reviewedByUserId)
      : undefined;

    return {
      staff,
      assignments,
      employerUnits,
      requestedBy,
      reviewedBy,
    };
  });
}

export function getEntryLogsForSociety(data: SeedData, societyId: string) {
  return [...data.entryLogs]
    .filter((entry) => entry.societyId === societyId)
    .sort((left, right) => Date.parse(right.enteredAt) - Date.parse(left.enteredAt))
    .map((entry) => ({
      entry,
      unit: entry.unitId ? data.units.find((unit) => unit.id === entry.unitId) : undefined,
    }));
}

export function getAuditEvents(data: SeedData, societyId: string) {
  const announcementEvents = data.announcements
    .filter((announcement) => announcement.societyId === societyId)
    .map((announcement) => ({
      id: `${announcement.id}-audit`,
      title: `Announcement published: ${announcement.title}`,
      subtitle: `Audience: ${announcement.audience}`,
      createdAt: announcement.createdAt,
    }));

  const paymentEvents = data.payments
    .filter((payment) => payment.societyId === societyId)
    .map((payment) => ({
      id: `${payment.id}-audit`,
      title:
        payment.status === 'captured'
          ? `Payment captured: ${formatCurrency(payment.amountInr)}`
          : payment.status === 'pending'
            ? `Payment submitted: ${formatCurrency(payment.amountInr)}`
            : `Payment rejected: ${formatCurrency(payment.amountInr)}`,
      subtitle: `Method: ${payment.method}`,
      createdAt: payment.reviewedAt ?? payment.paidAt,
    }));

  const reminderEvents = data.paymentReminders
    .filter((reminder) => reminder.societyId === societyId)
    .map((reminder) => ({
      id: `${reminder.id}-audit`,
      title: 'Maintenance reminder sent',
      subtitle: reminder.message,
      createdAt: reminder.sentAt,
    }));

  const complaintEvents = data.complaints
    .filter((complaint) => complaint.societyId === societyId)
    .map((complaint) => ({
      id: `${complaint.id}-audit`,
      title: `Ticket updated: ${complaint.title}`,
      subtitle: `Status: ${humanizeComplaintStatus(complaint)}`,
      createdAt: complaint.createdAt,
    }));

  const expenseEvents = data.expenseRecords
    .filter((expense) => expense.societyId === societyId)
    .map((expense) => ({
      id: `${expense.id}-audit`,
      title: `Expense recorded: ${expense.title}`,
      subtitle: `Type: ${expense.expenseType} · ${formatCurrency(expense.amountInr)}`,
      createdAt: expense.createdAt,
    }));

  const securityEvents = data.entryLogs
    .filter((entry) => entry.societyId === societyId)
    .map((entry) => ({
      id: `${entry.id}-audit`,
      title: `Entry log recorded: ${entry.subjectName}`,
      subtitle: `Type: ${entry.subjectType} · Status: ${entry.status}`,
      createdAt: entry.enteredAt,
    }));

  return [...announcementEvents, ...paymentEvents, ...reminderEvents, ...complaintEvents, ...expenseEvents, ...securityEvents].sort(
    (left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt),
  );
}

function humanizeComplaintStatus(complaint: ComplaintTicket) {
  switch (complaint.status) {
    case 'inProgress':
      return 'In progress';
    default:
      return complaint.status.charAt(0).toUpperCase() + complaint.status.slice(1);
  }
}

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function getAgeInDays(value: string) {
  const difference = Date.now() - Date.parse(value);

  if (Number.isNaN(difference)) {
    return 0;
  }

  return Math.max(0, Math.floor(difference / (1000 * 60 * 60 * 24)));
}
