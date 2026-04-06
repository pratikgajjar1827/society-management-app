import { useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import {
  ActionButton,
  Caption,
  ChoiceChip,
  InputField,
  Page,
  Pill,
  SectionHeader,
  SurfaceCard,
} from '../components/ui';
import {
  countApartmentUnits,
  countOfficeUnits,
  countShedUnits,
  expandOfficeNumbersInput,
  findDuplicateOfficeCodes,
  formatApartmentUnitNumber,
  normalizeApartmentBlockPlan,
  normalizeApartmentStartingFloorNumber,
  normalizeOfficeFloorPlan,
  normalizeShedBlockPlan,
} from '../data/factories';
import { useApp } from '../state/AppContext';
import { palette, radius, shadow, spacing } from '../theme/tokens';
import {
  ApartmentBlockPlanEntry,
  CommercialSpaceType,
  OfficeFloorPlanEntry,
  ShedBlockPlanEntry,
  SocietySetupDraft,
  SocietyStructure,
  SocietyStructureOption,
} from '../types/domain';
import { isCreatorAppVariant } from '../config/appVariant';
import {
  getEnabledCommercialSpaceTypes,
  getEnabledStructures,
  getSocietyStructurePreviewLabel,
  getSocietyUnitCollectionLabel,
} from '../utils/selectors';

const structureOptions: SocietyStructureOption[] = ['apartment', 'bungalow', 'commercial'];
const commercialSpaceTypes: CommercialSpaceType[] = ['shed', 'office'];
const amenityCategorySections = [
  {
    key: 'social',
    title: 'Social and hosting',
    description: 'Large gathering spaces, event venues, and hospitality amenities used in premium projects.',
    amenities: ['Clubhouse Hall', 'Banquet Hall', 'Community Hall', 'Party Lawn', 'Guest Suites', 'Cafe Lounge', 'BBQ Deck'],
  },
  {
    key: 'work',
    title: 'Work and lounge',
    description: 'Coworking and informal resident lounge spaces for remote work and everyday meetings.',
    amenities: ['Coworking Lounge', 'Business Lounge', 'Indoor Games Lounge', 'Senior Citizen Lounge'],
  },
  {
    key: 'wellness',
    title: 'Wellness and recreation',
    description: 'Fitness, pool, yoga, and light recreation areas that need recurring daily access.',
    amenities: ['Gym', 'Swimming Pool', 'Yoga Deck', 'Walking Track', 'Garden'],
  },
  {
    key: 'sports',
    title: 'Sports courts',
    description: 'Bookable game courts and active sports facilities commonly seen in metro communities.',
    amenities: ['Badminton Court', 'Squash Court', 'Tennis Court', 'Basketball Court'],
  },
  {
    key: 'family',
    title: 'Family and children',
    description: 'Dedicated spaces for children, family leisure, and safe shared outdoor use.',
    amenities: ['Childrens Play Area'],
  },
  {
    key: 'pet',
    title: 'Pet and mobility',
    description: 'Facilities for pets, guest visitors, and community access support.',
    amenities: ['Pet Park', 'Guest Parking'],
  },
] as const;

function sanitizeNumber(value: string) {
  return value.replace(/[^0-9]/g, '');
}

function parseWholeNumber(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function cloneOfficeFloorPlan(officeFloorPlan: OfficeFloorPlanEntry[]) {
  return officeFloorPlan.map((floor) => ({ ...floor }));
}

function cloneApartmentBlockPlan(apartmentBlockPlan: ApartmentBlockPlanEntry[]) {
  return apartmentBlockPlan.map((block) => ({ ...block }));
}

function cloneShedBlockPlan(shedBlockPlan: ShedBlockPlanEntry[]) {
  return shedBlockPlan.map((block) => ({ ...block }));
}

function getTowerLabel(index: number) {
  return `Tower ${String.fromCharCode(65 + index)}`;
}

function createApartmentBlockEntry(index: number): ApartmentBlockPlanEntry {
  return {
    blockName: `Block ${String.fromCharCode(65 + index)}`,
    towerCount: index === 0 ? '2' : '1',
    floorsPerTower: '6',
    homesPerFloor: '4',
  };
}

function createOfficeFloorEntry(index: number, blockName = getTowerLabel(0)): OfficeFloorPlanEntry {
  return {
    blockName,
    floorLabel: index === 0 ? 'Ground Floor' : `Floor ${index + 1}`,
    officeNumbers: '',
  };
}

function createShedBlockEntry(index: number): ShedBlockPlanEntry {
  return {
    blockName: `Block ${String.fromCharCode(65 + index)}`,
    shedCount: '',
  };
}

function getOfficeFloorsForBlock(officeFloorPlan: OfficeFloorPlanEntry[], blockName: string) {
  const normalizedBlockName = blockName.trim().toLowerCase();
  return officeFloorPlan.filter(
    (floor) => String(floor.blockName ?? '').trim().toLowerCase() === normalizedBlockName,
  );
}

function getNextOfficeBlockName(officeFloorPlan: OfficeFloorPlanEntry[]) {
  const existingBlockNames = new Set(
    normalizeOfficeFloorPlan(officeFloorPlan).map((floor) => floor.blockName.toLowerCase()),
  );
  let nextIndex = 0;

  while (existingBlockNames.has(getTowerLabel(nextIndex).toLowerCase())) {
    nextIndex += 1;
  }

  return getTowerLabel(nextIndex);
}

function getOfficeFloorDescriptor(floor: OfficeFloorPlanEntry, index: number) {
  const blockName = String(floor.blockName ?? '').trim() || 'Commercial Tower';
  const floorLabel = floor.floorLabel.trim() || (index === 0 ? 'Ground Floor' : `Floor ${index + 1}`);
  return `${blockName} - ${floorLabel}`;
}

function cloneDraft(draft: SocietySetupDraft): SocietySetupDraft {
  const apartmentBlockPlan = draft.apartmentBlockPlan ?? [];
  const shedBlockPlan = draft.shedBlockPlan ?? [];
  const officeFloorPlan = draft.officeFloorPlan ?? [];

  return {
    ...draft,
    apartmentStartingFloorNumber: String(
      normalizeApartmentStartingFloorNumber(draft.apartmentStartingFloorNumber),
    ),
    apartmentBlockPlan:
      apartmentBlockPlan.length > 0
        ? cloneApartmentBlockPlan(apartmentBlockPlan)
        : [createApartmentBlockEntry(0)],
    shedBlockPlan:
      shedBlockPlan.length > 0
        ? cloneShedBlockPlan(shedBlockPlan)
        : [createShedBlockEntry(0)],
    officeFloorPlan:
      officeFloorPlan.length > 0
        ? cloneOfficeFloorPlan(officeFloorPlan)
        : [createOfficeFloorEntry(0)],
  };
}

function normalizeStructureSelections(value?: SocietyStructureOption[]) {
  return [...new Set((value ?? []).filter((item): item is SocietyStructureOption => structureOptions.includes(item)))];
}

function normalizeCommercialSelections(value?: CommercialSpaceType[]) {
  return [...new Set((value ?? []).filter((item): item is CommercialSpaceType => commercialSpaceTypes.includes(item)))];
}

function deriveStructure(enabledStructures: SocietyStructureOption[]): SocietyStructure {
  if (enabledStructures.length > 1) {
    return 'mixed';
  }

  return enabledStructures[0] ?? 'apartment';
}

function deriveCommercialSpaceType(enabledCommercialSpaceTypes: CommercialSpaceType[]): CommercialSpaceType {
  if (enabledCommercialSpaceTypes.includes('office')) {
    return 'office';
  }

  return 'shed';
}

function hasStructureSelected(draft: SocietySetupDraft, structure: SocietyStructureOption) {
  return getEnabledStructures(draft).includes(structure);
}

function hasCommercialSpaceTypeSelected(draft: SocietySetupDraft, commercialSpaceType: CommercialSpaceType) {
  return getEnabledCommercialSpaceTypes(draft).includes(commercialSpaceType);
}

function getDerivedTotalUnits(draft: SocietySetupDraft) {
  const enabledStructures = getEnabledStructures(draft);
  const enabledCommercialSpaceTypes = getEnabledCommercialSpaceTypes(draft);
  const apartmentUnitCount = enabledStructures.includes('apartment')
    ? countApartmentUnits(draft.apartmentBlockPlan ?? [createApartmentBlockEntry(0)])
    : 0;
  const bungalowUnitCount = enabledStructures.includes('bungalow')
    ? parseWholeNumber(draft.bungalowUnitCount)
    : 0;
  const shedUnitCount =
    enabledStructures.includes('commercial') && enabledCommercialSpaceTypes.includes('shed')
      ? countShedUnits(draft.shedBlockPlan ?? [createShedBlockEntry(0)])
      : 0;
  const officeUnitCount =
    enabledStructures.includes('commercial') && enabledCommercialSpaceTypes.includes('office')
      ? countOfficeUnits(draft.officeFloorPlan ?? [createOfficeFloorEntry(0)])
      : 0;
  const totalUnits = apartmentUnitCount + bungalowUnitCount + shedUnitCount + officeUnitCount;

  return totalUnits > 0 ? String(totalUnits) : '';
}

function syncDerivedFields(draft: SocietySetupDraft): SocietySetupDraft {
  const normalizedStructureSelections = normalizeStructureSelections(draft.enabledStructures);
  const enabledStructures =
    normalizedStructureSelections.length > 0
      ? normalizedStructureSelections
      : structureOptions.includes(draft.structure as SocietyStructureOption)
        ? [draft.structure as SocietyStructureOption]
        : [];
  const normalizedCommercialStructureSelections = normalizeCommercialSelections(
    draft.enabledCommercialSpaceTypes,
  );
  const enabledCommercialSpaceTypes = enabledStructures.includes('commercial')
    ? normalizedCommercialStructureSelections.length > 0
      ? normalizedCommercialStructureSelections
      : commercialSpaceTypes.includes(draft.commercialSpaceType)
        ? [draft.commercialSpaceType]
        : []
    : [];
  const normalizedDraft: SocietySetupDraft = {
    ...draft,
    enabledStructures,
    enabledCommercialSpaceTypes,
  };

  return {
    ...normalizedDraft,
    enabledStructures,
    enabledCommercialSpaceTypes,
    structure: deriveStructure(enabledStructures),
    commercialSpaceType: deriveCommercialSpaceType(enabledCommercialSpaceTypes),
    apartmentSubtype: 'block',
    apartmentStartingFloorNumber: String(
      normalizeApartmentStartingFloorNumber(draft.apartmentStartingFloorNumber),
    ),
    apartmentBlockPlan:
      (draft.apartmentBlockPlan ?? []).length > 0
        ? cloneApartmentBlockPlan(draft.apartmentBlockPlan ?? [])
        : [createApartmentBlockEntry(0)],
    apartmentUnitCount: enabledStructures.includes('apartment')
      ? String(countApartmentUnits((draft.apartmentBlockPlan ?? []).length > 0 ? (draft.apartmentBlockPlan ?? []) : [createApartmentBlockEntry(0)]))
      : '',
    shedBlockPlan:
      (draft.shedBlockPlan ?? []).length > 0
        ? cloneShedBlockPlan(draft.shedBlockPlan ?? [])
        : [createShedBlockEntry(0)],
    shedUnitCount: enabledStructures.includes('commercial') && enabledCommercialSpaceTypes.includes('shed')
      ? String(countShedUnits((draft.shedBlockPlan ?? []).length > 0 ? (draft.shedBlockPlan ?? []) : [createShedBlockEntry(0)]))
      : '',
    officeFloorPlan:
      (draft.officeFloorPlan ?? []).length > 0
        ? cloneOfficeFloorPlan(draft.officeFloorPlan ?? [])
        : [createOfficeFloorEntry(0)],
    totalUnits: getDerivedTotalUnits(normalizedDraft),
  };
}

function toggleAmenity(draft: SocietySetupDraft, amenityName: string): SocietySetupDraft {
  const alreadySelected = draft.selectedAmenities.includes(amenityName);

  return {
    ...draft,
    selectedAmenities: alreadySelected
      ? draft.selectedAmenities.filter((item) => item !== amenityName)
      : [...draft.selectedAmenities, amenityName],
  };
}

function toggleStructureSelection(draft: SocietySetupDraft, structure: SocietyStructureOption): SocietySetupDraft {
  const enabledStructures = hasStructureSelected(draft, structure)
    ? getEnabledStructures(draft).filter((item) => item !== structure)
    : [...getEnabledStructures(draft), structure];

  return syncDerivedFields({
    ...draft,
    enabledStructures,
    enabledCommercialSpaceTypes: enabledStructures.includes('commercial')
      ? draft.enabledCommercialSpaceTypes
      : [],
  });
}

function toggleCommercialSpaceTypeSelection(
  draft: SocietySetupDraft,
  commercialSpaceType: CommercialSpaceType,
): SocietySetupDraft {
  const enabledCommercialSpaceTypes = hasCommercialSpaceTypeSelected(draft, commercialSpaceType)
    ? getEnabledCommercialSpaceTypes(draft).filter((item) => item !== commercialSpaceType)
    : [...getEnabledCommercialSpaceTypes(draft), commercialSpaceType];

  return syncDerivedFields({
    ...draft,
    enabledCommercialSpaceTypes,
  });
}

function getSelectionLabel(draft: SocietySetupDraft) {
  const enabledStructures = getEnabledStructures(draft);
  const enabledCommercialSpaceTypes = getEnabledCommercialSpaceTypes(draft);

  if (enabledStructures.length > 1) {
    return 'unit or space number';
  }

  if (enabledStructures[0] === 'commercial') {
    if (enabledCommercialSpaceTypes.length > 1) {
      return 'unit or space number';
    }

    return enabledCommercialSpaceTypes[0] === 'office' ? 'office space number' : 'shed number';
  }

  return enabledStructures[0] === 'bungalow' ? 'plot number' : 'home number';
}

function getUnitsSectionDescription(draft: SocietySetupDraft) {
  if (getEnabledStructures(draft).includes('apartment')) {
    return 'Apartment totals are calculated from the block, tower, floor, homes-per-floor, and flat-numbering plan you configure here.';
  }

  const enabledCommercialSpaceTypes = getEnabledCommercialSpaceTypes(draft);

  if (enabledCommercialSpaceTypes.includes('office')) {
    return 'Office totals are calculated from the commercial tower/block and floor-wise office allocations you configure above.';
  }

  if (enabledCommercialSpaceTypes.includes('shed')) {
    return 'Shed totals are calculated from the block-wise shed allocations you configure here.';
  }

  return 'Set the count for each structure type this society manages. Total inventory is calculated automatically.';
}

function getStepTone(isReady: boolean, isActive: boolean): 'success' | 'accent' | 'neutral' {
  if (isReady) {
    return 'success';
  }

  if (isActive) {
    return 'accent';
  }

  return 'neutral';
}

export function SocietySetupWizardScreen() {
  const { state, actions } = useApp();
  const { width } = useWindowDimensions();
  const isCreatorApp = isCreatorAppVariant();
  const isCompact = width < 768;
  const isPhone = width < 420;
  const [draft, setDraft] = useState(() => syncDerivedFields(cloneDraft(state.defaultSetupDraft)));

  function updateDraft(patch: Partial<SocietySetupDraft>) {
    setDraft((currentDraft) =>
      syncDerivedFields({
        ...currentDraft,
        ...patch,
        apartmentBlockPlan:
          patch.apartmentBlockPlan !== undefined
            ? cloneApartmentBlockPlan(patch.apartmentBlockPlan)
            : (currentDraft.apartmentBlockPlan ?? [createApartmentBlockEntry(0)]),
        shedBlockPlan:
          patch.shedBlockPlan !== undefined
            ? cloneShedBlockPlan(patch.shedBlockPlan)
            : (currentDraft.shedBlockPlan ?? [createShedBlockEntry(0)]),
        officeFloorPlan:
          patch.officeFloorPlan !== undefined
            ? cloneOfficeFloorPlan(patch.officeFloorPlan)
            : (currentDraft.officeFloorPlan ?? [createOfficeFloorEntry(0)]),
      }),
    );
  }

  function updateApartmentBlock(index: number, patch: Partial<ApartmentBlockPlanEntry>) {
    setDraft((currentDraft) =>
      syncDerivedFields({
        ...currentDraft,
        apartmentBlockPlan: (currentDraft.apartmentBlockPlan ?? [createApartmentBlockEntry(0)]).map((block, blockIndex) =>
          blockIndex === index ? { ...block, ...patch } : block,
        ),
      }),
    );
  }

  function addApartmentBlock() {
    setDraft((currentDraft) =>
      syncDerivedFields({
        ...currentDraft,
        apartmentBlockPlan: [
          ...(currentDraft.apartmentBlockPlan ?? [createApartmentBlockEntry(0)]),
          createApartmentBlockEntry((currentDraft.apartmentBlockPlan ?? [createApartmentBlockEntry(0)]).length),
        ],
      }),
    );
  }

  function removeApartmentBlock(index: number) {
    setDraft((currentDraft) => {
      const nextBlockPlan = (currentDraft.apartmentBlockPlan ?? [createApartmentBlockEntry(0)]).filter((_, blockIndex) => blockIndex !== index);

      return syncDerivedFields({
        ...currentDraft,
        apartmentBlockPlan: nextBlockPlan.length > 0 ? nextBlockPlan : [createApartmentBlockEntry(0)],
      });
    });
  }

  function updateOfficeFloor(index: number, patch: Partial<OfficeFloorPlanEntry>) {
    setDraft((currentDraft) =>
      syncDerivedFields({
        ...currentDraft,
        officeFloorPlan: (currentDraft.officeFloorPlan ?? [createOfficeFloorEntry(0)]).map((floor, floorIndex) =>
          floorIndex === index ? { ...floor, ...patch } : floor,
        ),
      }),
    );
  }

  function updateShedBlock(index: number, patch: Partial<ShedBlockPlanEntry>) {
    setDraft((currentDraft) =>
      syncDerivedFields({
        ...currentDraft,
        shedBlockPlan: (currentDraft.shedBlockPlan ?? [createShedBlockEntry(0)]).map((block, blockIndex) =>
          blockIndex === index ? { ...block, ...patch } : block,
        ),
      }),
    );
  }

  function addShedBlock() {
    setDraft((currentDraft) =>
      syncDerivedFields({
        ...currentDraft,
        shedBlockPlan: [
          ...(currentDraft.shedBlockPlan ?? [createShedBlockEntry(0)]),
          createShedBlockEntry((currentDraft.shedBlockPlan ?? [createShedBlockEntry(0)]).length),
        ],
      }),
    );
  }

  function removeShedBlock(index: number) {
    setDraft((currentDraft) => {
      const nextShedBlockPlan = (currentDraft.shedBlockPlan ?? [createShedBlockEntry(0)]).filter((_, blockIndex) => blockIndex !== index);

      return syncDerivedFields({
        ...currentDraft,
        shedBlockPlan: nextShedBlockPlan.length > 0 ? nextShedBlockPlan : [createShedBlockEntry(0)],
      });
    });
  }

  function addOfficeFloor() {
    setDraft((currentDraft) =>
      {
        const currentFloorPlan = currentDraft.officeFloorPlan ?? [createOfficeFloorEntry(0)];
        const lastConfiguredFloor = currentFloorPlan[currentFloorPlan.length - 1];
        const blockName = String(lastConfiguredFloor?.blockName ?? '').trim() || getTowerLabel(0);
        const nextFloorIndex = getOfficeFloorsForBlock(currentFloorPlan, blockName).length;

        return syncDerivedFields({
          ...currentDraft,
          officeFloorPlan: [
            ...currentFloorPlan,
            createOfficeFloorEntry(nextFloorIndex, blockName),
          ],
        });
      },
    );
  }

  function addOfficeBlock() {
    setDraft((currentDraft) => {
      const currentFloorPlan = currentDraft.officeFloorPlan ?? [createOfficeFloorEntry(0)];
      const nextBlockName = getNextOfficeBlockName(currentFloorPlan);

      return syncDerivedFields({
        ...currentDraft,
        officeFloorPlan: [
          ...currentFloorPlan,
          createOfficeFloorEntry(0, nextBlockName),
        ],
      });
    });
  }

  function removeOfficeFloor(index: number) {
    setDraft((currentDraft) => {
      const nextFloorPlan = (currentDraft.officeFloorPlan ?? [createOfficeFloorEntry(0)]).filter((_, floorIndex) => floorIndex !== index);

      return syncDerivedFields({
        ...currentDraft,
        officeFloorPlan: nextFloorPlan.length > 0 ? nextFloorPlan : [createOfficeFloorEntry(0)],
      });
    });
  }

  const enabledStructures = getEnabledStructures(draft);
  const enabledCommercialSpaceTypes = getEnabledCommercialSpaceTypes(draft);
  const apartmentBlockPlan = draft.apartmentBlockPlan ?? [createApartmentBlockEntry(0)];
  const shedBlockPlan = draft.shedBlockPlan ?? [createShedBlockEntry(0)];
  const officeFloorPlan = draft.officeFloorPlan ?? [createOfficeFloorEntry(0)];
  const apartmentUnitCount = countApartmentUnits(apartmentBlockPlan);
  const apartmentStartingFloorNumber = normalizeApartmentStartingFloorNumber(
    draft.apartmentStartingFloorNumber,
  );
  const bungalowUnitCount = parseWholeNumber(draft.bungalowUnitCount);
  const shedUnitCount = countShedUnits(shedBlockPlan);
  const totalUnits = Number.parseInt(draft.totalUnits, 10);
  const totalUnitsValid = Number.isFinite(totalUnits) && totalUnits > 0;
  const normalizedApartmentBlocks = normalizeApartmentBlockPlan(apartmentBlockPlan);
  const normalizedShedBlocks = normalizeShedBlockPlan(shedBlockPlan);
  const apartmentTowerCount = normalizedApartmentBlocks.reduce((total, block) => total + block.towerCount, 0);
  const primaryApartmentBlock = normalizedApartmentBlocks.find(
    (block) => block.towerCount > 0 && block.floorsPerTower > 0 && block.homesPerFloor > 0,
  );
  const apartmentNumberingPreviewStart = primaryApartmentBlock
    ? (
      primaryApartmentBlock.towerCount === 1
        ? `${primaryApartmentBlock.blockName}-${formatApartmentUnitNumber(apartmentStartingFloorNumber, 1)}`
        : `${primaryApartmentBlock.blockName}-T1-${formatApartmentUnitNumber(apartmentStartingFloorNumber, 1)}`
    )
    : '';
  const apartmentNumberingPreviewEnd = primaryApartmentBlock
    ? (
      primaryApartmentBlock.towerCount === 1
        ? `${primaryApartmentBlock.blockName}-${formatApartmentUnitNumber(apartmentStartingFloorNumber + primaryApartmentBlock.floorsPerTower - 1, primaryApartmentBlock.homesPerFloor)}`
        : `${primaryApartmentBlock.blockName}-T1-${formatApartmentUnitNumber(apartmentStartingFloorNumber + primaryApartmentBlock.floorsPerTower - 1, primaryApartmentBlock.homesPerFloor)}`
    )
    : '';
  const normalizedOfficeFloors = normalizeOfficeFloorPlan(officeFloorPlan);
  const duplicateOfficeCodes = findDuplicateOfficeCodes(officeFloorPlan);
  const officeBlockCount = new Set(normalizedOfficeFloors.map((floor) => floor.blockName.toLowerCase())).size;
  const amenitySections = amenityCategorySections
    .map((section) => ({
      ...section,
      amenities: section.amenities.filter((amenityName) => state.amenityLibrary.includes(amenityName)),
    }))
    .filter((section) => section.amenities.length > 0);
  const categorizedAmenityNames = new Set<string>(
    amenitySections.flatMap((section) => [...section.amenities]),
  );
  const uncategorizedAmenities = state.amenityLibrary.filter((amenityName) => !categorizedAmenityNames.has(amenityName));
  const validationIssues: string[] = [];

  if (draft.societyName.trim().length <= 2) {
    validationIssues.push('Enter a society name with at least 3 characters.');
  }

  if (draft.country.trim().length <= 1) {
    validationIssues.push('Enter the country.');
  }

  if (draft.state.trim().length <= 1) {
    validationIssues.push('Enter the state.');
  }

  if (draft.city.trim().length <= 1) {
    validationIssues.push('Enter the city.');
  }

  if (draft.area.trim().length <= 1) {
    validationIssues.push('Enter the area.');
  }

  if (draft.address.trim().length <= 4) {
    validationIssues.push('Enter the full address.');
  }

  if (enabledStructures.length === 0) {
    validationIssues.push('Select at least one society structure.');
  }

  if (enabledStructures.includes('apartment') && apartmentUnitCount < 1) {
    validationIssues.push('Add at least one apartment or tower home.');
  }

  if (enabledStructures.includes('apartment')) {
    const invalidApartmentBlocks = normalizedApartmentBlocks
      .filter((block) => block.towerCount < 1 || block.floorsPerTower < 1 || block.homesPerFloor < 1)
      .map((block) => block.blockName);

    if (invalidApartmentBlocks.length > 0) {
      validationIssues.push(
        `Enter valid tower count, floors per tower, and homes per floor for: ${invalidApartmentBlocks.join(', ')}.`,
      );
    }

    if (parseWholeNumber(draft.apartmentStartingFloorNumber) < 1) {
      validationIssues.push('Enter a valid first apartment floor number greater than 0.');
    }
  }

  if (enabledStructures.includes('bungalow') && bungalowUnitCount < 1) {
    validationIssues.push('Add at least one bungalow or plot.');
  }

  if (enabledStructures.includes('commercial') && enabledCommercialSpaceTypes.length === 0) {
    validationIssues.push('Choose at least one commercial space type.');
  }

  if (enabledCommercialSpaceTypes.includes('shed') && shedUnitCount < 1) {
    validationIssues.push('Add at least one shed when commercial sheds are enabled.');
  }

  if (enabledCommercialSpaceTypes.includes('shed')) {
    const invalidShedBlocks = normalizedShedBlocks
      .filter((block) => block.shedCount < 1)
      .map((block) => block.blockName);

    if (invalidShedBlocks.length > 0) {
      validationIssues.push(`Enter at least one shed for: ${invalidShedBlocks.join(', ')}.`);
    }
  }

  if (!totalUnitsValid) {
    validationIssues.push('Add at least one unit or commercial space.');
  }

  if (enabledCommercialSpaceTypes.includes('office')) {
    const emptyOfficeFloors = officeFloorPlan
      .map((floor, index) => ({
        label: getOfficeFloorDescriptor(floor, index),
        officeNumbers: floor.officeNumbers.trim(),
      }))
      .filter((floor) => floor.officeNumbers.length === 0)
      .map((floor) => floor.label);

    if (emptyOfficeFloors.length > 0) {
      validationIssues.push(
        `Add office numbers for: ${emptyOfficeFloors.join(', ')}.`,
      );
    }

    const invalidOfficeFloors = normalizedOfficeFloors
      .map((floor, index) => ({
        label: getOfficeFloorDescriptor(officeFloorPlan[index] ?? { blockName: floor.blockName, floorLabel: floor.floorLabel, officeNumbers: '' }, index),
        rawValue: officeFloorPlan[index]?.officeNumbers.trim() ?? '',
        officeCount: floor.officeCodes.length,
      }))
      .filter((floor) => floor.rawValue.length > 0 && floor.officeCount === 0)
      .map((floor) => floor.label);

    if (invalidOfficeFloors.length > 0) {
      validationIssues.push(
        `Check the office numbering format for: ${invalidOfficeFloors.join(', ')}.`,
      );
    }

    if (duplicateOfficeCodes.length > 0) {
      validationIssues.push(
        `Duplicate office numbers found: ${duplicateOfficeCodes.join(', ')}. Repeated office numbers are only allowed across different commercial towers when the tower name is different.`,
      );
    }
  }

  const canCreate = !state.isSyncing && validationIssues.length === 0;
  const locationReady =
    draft.societyName.trim().length > 2
    && draft.country.trim().length > 1
    && draft.state.trim().length > 1
    && draft.city.trim().length > 1
    && draft.area.trim().length > 1
    && draft.address.trim().length > 4;
  const structureReady =
    enabledStructures.length > 0
    && (!enabledStructures.includes('commercial') || enabledCommercialSpaceTypes.length > 0);
  const inventoryReady = totalUnitsValid;
  const operationsReady = draft.selectedAmenities.length > 0 && draft.rulesSummary.trim().length > 12;
  const completedStepCount = [locationReady, structureReady, inventoryReady, operationsReady].filter(Boolean).length;
  const readinessLabel = canCreate ? 'Ready to launch' : `${validationIssues.length} items pending`;
  const progressSteps = [
    {
      key: 'identity',
      eyebrow: '01',
      title: 'Identity',
      description: 'Name, address, and discoverability details.',
      ready: locationReady,
      active: !locationReady,
    },
    {
      key: 'blueprint',
      eyebrow: '02',
      title: 'Blueprint',
      description: 'Residential and commercial structure mix.',
      ready: structureReady,
      active: locationReady && !structureReady,
    },
    {
      key: 'inventory',
      eyebrow: '03',
      title: 'Inventory',
      description: 'Unit math, numbering logic, and maintenance setup.',
      ready: inventoryReady,
      active: locationReady && structureReady && !inventoryReady,
    },
    {
      key: 'operations',
      eyebrow: '04',
      title: 'Operations',
      description: 'Amenities, starter rules, and launch review.',
      ready: operationsReady,
      active: locationReady && structureReady && inventoryReady && !operationsReady,
    },
  ];

  return (
    <Page>
      <SurfaceCard style={[styles.setupHeroCard, isCompact ? styles.setupHeroCardCompact : null]}>
        <View style={[styles.setupHeroTop, isCompact ? styles.setupHeroTopCompact : null]}>
          <View style={styles.setupHeroCopy}>
            <Pill label="Create Society Portal" tone="accent" />
            <Text
              style={[
                styles.setupHeroTitle,
                isCompact ? styles.setupHeroTitleCompact : null,
                isPhone ? styles.setupHeroTitlePhone : null,
              ]}
            >
              {isPhone
                ? 'Create a society with a clean phone-first setup.'
                : 'Create a new society workspace with the same cleaner, simpler first-impression design.'}
            </Text>
            <Caption style={styles.setupHeroDescription}>
              Start with identity and location, then move through structure, unit math, amenities, and launch checks without the oversized desktop-style header.
            </Caption>
          </View>

          <View style={[styles.setupHeroAside, isPhone ? styles.setupHeroAsidePhone : null]}>
            <View style={styles.setupHeroStatusCard}>
              <Text style={styles.setupHeroStatusValue}>{completedStepCount}/4</Text>
              <Caption style={styles.setupHeroStatusLabel}>stages ready</Caption>
            </View>
            <ActionButton
              label={
                isCreatorApp
                  ? 'Lock creator app'
                  : state.onboarding?.membershipsCount
                    ? 'Back to workspaces'
                    : 'Back to portal selection'
              }
              onPress={actions.cancelSetup}
              variant="secondary"
            />
          </View>
        </View>

        <View style={[styles.heroPillRow, isCompact ? styles.heroPillRowCompact : null]}>
          <Pill label={readinessLabel} tone={canCreate ? 'success' : 'warning'} />
          <Pill label={`${draft.totalUnits || '0'} planned units`} tone="primary" />
          <Pill label={`${draft.selectedAmenities.length} amenities`} tone="accent" />
          <Pill label={draft.city && draft.area ? `${draft.city} / ${draft.area}` : 'Location pending'} tone="warning" />
        </View>
        <View style={[styles.heroMetricRow, isCompact ? styles.heroMetricRowCompact : null]}>
          <View style={[styles.heroMetricCard, isCompact ? styles.heroMetricCardCompact : null]}>
            <Text style={styles.heroMetricValue}>{completedStepCount}/4</Text>
            <Caption style={styles.heroMetricLabel}>setup stages ready</Caption>
          </View>
          <View style={[styles.heroMetricCard, isCompact ? styles.heroMetricCardCompact : null]}>
            <Text style={styles.heroMetricValue}>{getSocietyStructurePreviewLabel(draft)}</Text>
            <Caption style={styles.heroMetricLabel}>workspace model</Caption>
          </View>
          <View style={[styles.heroMetricCard, isCompact ? styles.heroMetricCardCompact : null]}>
            <Text style={styles.heroMetricValue}>{draft.maintenanceDay || '--'}</Text>
            <Caption style={styles.heroMetricLabel}>maintenance due day</Caption>
          </View>
        </View>
      </SurfaceCard>

      <SurfaceCard style={[styles.flowOverviewCard, isPhone ? styles.flowOverviewCardPhone : null]}>
        <View style={[styles.flowOverviewHeader, isCompact ? styles.flowOverviewHeaderCompact : null]}>
          <View style={styles.flowOverviewCopy}>
            <Text style={styles.flowOverviewTitle}>Creation flow overview</Text>
            <Caption>
              Define the society, shape the inventory, add operating context, then review launch readiness in one pass.
            </Caption>
          </View>
          <View style={[styles.flowOverviewBadge, isPhone ? styles.flowOverviewBadgePhone : null]}>
            <Text style={styles.flowOverviewBadgeValue}>{canCreate ? 'Go live' : 'In progress'}</Text>
            <Caption style={styles.flowOverviewBadgeLabel}>workspace status</Caption>
          </View>
        </View>
        <View style={[styles.flowStepGrid, isCompact ? styles.flowStepGridCompact : null]}>
          {progressSteps.map((step) => (
            <View
              key={step.key}
              style={[
                styles.flowStepCard,
                isCompact ? styles.flowStepCardCompact : null,
                isPhone ? styles.flowStepCardPhone : null,
              ]}
            >
              <Pill label={step.ready ? `${step.eyebrow} complete` : `${step.eyebrow} active`} tone={getStepTone(step.ready, step.active)} />
              <Text style={styles.flowStepTitle}>{step.title}</Text>
              <Caption>{step.description}</Caption>
            </View>
          ))}
        </View>
      </SurfaceCard>

      <SurfaceCard style={styles.sectionCardWarm}>
        <View style={styles.sectionLeadRow}>
          <Pill label="Step 1" tone="warning" />
          <Pill label="Discovery data" tone="primary" />
        </View>
        <SectionHeader title="1. Society identity and location" />
        <InputField
          label="Society name"
          value={draft.societyName}
          onChangeText={(value) => updateDraft({ societyName: value })}
          placeholder="Green Valley Residency"
        />
        <View style={styles.twoColumn}>
          <View style={styles.column}>
            <InputField
              label="Country"
              value={draft.country}
              onChangeText={(value) => updateDraft({ country: value })}
              placeholder="India"
              autoCapitalize="words"
            />
          </View>
          <View style={styles.column}>
            <InputField
              label="State"
              value={draft.state}
              onChangeText={(value) => updateDraft({ state: value })}
              placeholder="Gujarat"
              autoCapitalize="words"
            />
          </View>
        </View>
        <View style={styles.twoColumn}>
          <View style={styles.column}>
            <InputField
              label="City"
              value={draft.city}
              onChangeText={(value) => updateDraft({ city: value })}
              placeholder="Ahmedabad"
              autoCapitalize="words"
            />
          </View>
          <View style={styles.column}>
            <InputField
              label="Area"
              value={draft.area}
              onChangeText={(value) => updateDraft({ area: value })}
              placeholder="Prahladnagar"
              autoCapitalize="words"
            />
          </View>
        </View>
        <InputField
          label="Address"
          value={draft.address}
          onChangeText={(value) => updateDraft({ address: value })}
          placeholder="Street, landmark, pin code"
        />
      </SurfaceCard>

      <SurfaceCard style={styles.sectionCardCool}>
        <View style={styles.sectionLeadRow}>
          <Pill label="Step 2" tone="warning" />
          <Pill label="Structure design" tone="accent" />
        </View>
        <SectionHeader
          title="2. Society structure"
          description="Select every structure this society manages. Mixed-use builders can enable apartments, bungalows, and commercial spaces together."
        />
        <View style={styles.choiceWrap}>
          <ChoiceChip
            label="Apartment / tower model"
            selected={enabledStructures.includes('apartment')}
            onPress={() =>
              setDraft((currentDraft) => toggleStructureSelection(currentDraft, 'apartment'))
            }
          />
          <ChoiceChip
            label="Bungalow / plot model"
            selected={enabledStructures.includes('bungalow')}
            onPress={() =>
              setDraft((currentDraft) => toggleStructureSelection(currentDraft, 'bungalow'))
            }
          />
          <ChoiceChip
            label="Commercial complex"
            selected={enabledStructures.includes('commercial')}
            onPress={() =>
              setDraft((currentDraft) => toggleStructureSelection(currentDraft, 'commercial'))
            }
          />
        </View>

        {enabledStructures.includes('apartment') ? (
          <View style={styles.structurePanel}>
            <SectionHeader
              title="Apartment subtype"
              description="Block layout lets you define multiple blocks, multiple towers inside each block, and the floor count for every tower."
            />
            <View style={styles.choiceWrap}>
              <ChoiceChip
                label="Block layout"
                selected
                onPress={() => updateDraft({ apartmentSubtype: 'block' })}
              />
            </View>
            <Caption>
              Use the units section below to add each block with tower count, floors per tower, and homes on each floor.
            </Caption>
          </View>
        ) : null}

        {enabledStructures.includes('commercial') ? (
          <View style={styles.structurePanel}>
            <SectionHeader
              title="Commercial space type"
              description="Choose one or both if this society includes sheds and office spaces in the same workspace."
            />
            <View style={styles.choiceWrap}>
              <ChoiceChip
                label="Shed"
                selected={enabledCommercialSpaceTypes.includes('shed')}
                onPress={() =>
                  setDraft((currentDraft) =>
                    toggleCommercialSpaceTypeSelection(currentDraft, 'shed'),
                  )
                }
              />
              <ChoiceChip
                label="Office space"
                selected={enabledCommercialSpaceTypes.includes('office')}
                onPress={() =>
                  setDraft((currentDraft) =>
                    toggleCommercialSpaceTypeSelection(currentDraft, 'office'),
                  )
                }
              />
            </View>

            {enabledCommercialSpaceTypes.includes('office') ? (
              <>
                <Caption>
                  Add each commercial tower or block, then list its floors separately with the exact
                  office numbers or ranges the society uses. When multiple towers are configured,
                  generated office numbers will include the tower name so repeated numbers like
                  `101` can exist in both towers.
                </Caption>

                {officeFloorPlan.map((floor, index) => {
                  const officeCount = expandOfficeNumbersInput(floor.officeNumbers).length;

                  return (
                    <View key={`commercial-floor-${index}`} style={styles.floorPlanCard}>
                      <View style={styles.floorPlanHeader}>
                        <Text style={styles.floorPlanTitle}>Commercial floor setup {index + 1}</Text>
                        {officeFloorPlan.length > 1 ? (
                          <ActionButton
                            label="Remove floor"
                            onPress={() => removeOfficeFloor(index)}
                            variant="secondary"
                          />
                        ) : null}
                      </View>

                      <InputField
                        label="Block / tower name"
                        value={floor.blockName ?? ''}
                        onChangeText={(value) => updateOfficeFloor(index, { blockName: value })}
                        placeholder="Tower A"
                      />

                      <InputField
                        label="Floor name"
                        value={floor.floorLabel}
                        onChangeText={(value) => updateOfficeFloor(index, { floorLabel: value })}
                        placeholder={index === 0 ? 'Ground Floor' : `Floor ${index + 1}`}
                      />

                      <InputField
                        label="Office numbers or ranges"
                        value={floor.officeNumbers}
                        onChangeText={(value) => updateOfficeFloor(index, { officeNumbers: value })}
                        multiline
                        placeholder="101-108, 110, 112A"
                      />

                      <View style={styles.previewRow}>
                        <Pill label={`${officeCount} offices`} tone="accent" />
                        <Pill label={String(floor.blockName ?? '').trim() || 'Commercial Tower'} tone="primary" />
                        <Pill label={floor.floorLabel.trim() || `Floor ${index + 1}`} tone="warning" />
                      </View>
                    </View>
                  );
                })}

                <View style={styles.officeActions}>
                  <ActionButton label="Add another floor" onPress={addOfficeFloor} variant="secondary" />
                  <ActionButton label="Add another tower" onPress={addOfficeBlock} variant="secondary" />
                </View>

                <Caption>
                  Examples: `101-108`, `201, 203, 205A`, `A-01, A-02, A-03`. Use commas, line
                  breaks, or numeric ranges.
                </Caption>

                {duplicateOfficeCodes.length > 0 ? (
                  <Text style={styles.validationError}>
                    Duplicate office numbers found: {duplicateOfficeCodes.join(', ')}. Repeat the
                    office number only when it belongs to a different tower or block.
                  </Text>
                ) : null}

                <View style={styles.previewRow}>
                  <Pill
                    label={`${countOfficeUnits(officeFloorPlan) || 0} office spaces`}
                    tone="accent"
                  />
                  <Pill label={`${officeBlockCount} configured tower${officeBlockCount === 1 ? '' : 's'}`} tone="primary" />
                  <Pill label={`${officeFloorPlan.length} configured floors`} tone="warning" />
                </View>
              </>
            ) : null}

            {enabledCommercialSpaceTypes.includes('shed') ? (
              <Caption>
                Configure each shed block separately so the created shed numbers stay grouped under
                the correct commercial block or tower.
              </Caption>
            ) : null}
          </View>
        ) : null}
      </SurfaceCard>

      <SurfaceCard style={styles.sectionCardNeutral}>
        <View style={styles.sectionLeadRow}>
          <Pill label="Step 3" tone="warning" />
          <Pill label="Inventory and billing" tone="primary" />
        </View>
        <SectionHeader
          title="3. Units and maintenance"
          description={getUnitsSectionDescription(draft)}
        />

        {enabledStructures.includes('apartment') ? (
          <View style={styles.structurePanel}>
            <SectionHeader
              title="Apartment block planner"
              description="Add every block with the number of towers, floors in each tower, homes on each floor, and the floor number used in flat codes."
            />
            <InputField
              label="First apartment floor number"
              value={draft.apartmentStartingFloorNumber}
              onChangeText={(value) => updateDraft({ apartmentStartingFloorNumber: sanitizeNumber(value) })}
              keyboardType="numeric"
              placeholder="1"
            />
            <Caption>
              Enter `1` for flat numbers like `101, 102, 1704`. Enter `11` if the first configured
              floor should start like `1101, 1102, 1104`.
            </Caption>
            {apartmentNumberingPreviewStart && apartmentNumberingPreviewEnd ? (
              <View style={styles.previewRow}>
                <Pill label={`Starts from floor ${apartmentStartingFloorNumber}`} tone="warning" />
                <Pill label={`Sample start ${apartmentNumberingPreviewStart}`} tone="primary" />
                <Pill label={`Sample top ${apartmentNumberingPreviewEnd}`} tone="accent" />
              </View>
            ) : null}
            {apartmentBlockPlan.map((block, index) => {
              const normalizedBlock = normalizedApartmentBlocks[index];
              const blockUnitCount =
                (normalizedBlock?.towerCount ?? 0)
                * (normalizedBlock?.floorsPerTower ?? 0)
                * (normalizedBlock?.homesPerFloor ?? 0);

              return (
                <View key={`apartment-block-${index}`} style={styles.floorPlanCard}>
                  <View style={styles.floorPlanHeader}>
                    <Text style={styles.floorPlanTitle}>Block setup {index + 1}</Text>
                    {apartmentBlockPlan.length > 1 ? (
                      <ActionButton
                        label="Remove block"
                        onPress={() => removeApartmentBlock(index)}
                        variant="secondary"
                      />
                    ) : null}
                  </View>

                  <InputField
                    label="Block name"
                    value={block.blockName}
                    onChangeText={(value) => updateApartmentBlock(index, { blockName: value })}
                    placeholder={`Block ${String.fromCharCode(65 + index)}`}
                  />

                  <View style={styles.twoColumn}>
                    <View style={styles.column}>
                      <InputField
                        label="Towers in this block"
                        value={block.towerCount}
                        onChangeText={(value) => updateApartmentBlock(index, { towerCount: sanitizeNumber(value) })}
                        keyboardType="numeric"
                        placeholder="2"
                      />
                    </View>
                    <View style={styles.column}>
                      <InputField
                        label="Floors per tower"
                        value={block.floorsPerTower}
                        onChangeText={(value) => updateApartmentBlock(index, { floorsPerTower: sanitizeNumber(value) })}
                        keyboardType="numeric"
                        placeholder="6"
                      />
                    </View>
                  </View>

                  <InputField
                    label="Homes on each floor"
                    value={block.homesPerFloor}
                    onChangeText={(value) => updateApartmentBlock(index, { homesPerFloor: sanitizeNumber(value) })}
                    keyboardType="numeric"
                    placeholder="4"
                  />

                  <View style={styles.previewRow}>
                    <Pill label={`${normalizedBlock?.towerCount ?? 0} towers`} tone="primary" />
                    <Pill label={`${normalizedBlock?.floorsPerTower ?? 0} floors per tower`} tone="warning" />
                    <Pill label={`${blockUnitCount} homes`} tone="accent" />
                  </View>
                </View>
              );
            })}

            <View style={styles.officeActions}>
              <ActionButton label="Add another block" onPress={addApartmentBlock} variant="secondary" />
            </View>

            <View style={styles.previewRow}>
              <Pill label={`${apartmentBlockPlan.length} blocks`} tone="primary" />
              <Pill label={`${apartmentTowerCount} towers`} tone="warning" />
              <Pill label={`${apartmentUnitCount} apartment homes`} tone="accent" />
            </View>
          </View>
        ) : null}

        {enabledStructures.includes('bungalow') ? (
          <InputField
            label="Bungalow / plot homes"
            value={draft.bungalowUnitCount}
            onChangeText={(value) => updateDraft({ bungalowUnitCount: sanitizeNumber(value) })}
            keyboardType="numeric"
            placeholder="12"
          />
        ) : null}

        {enabledCommercialSpaceTypes.includes('shed') ? (
          <View style={styles.structurePanel}>
            <SectionHeader
              title="Shed block planner"
              description="Add each commercial block and enter how many sheds belong to that block."
            />
            {shedBlockPlan.map((block, index) => {
              const normalizedBlock = normalizedShedBlocks[index];

              return (
                <View key={`shed-block-${index}`} style={styles.floorPlanCard}>
                  <View style={styles.floorPlanHeader}>
                    <Text style={styles.floorPlanTitle}>Shed block {index + 1}</Text>
                    {shedBlockPlan.length > 1 ? (
                      <ActionButton
                        label="Remove block"
                        onPress={() => removeShedBlock(index)}
                        variant="secondary"
                      />
                    ) : null}
                  </View>

                  <InputField
                    label="Block name"
                    value={block.blockName}
                    onChangeText={(value) => updateShedBlock(index, { blockName: value })}
                    placeholder={`Block ${String.fromCharCode(65 + index)}`}
                  />

                  <InputField
                    label="Sheds in this block"
                    value={block.shedCount}
                    onChangeText={(value) => updateShedBlock(index, { shedCount: sanitizeNumber(value) })}
                    keyboardType="numeric"
                    placeholder="8"
                  />

                  <View style={styles.previewRow}>
                    <Pill label={normalizedBlock?.blockName ?? `Block ${String.fromCharCode(65 + index)}`} tone="primary" />
                    <Pill label={`${normalizedBlock?.shedCount ?? 0} sheds`} tone="accent" />
                  </View>
                </View>
              );
            })}

            <View style={styles.officeActions}>
              <ActionButton label="Add another shed block" onPress={addShedBlock} variant="secondary" />
            </View>

            <View style={styles.previewRow}>
              <Pill label={`${shedBlockPlan.length} shed block${shedBlockPlan.length === 1 ? '' : 's'}`} tone="primary" />
              <Pill label={`${shedUnitCount} sheds`} tone="accent" />
            </View>
          </View>
        ) : null}

        {enabledCommercialSpaceTypes.includes('office') ? (
          <View style={styles.generatedSummary}>
            <Text style={styles.generatedValue}>{countOfficeUnits(officeFloorPlan) || 0} office spaces</Text>
            <Caption>
              Based on {officeBlockCount} commercial tower{officeBlockCount === 1 ? '' : 's'} and{' '}
              {officeFloorPlan.length} configured floor allocation{officeFloorPlan.length === 1 ? '' : 's'}.
            </Caption>
          </View>
        ) : null}

        <View style={styles.generatedSummary}>
          <Text style={styles.generatedValue}>{draft.totalUnits || '0'} total units and spaces</Text>
          <Caption>
            Inventory is calculated automatically from the structure mix and the per-type counts
            you configure here.
          </Caption>
        </View>

        <View style={styles.twoColumn}>
          <View style={styles.column}>
            <InputField
              label="Maintenance due day"
              value={draft.maintenanceDay}
              onChangeText={(value) => updateDraft({ maintenanceDay: sanitizeNumber(value) })}
              keyboardType="numeric"
              placeholder="10"
            />
          </View>
          <View style={styles.column}>
            <InputField
              label="Monthly maintenance amount (INR)"
              value={draft.maintenanceAmount}
              onChangeText={(value) => updateDraft({ maintenanceAmount: sanitizeNumber(value) })}
              keyboardType="numeric"
              placeholder="6500"
            />
          </View>
        </View>
      </SurfaceCard>

      <SurfaceCard style={styles.sectionCardCool}>
        <View style={styles.sectionLeadRow}>
          <Pill label="Step 4" tone="warning" />
          <Pill label="Amenities and access" tone="accent" />
        </View>
        <SectionHeader
          title="4. Common amenities"
          description="Pick the amenities you want the society to start with. The catalog is grouped to match how big metro projects usually organize social, sports, wellness, family, and pet/community spaces."
        />
        <View style={styles.previewRow}>
          <Pill label={`${draft.selectedAmenities.length} selected`} tone="accent" />
          <Pill label={`${state.amenityLibrary.length} available in catalog`} tone="primary" />
        </View>
        {amenitySections.map((section) => {
          const selectedCount = section.amenities.filter((amenityName) => draft.selectedAmenities.includes(amenityName)).length;

          return (
            <View key={section.key} style={styles.amenityCategoryCard}>
              <View style={styles.floorPlanHeader}>
                <View style={styles.categoryHeading}>
                  <Text style={styles.floorPlanTitle}>{section.title}</Text>
                  <Caption>{section.description}</Caption>
                </View>
                <Pill label={`${selectedCount}/${section.amenities.length} selected`} tone="warning" />
              </View>
              <View style={styles.choiceWrap}>
                {section.amenities.map((amenityName) => (
                  <ChoiceChip
                    key={amenityName}
                    label={amenityName}
                    selected={draft.selectedAmenities.includes(amenityName)}
                    onPress={() => setDraft((currentDraft) => toggleAmenity(currentDraft, amenityName))}
                  />
                ))}
              </View>
            </View>
          );
        })}
        {uncategorizedAmenities.length > 0 ? (
          <View style={styles.amenityCategoryCard}>
            <View style={styles.categoryHeading}>
              <Text style={styles.floorPlanTitle}>Other amenities</Text>
              <Caption>Additional facilities kept available in the catalog but not part of the main grouped sections above.</Caption>
            </View>
            <View style={styles.choiceWrap}>
              {uncategorizedAmenities.map((amenityName) => (
                <ChoiceChip
                  key={amenityName}
                  label={amenityName}
                  selected={draft.selectedAmenities.includes(amenityName)}
                  onPress={() => setDraft((currentDraft) => toggleAmenity(currentDraft, amenityName))}
                />
              ))}
            </View>
          </View>
        ) : null}
      </SurfaceCard>

      <SurfaceCard style={styles.sectionCardWarm}>
        <View style={styles.sectionLeadRow}>
          <Pill label="Step 5" tone="warning" />
          <Pill label="Governance setup" tone="primary" />
        </View>
        <SectionHeader title="5. Rules and operations" />
        <InputField
          label="Starter rules summary"
          value={draft.rulesSummary}
          onChangeText={(value) => updateDraft({ rulesSummary: value })}
          multiline
          placeholder="Write the first operational rules here"
        />
      </SurfaceCard>

      <SurfaceCard style={styles.launchReviewCard}>
        <View style={[styles.launchReviewHeader, isCompact ? styles.launchReviewHeaderCompact : null]}>
          <View style={styles.launchReviewCopy}>
            <Pill label="Launch review" tone="success" />
            <Text style={styles.launchReviewTitle}>Review the society before you create the workspace.</Text>
            <Caption>
              This final panel mirrors what the market-facing society will look like in search and onboarding. Verify discoverability, unit count, amenity mix, and operational basics before launch.
            </Caption>
          </View>
          <View style={styles.launchReviewStats}>
            <Text style={styles.launchReviewStatValue}>{validationIssues.length}</Text>
            <Caption style={styles.launchReviewStatLabel}>validation items</Caption>
          </View>
        </View>
        <SectionHeader
          title="Workspace preview"
          description="This starter setup will create a discoverable society workspace. The first local chairman can then claim it from the join portal for super user approval."
        />
        <View style={styles.previewRow}>
          <Pill label={`${draft.totalUnits || '0'} ${getSocietyUnitCollectionLabel(draft)}`} tone="primary" />
          <Pill label={getSocietyStructurePreviewLabel(draft)} tone="accent" />
          <Pill label={`${draft.city || 'City'} / ${draft.area || 'Area'}`} tone="warning" />
          <Pill label={`${draft.selectedAmenities.length} amenities`} tone="warning" />
        </View>
        <Caption>
          After creation, people will be able to find this society by country, state, city, and
          area before selecting their {getSelectionLabel(draft)}. Resident approvals begin after the first chairman is approved.
        </Caption>
        {validationIssues.length > 0 ? (
          <View style={styles.validationBox}>
            <Text style={styles.validationTitle}>Complete these items to enable creation:</Text>
            {validationIssues.map((issue) => (
              <Text key={issue} style={styles.validationItem}>
                - {issue}
              </Text>
            ))}
          </View>
        ) : null}
        <ActionButton
          label={state.isSyncing ? 'Creating workspace...' : 'Create society workspace'}
          onPress={() => actions.completeSetup(draft)}
          disabled={!canCreate}
        />
      </SurfaceCard>
    </Page>
  );
}

const styles = StyleSheet.create({
  setupHeroCard: {
    gap: spacing.lg,
    backgroundColor: '#FFF8F0',
  },
  setupHeroCardCompact: {
    gap: spacing.md,
  },
  setupHeroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  setupHeroTopCompact: {
    gap: spacing.sm,
  },
  setupHeroCopy: {
    flex: 1,
    minWidth: 220,
    gap: spacing.sm,
  },
  setupHeroTitle: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '800',
    color: palette.ink,
  },
  setupHeroTitleCompact: {
    fontSize: 28,
    lineHeight: 33,
  },
  setupHeroTitlePhone: {
    fontSize: 24,
    lineHeight: 29,
  },
  setupHeroDescription: {
    maxWidth: 720,
  },
  setupHeroAside: {
    minWidth: 160,
    gap: spacing.sm,
    alignItems: 'stretch',
  },
  setupHeroAsidePhone: {
    width: '100%',
    minWidth: 0,
  },
  setupHeroStatusCard: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#E7D9C8',
    backgroundColor: '#FFFDFC',
    gap: 2,
  },
  setupHeroStatusValue: {
    fontSize: 22,
    fontWeight: '900',
    color: palette.accent,
  },
  setupHeroStatusLabel: {
    color: palette.mutedInk,
  },
  heroActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  heroPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  heroPillRowCompact: {
    gap: spacing.xs,
  },
  heroMetricRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  heroMetricRowCompact: {
    gap: spacing.xs,
  },
  heroMetricCard: {
    flex: 1,
    minWidth: 160,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: '#FFFDFC',
    borderWidth: 1,
    borderColor: '#E8DACA',
    gap: 4,
    ...shadow.card,
  },
  heroMetricCardCompact: {
    minWidth: 0,
  },
  heroMetricValue: {
    fontSize: 20,
    fontWeight: '800',
    color: palette.ink,
  },
  heroMetricLabel: {
    color: palette.mutedInk,
  },
  flowOverviewCard: {
    gap: spacing.lg,
    backgroundColor: '#FFF8F1',
  },
  flowOverviewCardPhone: {
    gap: spacing.md,
  },
  flowOverviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  flowOverviewHeaderCompact: {
    gap: spacing.sm,
  },
  flowOverviewCopy: {
    flex: 1,
    minWidth: 220,
    gap: spacing.xs,
  },
  flowOverviewTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: palette.ink,
  },
  flowOverviewBadge: {
    minWidth: 140,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: '#F1D8CB',
    gap: 4,
  },
  flowOverviewBadgePhone: {
    width: '100%',
    minWidth: 0,
  },
  flowOverviewBadgeValue: {
    fontSize: 18,
    fontWeight: '800',
    color: palette.accent,
  },
  flowOverviewBadgeLabel: {
    color: palette.mutedInk,
  },
  flowStepGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  flowStepGridCompact: {
    gap: spacing.xs,
  },
  flowStepCard: {
    flex: 1,
    minWidth: 180,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: '#ECDCCF',
    gap: spacing.xs,
    ...shadow.card,
  },
  flowStepCardCompact: {
    minWidth: 0,
  },
  flowStepCardPhone: {
    width: '100%',
  },
  flowStepTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: palette.ink,
  },
  sectionLeadRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  sectionCardWarm: {
    backgroundColor: '#FFF8F0',
  },
  sectionCardCool: {
    backgroundColor: '#F8FBFF',
  },
  sectionCardNeutral: {
    backgroundColor: '#FFFCF8',
  },
  choiceWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  twoColumn: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  column: {
    flex: 1,
    minWidth: 140,
  },
  structurePanel: {
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: palette.surfaceMuted,
  },
  floorPlanCard: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.border,
  },
  floorPlanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  floorPlanTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: palette.ink,
  },
  officeActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  amenityCategoryCard: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: palette.surfaceMuted,
    borderWidth: 1,
    borderColor: palette.border,
  },
  categoryHeading: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 220,
  },
  generatedSummary: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: palette.surfaceMuted,
  },
  generatedValue: {
    fontSize: 22,
    fontWeight: '800',
    color: palette.primary,
  },
  launchReviewCard: {
    gap: spacing.lg,
    backgroundColor: '#FFF9F5',
  },
  launchReviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  launchReviewHeaderCompact: {
    gap: spacing.sm,
  },
  launchReviewCopy: {
    flex: 1,
    minWidth: 220,
    gap: spacing.sm,
  },
  launchReviewTitle: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
    color: palette.ink,
  },
  launchReviewStats: {
    minWidth: 132,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: '#EFD7C8',
    gap: 4,
  },
  launchReviewStatValue: {
    fontSize: 24,
    fontWeight: '800',
    color: palette.accent,
  },
  launchReviewStatLabel: {
    color: palette.mutedInk,
  },
  previewRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  validationError: {
    color: palette.accent,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },
  validationBox: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: '#FFF2EC',
    borderWidth: 1,
    borderColor: '#F0C1AE',
  },
  validationTitle: {
    color: palette.ink,
    fontSize: 14,
    fontWeight: '800',
  },
  validationItem: {
    color: palette.accent,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },
});
