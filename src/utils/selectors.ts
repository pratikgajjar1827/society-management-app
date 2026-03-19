import {
  ComplaintTicket,
  Membership,
  MembershipRole,
  RoleProfile,
  SeedData,
  SocietyWorkspace,
  UserProfile,
} from '../types/domain';

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
          announcement.societyId === society.id && !announcement.readByUserIds.includes(userId),
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
      announcement.societyId === societyId && !announcement.readByUserIds.includes(userId),
  );
  const myStaffAssignments = data.staffAssignments.filter((assignment) => unitIds.has(assignment.unitId));

  return {
    totalDue: outstandingInvoices.reduce((sum, invoice) => sum + invoice.amountInr, 0),
    outstandingInvoices,
    myBookings,
    myComplaints,
    unreadAnnouncements,
    myStaffAssignments,
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
    data.staffProfiles.filter(
      (staff) => staff.societyId === societyId && staff.verificationState === 'pending',
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

export function getAnnouncementsForSociety(data: SeedData, societyId: string) {
  return [...data.announcements]
    .filter((announcement) => announcement.societyId === societyId)
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
  return data.bookings.filter((booking) => booking.societyId === societyId && booking.userId === userId);
}

export function getComplaintsForUserSociety(data: SeedData, userId: string, societyId: string) {
  return data.complaints.filter(
    (complaint) => complaint.societyId === societyId && complaint.createdByUserId === userId,
  );
}

export function getUnitsForSociety(data: SeedData, societyId: string) {
  return data.units.filter((unit) => unit.societyId === societyId);
}

export function getInvoicesForSociety(data: SeedData, societyId: string) {
  return data.invoices.filter((invoice) => invoice.societyId === societyId);
}

export function getPaymentsForSociety(data: SeedData, societyId: string) {
  return data.payments.filter((payment) => payment.societyId === societyId);
}

export function getStaffForSociety(data: SeedData, societyId: string) {
  return data.staffProfiles.filter((staff) => staff.societyId === societyId);
}

export function getStaffForUser(data: SeedData, userId: string, societyId: string) {
  const membership = getMembershipForSociety(data, userId, societyId);
  const unitIds = new Set(membership?.unitIds ?? []);

  return data.staffProfiles.filter((staff) => staff.employerUnitIds.some((unitId) => unitIds.has(unitId)));
}

export function getResidentsDirectory(data: SeedData, societyId: string) {
  return getUnitsForSociety(data, societyId).map((unit) => {
    const unitOccupancy = data.occupancy.filter((occupancy) => occupancy.unitId === unit.id);
    const residents = unitOccupancy
      .map((occupancy) => {
        const user = data.users.find((item) => item.id === occupancy.userId);

        if (!user) {
          return undefined;
        }

        return {
          user,
          category: occupancy.category,
        };
      })
      .filter(Boolean) as Array<{ user: UserProfile; category: string }>;

    return {
      unit,
      residents,
    };
  });
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
      title: `Payment captured: ${formatCurrency(payment.amountInr)}`,
      subtitle: `Method: ${payment.method}`,
      createdAt: payment.paidAt,
    }));

  const complaintEvents = data.complaints
    .filter((complaint) => complaint.societyId === societyId)
    .map((complaint) => ({
      id: `${complaint.id}-audit`,
      title: `Ticket updated: ${complaint.title}`,
      subtitle: `Status: ${humanizeComplaintStatus(complaint)}`,
      createdAt: complaint.createdAt,
    }));

  return [...announcementEvents, ...paymentEvents, ...complaintEvents].sort(
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
