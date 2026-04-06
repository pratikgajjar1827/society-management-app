import { useEffect, useMemo, useState } from 'react';
import { BackHandler, Image, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import {
  ActionButton,
  Caption,
  ChoiceChip,
  DetailRow,
  InputField,
  MetricCard,
  NavigationStrip,
  PageFrame,
  Pill,
  SectionHeader,
  SurfaceCard,
} from '../../components/ui';
import { detectVehicleNumber as detectVehicleNumberRequest } from '../../api/client';
import { useApp } from '../../state/AppContext';
import { palette, radius, shadow, spacing } from '../../theme/tokens';
import { VisitorCategory } from '../../types/domain';
import { openPhoneDialer, openWhatsAppConversation } from '../../utils/communication';
import { captureGuestPhoto, captureVehiclePhoto, detectVehicleNumberFromDataUrl } from '../../utils/media';
import {
  deriveProfiles,
  formatLongDate,
  getCurrentUser,
  getSecurityGuestConversationForRequest,
  getGuardRosterForSociety,
  getSecurityGuestLogsForSociety,
  getSecurityGuestRequestTone,
  getSecurityGuestRequestsForSociety,
  getSecurityMembershipForSociety,
  getSecurityResidentsForSociety,
  getSelectedSociety,
  getUnitsForSociety,
  humanizeRole,
  humanizeSecurityGuestLogAction,
  humanizeSecurityGuestRequestStatus,
} from '../../utils/selectors';

type SecurityTab = 'desk' | 'queue' | 'logs';
type QueueFilter = 'all' | 'pendingApproval' | 'approved' | 'checkedIn' | 'closed';

const securityTabs: Array<{ key: SecurityTab; label: string }> = [
  { key: 'desk', label: 'Gate desk' },
  { key: 'queue', label: 'Approvals queue' },
  { key: 'logs', label: 'Security logs' },
];

const queueFilters: Array<{ key: QueueFilter; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'pendingApproval', label: 'Awaiting resident' },
  { key: 'approved', label: 'Approved' },
  { key: 'checkedIn', label: 'Inside' },
  { key: 'closed', label: 'Closed' },
];

const visitorCategories: Array<{ key: VisitorCategory; label: string }> = [
  { key: 'guest', label: 'Guest' },
  { key: 'family', label: 'Family' },
  { key: 'service', label: 'Service' },
  { key: 'delivery', label: 'Delivery' },
];

function formatGateTimestamp(value?: string) {
  if (!value) {
    return 'Not captured yet';
  }

  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function getGateRequestBlockingReason({
  selectedUnitId,
  selectedResidentUserId,
  guestName,
  guestPurpose,
  guestCount,
}: {
  selectedUnitId: string;
  selectedResidentUserId: string;
  guestName: string;
  guestPurpose: string;
  guestCount: string;
}) {
  if (!selectedUnitId) {
    return 'Select the resident unit first.';
  }

  if (!selectedResidentUserId) {
    return 'Select the resident who should receive the approval request.';
  }

  if (!guestName.trim()) {
    return 'Enter the guest name.';
  }

  if (!guestPurpose.trim()) {
    return 'Enter the visit purpose before sending.';
  }

  if (!guestCount.trim()) {
    return 'Enter the guest count.';
  }

  return '';
}

export function SecurityShell() {
  const { state, actions } = useApp();
  const [activeTab, setActiveTab] = useState<SecurityTab>('desk');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [queueFilter, setQueueFilter] = useState<QueueFilter>('all');
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [selectedResidentUserId, setSelectedResidentUserId] = useState('');
  const [guestCategory, setGuestCategory] = useState<VisitorCategory>('guest');
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestPurpose, setGuestPurpose] = useState('');
  const [guestCount, setGuestCount] = useState('1');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [gateNotes, setGateNotes] = useState('');
  const [guestPhotoDataUrl, setGuestPhotoDataUrl] = useState('');
  const [guestPhotoCapturedAt, setGuestPhotoCapturedAt] = useState('');
  const [guestPhotoMessage, setGuestPhotoMessage] = useState('');
  const [vehiclePhotoDataUrl, setVehiclePhotoDataUrl] = useState('');
  const [vehiclePhotoCapturedAt, setVehiclePhotoCapturedAt] = useState('');
  const [vehiclePhotoMessage, setVehiclePhotoMessage] = useState('');
  const [threadDrafts, setThreadDrafts] = useState<Record<string, string>>({});
  const { width } = useWindowDimensions();
  const isCompact = width < 768;
  const isPhone = width < 420;

  useEffect(() => {
    if (Platform.OS !== 'android') {
      return undefined;
    }

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isDrawerOpen) {
        setIsDrawerOpen(false);
        return true;
      }

      if (activeTab !== 'desk') {
        setActiveTab('desk');
        return true;
      }

      actions.goToRoleSelection();
      return true;
    });

    return () => subscription.remove();
  }, [actions, activeTab, isDrawerOpen]);

  const userId = state.session.userId;
  const societyId = state.session.selectedSocietyId;

  const user = userId ? getCurrentUser(state.data, userId) : undefined;
  const society = societyId ? getSelectedSociety(state.data, societyId) : undefined;
  const membership = userId && societyId ? getSecurityMembershipForSociety(state.data, userId, societyId) : undefined;

  const canUseAdmin = membership ? deriveProfiles(membership.roles).includes('admin') : false;
  const units = societyId ? getUnitsForSociety(state.data, societyId) : [];
  const residents = societyId ? getSecurityResidentsForSociety(state.data, societyId) : [];
  const guards = societyId ? getGuardRosterForSociety(state.data, societyId) : [];
  const requests = societyId ? getSecurityGuestRequestsForSociety(state.data, societyId) : [];
  const logs = societyId ? getSecurityGuestLogsForSociety(state.data, societyId) : [];
  const conversationsByRequestId = useMemo(
    () =>
      new Map(
        requests.map(({ request }) => [
          request.id,
          getSecurityGuestConversationForRequest(state.data, request.id),
        ]),
      ),
    [requests, state.data],
  );

  const unitResidents = useMemo(
    () => residents.filter(({ units: residentUnits }) => residentUnits.some((unit) => unit.id === selectedUnitId)),
    [residents, selectedUnitId],
  );
  const selectedUnit = units.find((unit) => unit.id === selectedUnitId);
  const selectedResidentEntry = unitResidents.find(({ user: resident }) => resident.id === selectedResidentUserId);
  const gateRequestBlockingReason = getGateRequestBlockingReason({
    selectedUnitId,
    selectedResidentUserId,
    guestName,
    guestPurpose,
    guestCount,
  });

  useEffect(() => {
    if (!selectedUnitId && units[0]?.id) {
      setSelectedUnitId(units[0].id);
    }
  }, [selectedUnitId, units]);

  useEffect(() => {
    if (!selectedResidentUserId && unitResidents[0]?.user.id) {
      setSelectedResidentUserId(unitResidents[0].user.id);
      return;
    }

    if (selectedResidentUserId && !unitResidents.some(({ user: resident }) => resident.id === selectedResidentUserId)) {
      setSelectedResidentUserId(unitResidents[0]?.user.id ?? '');
    }
  }, [selectedResidentUserId, unitResidents]);

  if (!user || !society || !membership) {
    return null;
  }

  const activeSocietyId = society.id;

  const pendingCount = requests.filter(({ request }) => request.status === 'pendingApproval').length;
  const approvedCount = requests.filter(({ request }) => request.status === 'approved').length;
  const checkedInCount = requests.filter(({ request }) => request.status === 'checkedIn').length;
  const todayLogCount = logs.filter(({ log }) => log.createdAt.slice(0, 10) === new Date().toISOString().slice(0, 10)).length;

  const filteredRequests = requests.filter(({ request }) => {
    switch (queueFilter) {
      case 'pendingApproval':
        return request.status === 'pendingApproval';
      case 'approved':
        return request.status === 'approved';
      case 'checkedIn':
        return request.status === 'checkedIn';
      case 'closed':
        return request.status === 'completed' || request.status === 'denied' || request.status === 'cancelled';
      case 'all':
      default:
        return true;
    }
  });

  async function handleCapturePhoto() {
    try {
      const photo = await captureGuestPhoto();

      if (!photo) {
        return;
      }

      setGuestPhotoDataUrl(photo.dataUrl);
      setGuestPhotoCapturedAt(photo.capturedAt);
      setGuestPhotoMessage(`Guest photo attached at ${formatGateTimestamp(photo.capturedAt)}.`);
    } catch (error) {
      setGuestPhotoMessage(error instanceof Error ? error.message : 'Could not capture the guest photo.');
    }
  }

  async function handleCaptureVehiclePhoto() {
    try {
      const photo = await captureVehiclePhoto();

      if (!photo) {
        return;
      }

      setVehiclePhotoDataUrl(photo.dataUrl);
      setVehiclePhotoCapturedAt(photo.capturedAt);
      setVehiclePhotoMessage(`Vehicle photo attached at ${formatGateTimestamp(photo.capturedAt)}. Reading vehicle number...`);

      let detectionMessage = '';
      let detectedVehicleNumber = '';

      if (state.session.sessionToken) {
        try {
          const detection = await detectVehicleNumberRequest(state.session.sessionToken, photo.dataUrl);
          detectionMessage = detection.message;
          detectedVehicleNumber = detection.vehicleNumber ?? '';
        } catch (error) {
          const fallbackDetection = await detectVehicleNumberFromDataUrl(photo.dataUrl);
          detectionMessage = fallbackDetection.message;
          detectedVehicleNumber = fallbackDetection.vehicleNumber ?? '';

          if (error instanceof Error) {
            detectionMessage = `${fallbackDetection.message} Backend OCR fallback triggered because: ${error.message}`;
          }
        }
      } else {
        const fallbackDetection = await detectVehicleNumberFromDataUrl(photo.dataUrl);
        detectionMessage = fallbackDetection.message;
        detectedVehicleNumber = fallbackDetection.vehicleNumber ?? '';
      }

      if (detectedVehicleNumber) {
        setVehicleNumber(detectedVehicleNumber);
      }

      setVehiclePhotoMessage(
        detectionMessage || `Vehicle photo attached at ${formatGateTimestamp(photo.capturedAt)}.`,
      );
    } catch (error) {
      setVehiclePhotoMessage(error instanceof Error ? error.message : 'Could not capture the vehicle photo.');
    }
  }

  async function handleSendThreadMessage(requestId: string) {
    const message = (threadDrafts[requestId] ?? '').trim();

    if (!message) {
      return;
    }

    const sent = await actions.sendSecurityGuestMessage(activeSocietyId, requestId, { message });

    if (sent) {
      setThreadDrafts((current) => ({
        ...current,
        [requestId]: '',
      }));
    }
  }

  async function handleCallPhone(phone?: string) {
    if (!phone) {
      return;
    }

    await openPhoneDialer(phone);
  }

  async function handleOpenWhatsapp(phone: string | undefined, guestRequestName: string, unitCode?: string) {
    if (!phone) {
      return;
    }

    await openWhatsAppConversation(
      phone,
      `Gate desk update: ${guestRequestName} is waiting at ${unitCode ?? 'your unit'} for approval. Please respond in the app so security can proceed quickly.`,
    );
  }

  async function handleCreateGateRequest() {
    if (!societyId) {
      return;
    }

    const saved = await actions.createSecurityGuestRequest(societyId, {
      unitId: selectedUnitId,
      residentUserId: selectedResidentUserId,
      guestName,
      phone: guestPhone,
      category: guestCategory,
      purpose: guestPurpose,
      guestCount,
      vehicleNumber,
      guestPhotoDataUrl: guestPhotoDataUrl || undefined,
      guestPhotoCapturedAt: guestPhotoCapturedAt || undefined,
      vehiclePhotoDataUrl: vehiclePhotoDataUrl || undefined,
      vehiclePhotoCapturedAt: vehiclePhotoCapturedAt || undefined,
      gateNotes,
    });

    if (saved) {
      setGuestCategory('guest');
      setGuestName('');
      setGuestPhone('');
      setGuestPurpose('');
      setGuestCount('1');
      setVehicleNumber('');
      setGateNotes('');
      setGuestPhotoDataUrl('');
      setGuestPhotoCapturedAt('');
      setGuestPhotoMessage('');
      setVehiclePhotoDataUrl('');
      setVehiclePhotoCapturedAt('');
      setVehiclePhotoMessage('');
      setActiveTab('queue');
      setQueueFilter('pendingApproval');
    }
  }

  return (
    <>
    <PageFrame>
      {isCompact ? (
        <SurfaceCard style={styles.compactWorkspaceCard}>
          <View style={styles.compactWorkspaceTopRow}>
            <View style={styles.compactWorkspaceTitleWrap}>
              <Pill label="Security" tone="warning" />
              <Text style={styles.compactWorkspaceTitle}>{society.name}</Text>
              <Caption>{securityTabs.find((item) => item.key === activeTab)?.label ?? 'Gate desk'} | {guards.length} guards on roster</Caption>
            </View>
            <View style={styles.compactWorkspaceStatsRow}>
              <View style={styles.compactWorkspaceStat}>
                <Text style={styles.compactWorkspaceStatValue}>{pendingCount}</Text>
                <Caption>Pending</Caption>
              </View>
              <View style={styles.compactWorkspaceStat}>
                <Text style={styles.compactWorkspaceStatValue}>{checkedInCount}</Text>
                <Caption>Inside</Caption>
              </View>
            </View>
          </View>
          <View style={styles.compactWorkspaceActionRow}>
            {activeTab !== 'desk' ? (
              <ActionButton label="← Back" onPress={() => setActiveTab('desk')} variant="secondary" />
            ) : null}
            <ActionButton label="Roles" onPress={actions.goToRoleSelection} variant="secondary" />
            <ActionButton label="Societies" onPress={actions.goToWorkspaces} variant="secondary" />
            {canUseAdmin ? <ActionButton label="Admin" onPress={() => actions.selectProfile('admin')} variant="secondary" /> : null}
          </View>
          {!isPhone ? <NavigationStrip items={securityTabs} activeKey={activeTab} onChange={setActiveTab} /> : null}
        </SurfaceCard>
      ) : null}

      {!isCompact ? (
      <View style={styles.utilityBar}>
        <Pressable onPress={actions.goToRoleSelection} style={({ pressed }) => [styles.identityCard, pressed ? styles.pressed : null]}>
          <View style={styles.avatarBadge}>
            <Text style={styles.avatarBadgeText}>{user.avatarInitials}</Text>
          </View>
          <View style={styles.identityCopy}>
            <Text style={styles.identityTitle}>{society.name}</Text>
            <Caption>{society.area}, {society.city}</Caption>
          </View>
        </Pressable>
        <View style={styles.utilityActions}>
          {activeTab !== 'desk' ? <ActionButton label="← Back" onPress={() => setActiveTab('desk')} variant="secondary" /> : null}
          <ActionButton label="Roles" onPress={actions.goToRoleSelection} variant="secondary" />
          <ActionButton label="Societies" onPress={actions.goToWorkspaces} variant="secondary" />
          {canUseAdmin ? <ActionButton label="Admin" onPress={() => actions.selectProfile('admin')} /> : null}
        </View>
      </View>
      ) : null}

      {!isCompact ? (
      <SurfaceCard style={styles.heroPanel}>
        <View style={styles.heroHeader}>
          <View style={styles.heroCopy}>
            <Pill label="Security workspace" tone="warning" />
            <Text style={styles.heroTitle}>Gate approvals with resident confirmation</Text>
            <Caption style={styles.heroDescription}>
              Capture the guest photo, link the visit to a resident, wait for approval, then record check-in and exit from one workflow.
            </Caption>
          </View>
          <View style={styles.heroMeta}>
            <Text style={styles.heroMetaValue}>{guards.length}</Text>
            <Caption>guards on roster</Caption>
          </View>
        </View>
        <View style={styles.metricGrid}>
          <MetricCard label="Waiting approval" value={String(pendingCount)} tone="accent" onPress={() => { setActiveTab('queue'); setQueueFilter('pendingApproval'); }} />
          <MetricCard label="Approved to enter" value={String(approvedCount)} tone="blue" onPress={() => { setActiveTab('queue'); setQueueFilter('approved'); }} />
          <MetricCard label="Guests inside" value={String(checkedInCount)} onPress={() => { setActiveTab('queue'); setQueueFilter('checkedIn'); }} />
          <MetricCard label="Log events today" value={String(todayLogCount)} tone="blue" onPress={() => setActiveTab('logs')} />
        </View>
      </SurfaceCard>
      ) : null}

      {!isCompact ? (
      <SurfaceCard>
        <NavigationStrip items={securityTabs} activeKey={activeTab} onChange={setActiveTab} />
      </SurfaceCard>
      ) : null}

      {activeTab === 'desk' ? (
        <>
          <SurfaceCard>
            <SectionHeader
              title="Create gate approval request"
              description="This is the walk-in workflow. Security captures the guest at the gate, the resident receives the approval in their workspace, and the visit stays fully logged."
            />

            <Text style={styles.fieldTitle}>Select resident unit</Text>
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

            <Text style={styles.fieldTitle}>Link to resident</Text>
            <View style={styles.choiceRow}>
              {unitResidents.map(({ user: resident, membership: residentMembership }) => (
                <ChoiceChip
                  key={resident.id}
                  label={`${resident.name.split(' ')[0]} · ${residentMembership.roles[0] ?? 'resident'}`}
                  selected={selectedResidentUserId === resident.id}
                  onPress={() => setSelectedResidentUserId(resident.id)}
                />
              ))}
            </View>
            {unitResidents.length === 0 ? (
              <View style={styles.selectionNotice}>
                <Text style={styles.selectionNoticeTitle}>No resident linked to {selectedUnit?.code ?? 'this unit'}</Text>
                <Caption>Choose another unit or map a resident to this unit from the admin workspace.</Caption>
              </View>
            ) : null}
            {selectedResidentEntry ? (
              <View style={styles.selectedResidentCard}>
                <View style={styles.selectedResidentHeader}>
                  <View style={styles.selectedResidentCopy}>
                    <Text style={styles.selectedResidentTitle}>{selectedResidentEntry.user.name}</Text>
                    <Caption>
                      {selectedUnit?.code ?? 'Unit'} - {humanizeRole(selectedResidentEntry.membership.roles[0] ?? 'owner')}
                    </Caption>
                  </View>
                  <Pill label="Resident details" tone="primary" />
                </View>
                <View style={styles.detailGrid}>
                  <View style={styles.detailTile}>
                    <DetailRow label="Mobile" value={selectedResidentEntry.user.phone || 'Not available'} />
                  </View>
                  <View style={styles.detailTile}>
                    <DetailRow
                      label="Roles"
                      value={selectedResidentEntry.membership.roles.map(humanizeRole).join(', ')}
                    />
                  </View>
                  <View style={styles.detailTile}>
                    <DetailRow
                      label="Linked units"
                      value={selectedResidentEntry.units.map((unit) => unit.code).join(', ')}
                    />
                  </View>
                </View>
              </View>
            ) : null}

            <Text style={styles.fieldTitle}>Guest type</Text>
            <View style={styles.choiceRow}>
              {visitorCategories.map((category) => (
                <ChoiceChip
                  key={category.key}
                  label={category.label}
                  selected={guestCategory === category.key}
                  onPress={() => setGuestCategory(category.key)}
                />
              ))}
            </View>

            <View style={styles.formGrid}>
              <View style={styles.formField}>
                <InputField label="Guest name" value={guestName} onChangeText={setGuestName} placeholder="Rahul Sharma" />
              </View>
              <View style={styles.formField}>
                <InputField label="Guest phone" value={guestPhone} onChangeText={setGuestPhone} keyboardType="phone-pad" placeholder="+91 98765 43210" />
              </View>
              <View style={styles.formField}>
                <InputField label="Visit purpose" value={guestPurpose} onChangeText={setGuestPurpose} placeholder="Meeting, family visit, service call" />
              </View>
              <View style={styles.formField}>
                <InputField label="Guest count" value={guestCount} onChangeText={setGuestCount} keyboardType="numeric" placeholder="1" />
              </View>
              <View style={styles.formField}>
                <InputField label="Vehicle number" value={vehicleNumber} onChangeText={(value) => setVehicleNumber(value.toUpperCase())} placeholder="Optional" autoCapitalize="characters" />
              </View>
            </View>

            <InputField
              label="Gate notes"
              value={gateNotes}
              onChangeText={setGateNotes}
              placeholder="Carrying parcel, vendor tools, or resident asked for urgent entry."
              multiline
            />

            <View style={styles.photoPanel}>
              <View style={styles.photoCopy}>
                <Text style={styles.photoTitle}>Guest photo capture</Text>
                <Caption>
                  Attach the face photo taken at the gate so the resident and security log both reference the same person.
                </Caption>
              </View>
              <ActionButton
                label={guestPhotoDataUrl ? 'Retake photo' : 'Capture photo'}
                onPress={handleCapturePhoto}
                variant="secondary"
              />
            </View>

            {guestPhotoDataUrl ? (
              <View style={styles.mediaPreviewCard}>
                <Image source={{ uri: guestPhotoDataUrl }} style={styles.guestPhoto} />
                <Caption>Captured at {formatGateTimestamp(guestPhotoCapturedAt)}</Caption>
              </View>
            ) : null}
            {guestPhotoMessage ? <Caption>{guestPhotoMessage}</Caption> : null}

            <View style={styles.photoPanel}>
              <View style={styles.photoCopy}>
                <Text style={styles.photoTitle}>Vehicle photo capture</Text>
                <Caption>
                  Capture the number plate or vehicle front. The workspace will try to detect the vehicle number and fill it automatically.
                </Caption>
              </View>
              <ActionButton
                label={vehiclePhotoDataUrl ? 'Retake vehicle photo' : 'Capture vehicle photo'}
                onPress={handleCaptureVehiclePhoto}
                variant="secondary"
              />
            </View>

            {vehiclePhotoDataUrl ? (
              <View style={styles.mediaPreviewCard}>
                <Image source={{ uri: vehiclePhotoDataUrl }} style={styles.vehiclePhoto} />
                <Caption>Captured at {formatGateTimestamp(vehiclePhotoCapturedAt)}</Caption>
              </View>
            ) : null}
            {vehiclePhotoMessage ? <Caption>{vehiclePhotoMessage}</Caption> : null}
            {gateRequestBlockingReason ? (
              <Caption style={styles.validationMessage}>{gateRequestBlockingReason}</Caption>
            ) : null}

            <ActionButton
              label={state.isSyncing ? 'Sending...' : 'Send to resident'}
              onPress={handleCreateGateRequest}
              disabled={state.isSyncing || Boolean(gateRequestBlockingReason)}
            />
          </SurfaceCard>

          <SurfaceCard>
            <SectionHeader
              title="Current guard roster"
              description="Security access is provisioned from admin. Every guard number added by admin can sign in and use this workspace."
            />
            {guards.length > 0 ? (
              guards.slice(0, 4).map(({ guard, latestShift }) => (
                <View key={guard.id} style={styles.inlineCard}>
                  <View>
                    <Text style={styles.inlineTitle}>{guard.name}</Text>
                    <Caption>{guard.shiftLabel} · {latestShift?.gate ?? 'Gate desk'}</Caption>
                  </View>
                  <Pill label={guard.vendorName || 'In-house'} tone="primary" />
                </View>
              ))
            ) : (
              <Caption>No guard roster yet. Admin can add security team members from the admin security module.</Caption>
            )}
          </SurfaceCard>
        </>
      ) : null}

      {activeTab === 'queue' ? (
        <>
          <SurfaceCard>
            <SectionHeader
              title="Resident approval queue"
              description="Approve requests wait here until the resident responds. After approval, security checks in and checks out the guest from the same card."
            />
            <View style={styles.choiceRow}>
              {queueFilters.map((filter) => (
                <ChoiceChip
                  key={filter.key}
                  label={filter.label}
                  selected={queueFilter === filter.key}
                  onPress={() => setQueueFilter(filter.key)}
                />
              ))}
            </View>
          </SurfaceCard>

          <SurfaceCard>
            {filteredRequests.length > 0 ? (
              filteredRequests.map(({ request, unit, resident, createdBy }) => {
                const conversation = conversationsByRequestId.get(request.id) ?? [];
                const recentConversation = conversation.slice(-6);
                const latestRing = [...conversation].reverse().find(({ log }) => log.action === 'ringRequested');

                return (
                <View key={request.id} style={styles.queueCard}>
                  <View style={styles.queueHeader}>
                    <View style={styles.queueHeaderCopy}>
                      <Text style={styles.queueTitle}>{request.guestName}</Text>
                      <Caption>
                        {resident?.name ?? 'Resident'} · {unit?.code ?? 'Unit'} · requested by {createdBy?.name ?? 'Security'}
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
                  <Caption>
                    Created {formatLongDate(request.createdAt)}
                    {request.respondedAt ? ` · responded ${formatLongDate(request.respondedAt)}` : ''}
                  </Caption>
                  <Caption>
                    Gate timestamps: created {formatGateTimestamp(request.createdAt)}
                    {request.respondedAt ? ` - responded ${formatGateTimestamp(request.respondedAt)}` : ''}
                    {request.checkedInAt ? ` - checked in ${formatGateTimestamp(request.checkedInAt)}` : ''}
                    {request.checkedOutAt ? ` - checked out ${formatGateTimestamp(request.checkedOutAt)}` : ''}
                  </Caption>
                  {request.gateNotes ? <Caption>Gate note: {request.gateNotes}</Caption> : null}
                  {request.guestPhotoCapturedAt ? (
                    <Caption>Guest photo captured at {formatGateTimestamp(request.guestPhotoCapturedAt)}</Caption>
                  ) : null}
                  {request.vehiclePhotoCapturedAt ? (
                    <Caption>Vehicle photo captured at {formatGateTimestamp(request.vehiclePhotoCapturedAt)}</Caption>
                  ) : null}
                  {request.guestPhotoDataUrl || request.vehiclePhotoDataUrl ? (
                    <View style={styles.queuePhotoRow}>
                      {request.guestPhotoDataUrl ? (
                        <View style={styles.queueMediaCard}>
                          <Image source={{ uri: request.guestPhotoDataUrl }} style={styles.queuePhoto} />
                          <Caption>Guest photo</Caption>
                        </View>
                      ) : null}
                      {request.vehiclePhotoDataUrl ? (
                        <View style={styles.queueMediaCard}>
                          <Image source={{ uri: request.vehiclePhotoDataUrl }} style={styles.queuePhoto} />
                          <Caption>Vehicle photo</Caption>
                        </View>
                      ) : null}
                    </View>
                  ) : null}

                  <View style={styles.threadPanel}>
                    <View style={styles.threadHeader}>
                      <Text style={styles.threadTitle}>Live approval thread</Text>
                      {latestRing ? (
                        <Pill
                          label={`Rung ${formatGateTimestamp(latestRing.log.createdAt)}`}
                          tone="warning"
                        />
                      ) : null}
                    </View>
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
                            {actor?.name ?? (log.actorRole === 'resident' ? 'Resident' : 'Gate team')}
                          </Text>
                          <Caption>{humanizeSecurityGuestLogAction(log.action)}</Caption>
                          {log.note ? <Text style={styles.threadBubbleMessage}>{log.note}</Text> : null}
                          <Caption>{formatGateTimestamp(log.createdAt)}</Caption>
                        </View>
                      ))
                    ) : (
                      <Caption>No chat updates yet. Send a quick note or ring the resident for faster action.</Caption>
                    )}
                    <InputField
                      label="Message to resident"
                      value={threadDrafts[request.id] ?? ''}
                      onChangeText={(value) =>
                        setThreadDrafts((current) => ({
                          ...current,
                          [request.id]: value,
                        }))
                      }
                      placeholder="Guest says they are carrying parcel, documents, or tools..."
                      multiline
                    />
                    <View style={styles.threadActions}>
                      <ActionButton
                        label={state.isSyncing ? 'Sending...' : 'Send message'}
                        onPress={() => handleSendThreadMessage(request.id)}
                        disabled={state.isSyncing || !(threadDrafts[request.id] ?? '').trim()}
                        variant="secondary"
                      />
                      {request.status === 'pendingApproval' ? (
                        <ActionButton
                          label={state.isSyncing ? 'Ringing...' : 'Ring resident'}
                          onPress={() => actions.ringSecurityGuestRequest(activeSocietyId, request.id)}
                          disabled={state.isSyncing}
                        />
                      ) : null}
                      {resident?.phone ? (
                        <ActionButton
                          label="Call resident"
                          onPress={() => handleCallPhone(resident.phone)}
                          disabled={state.isSyncing}
                          variant="secondary"
                        />
                      ) : null}
                      {resident?.phone ? (
                        <ActionButton
                          label="WhatsApp"
                          onPress={() => handleOpenWhatsapp(resident.phone, request.guestName, unit?.code)}
                          disabled={state.isSyncing}
                          variant="secondary"
                        />
                      ) : null}
                    </View>
                  </View>

                  {request.status === 'pendingApproval' ? (
                    <View style={styles.buttonRow}>
                      <ActionButton
                        label="Waiting for resident"
                        onPress={() => undefined}
                        variant="secondary"
                        disabled
                      />
                      <ActionButton
                        label={state.isSyncing ? 'Updating...' : 'Cancel request'}
                        onPress={() => actions.updateSecurityGuestRequestStatus(activeSocietyId, request.id, { status: 'cancelled' })}
                        variant="danger"
                        disabled={state.isSyncing}
                      />
                    </View>
                  ) : null}

                  {request.status === 'approved' ? (
                    <View style={styles.buttonRow}>
                      <ActionButton
                        label={state.isSyncing ? 'Updating...' : 'Check in guest'}
                        onPress={() => actions.updateSecurityGuestRequestStatus(activeSocietyId, request.id, { status: 'checkedIn' })}
                        disabled={state.isSyncing}
                      />
                      <ActionButton
                        label="Cancel"
                        onPress={() => actions.updateSecurityGuestRequestStatus(activeSocietyId, request.id, { status: 'cancelled' })}
                        variant="danger"
                        disabled={state.isSyncing}
                      />
                    </View>
                  ) : null}

                  {request.status === 'checkedIn' ? (
                    <View style={styles.buttonRow}>
                      <ActionButton
                        label={state.isSyncing ? 'Updating...' : 'Mark exit'}
                        onPress={() => actions.updateSecurityGuestRequestStatus(activeSocietyId, request.id, { status: 'completed' })}
                        disabled={state.isSyncing}
                      />
                    </View>
                  ) : null}
                </View>
              );
            })
            ) : (
              <Caption>No gate requests in this queue yet.</Caption>
            )}
          </SurfaceCard>
        </>
      ) : null}

      {activeTab === 'logs' ? (
        <>
          <SurfaceCard>
            <SectionHeader
              title="Security log timeline"
              description="Every gate request, approval, check-in, and exit stays visible here for audit and follow-up."
            />
          </SurfaceCard>
          <SurfaceCard>
            {logs.length > 0 ? (
              logs.map(({ log, actor, request }) => (
                <View key={log.id} style={styles.logRow}>
                  <View style={styles.logBadge}>
                    <Text style={styles.logBadgeText}>{log.actorRole.slice(0, 2).toUpperCase()}</Text>
                  </View>
                  <View style={styles.logCopy}>
                    <Text style={styles.logTitle}>{humanizeSecurityGuestLogAction(log.action)}</Text>
                    <Caption>
                      {request?.guestName ?? 'Guest'} · {actor?.name ?? 'System'} · {formatLongDate(log.createdAt)}
                    </Caption>
                    {log.note ? <Caption>{log.note}</Caption> : null}
                  </View>
                </View>
              ))
            ) : (
              <Caption>No security logs yet. They will start appearing after the first guest request is created.</Caption>
            )}
          </SurfaceCard>
        </>
      ) : null}
    </PageFrame>

    {isPhone ? (
      <>
        {!isDrawerOpen ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setIsDrawerOpen(true)}
            style={({ pressed }) => [styles.leftDrawerHandle, pressed ? styles.leftDrawerHandlePressed : null]}
          >
            <Text style={styles.leftDrawerHandleText}>Menu</Text>
          </Pressable>
        ) : null}

        {isDrawerOpen ? (
          <Pressable style={styles.drawerBackdrop} onPress={() => setIsDrawerOpen(false)} />
        ) : null}

        <View style={[styles.sideDrawer, isDrawerOpen ? styles.sideDrawerOpen : null]}>
          <View style={styles.sideDrawerHeader}>
            <View style={styles.sideDrawerTitleWrap}>
              <Pill label="Security" tone="warning" />
              <Text style={styles.sideDrawerTitle}>Security Menu</Text>
            </View>
            <Pressable onPress={() => setIsDrawerOpen(false)} style={({ pressed }) => [styles.sideDrawerClose, pressed ? styles.pressed : null]}>
              <Text style={styles.sideDrawerCloseText}>Close</Text>
            </Pressable>
          </View>
          <Caption style={styles.sideDrawerCaption}>Jump between desk, queue, and logs without keeping the tab strip on screen.</Caption>
          <ScrollView style={styles.sideDrawerScroller} contentContainerStyle={styles.sideDrawerList} showsVerticalScrollIndicator={false}>
            {securityTabs.map((item) => {
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
                    pressed ? styles.pressed : null,
                  ]}
                >
                  <Text style={[styles.sideDrawerItemText, isActive ? styles.sideDrawerItemTextActive : null]}>{item.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </>
    ) : null}
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
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#E8DCCB',
    backgroundColor: '#FFFDF9',
    alignItems: 'center',
    gap: 2,
  },
  compactWorkspaceStatValue: {
    fontSize: 16,
    fontWeight: '800',
    color: palette.warning,
  },
  compactWorkspaceActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  leftDrawerHandle: {
    position: 'absolute',
    left: 0,
    top: 88,
    paddingVertical: spacing.sm,
    paddingLeft: 8,
    paddingRight: spacing.xs,
    borderTopRightRadius: radius.md,
    borderBottomRightRadius: radius.md,
    backgroundColor: '#F4E5C9',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderColor: '#DEC49A',
    zIndex: 40,
    ...shadow.card,
  },
  leftDrawerHandlePressed: {
    opacity: 0.88,
  },
  leftDrawerHandleText: {
    color: palette.ink,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  drawerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(28, 24, 18, 0.24)',
    zIndex: 35,
  },
  sideDrawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 246,
    paddingTop: 56,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
    backgroundColor: '#FFF7EA',
    borderRightWidth: 1,
    borderRightColor: '#E3CFAC',
    transform: [{ translateX: -270 }],
    zIndex: 50,
    gap: spacing.md,
    ...shadow.card,
  },
  sideDrawerOpen: {
    transform: [{ translateX: 0 }],
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
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '900',
    color: palette.ink,
  },
  sideDrawerClose: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: '#F4E5C9',
  },
  sideDrawerCloseText: {
    color: palette.ink,
    fontSize: 12,
    fontWeight: '700',
  },
  sideDrawerCaption: {
    color: '#6F5B3E',
  },
  sideDrawerScroller: {
    flex: 1,
  },
  sideDrawerList: {
    gap: spacing.xs,
    paddingBottom: spacing.xl,
  },
  sideDrawerItem: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: '#FFFDF9',
    borderWidth: 1,
    borderColor: '#E9D9BF',
  },
  sideDrawerItemActive: {
    backgroundColor: '#1F2E43',
    borderColor: '#1F2E43',
  },
  sideDrawerItemText: {
    color: palette.ink,
    fontSize: 14,
    fontWeight: '700',
  },
  sideDrawerItemTextActive: {
    color: palette.white,
  },
  utilityBar: {
    gap: spacing.md,
  },
  identityCard: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    ...shadow.card,
  },
  avatarBadge: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.accent,
  },
  avatarBadgeText: {
    color: palette.white,
    fontSize: 16,
    fontWeight: '800',
  },
  identityCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  identityTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: palette.ink,
  },
  utilityActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  heroPanel: {
    gap: spacing.lg,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  heroCopy: {
    flex: 1,
    gap: spacing.sm,
    minWidth: 260,
  },
  heroTitle: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '900',
    color: palette.ink,
  },
  heroDescription: {
    maxWidth: 760,
  },
  heroMeta: {
    minWidth: 120,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#E8D4B0',
    backgroundColor: '#FFF7EA',
    alignItems: 'center',
    gap: spacing.xs,
  },
  heroMetaValue: {
    fontSize: 30,
    fontWeight: '900',
    color: palette.warning,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  fieldTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: palette.ink,
  },
  choiceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  formGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  formField: {
    flexBasis: 260,
    flexGrow: 1,
  },
  selectionNotice: {
    borderWidth: 1,
    borderColor: '#E9D6B9',
    backgroundColor: '#FFF9F0',
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  selectionNoticeTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: palette.ink,
  },
  selectedResidentCard: {
    gap: spacing.md,
    borderWidth: 1,
    borderColor: '#D7E3F1',
    backgroundColor: '#F8FBFF',
    borderRadius: radius.md,
    padding: spacing.md,
  },
  selectedResidentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  selectedResidentCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  selectedResidentTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: palette.ink,
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  detailTile: {
    flexBasis: 200,
    flexGrow: 1,
    backgroundColor: palette.white,
    borderColor: '#D7E3F1',
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  photoPanel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  photoCopy: {
    gap: spacing.xs,
    flex: 1,
  },
  photoTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: palette.ink,
  },
  mediaPreviewCard: {
    gap: spacing.sm,
  },
  validationMessage: {
    color: palette.warning,
    fontWeight: '700',
  },
  guestPhoto: {
    width: 180,
    height: 180,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surfaceMuted,
  },
  vehiclePhoto: {
    width: 240,
    height: 160,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surfaceMuted,
  },
  inlineCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#F1E6D8',
  },
  inlineTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: palette.ink,
  },
  queueCard: {
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: '#F1E6D8',
  },
  queueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  queueHeaderCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  queueTitle: {
    fontSize: 21,
    fontWeight: '900',
    color: palette.ink,
  },
  queuePhoto: {
    width: 140,
    height: 140,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surfaceMuted,
  },
  queuePhotoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  queueMediaCard: {
    gap: spacing.xs,
  },
  threadPanel: {
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: '#FBF7EF',
    borderWidth: 1,
    borderColor: '#E9DDCB',
    gap: spacing.sm,
  },
  threadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  threadTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: palette.ink,
  },
  threadBubble: {
    padding: spacing.md,
    borderRadius: radius.md,
    gap: spacing.xs,
    maxWidth: '92%',
  },
  threadBubbleSecurity: {
    backgroundColor: palette.blueSoft,
    alignSelf: 'flex-start',
    borderTopLeftRadius: radius.sm,
  },
  threadBubbleResident: {
    backgroundColor: palette.accentSoft,
    alignSelf: 'flex-end',
    borderTopRightRadius: radius.sm,
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
  threadActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  logRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#F1E6D8',
    alignItems: 'flex-start',
  },
  logBadge: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: palette.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logBadgeText: {
    color: palette.primary,
    fontSize: 13,
    fontWeight: '900',
  },
  logCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  logTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: palette.ink,
  },
  pressed: {
    opacity: 0.84,
  },
});
