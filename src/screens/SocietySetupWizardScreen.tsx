import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  ActionButton,
  Caption,
  ChoiceChip,
  HeroCard,
  InputField,
  Page,
  Pill,
  SectionHeader,
  SurfaceCard,
} from '../components/ui';
import {
  countOfficeUnits,
  expandOfficeNumbersInput,
  findDuplicateOfficeCodes,
  normalizeOfficeFloorPlan,
} from '../data/factories';
import { useApp } from '../state/AppContext';
import { palette, radius, spacing } from '../theme/tokens';
import {
  CommercialSpaceType,
  OfficeFloorPlanEntry,
  SocietySetupDraft,
  SocietyStructure,
  SocietyStructureOption,
} from '../types/domain';
import {
  getEnabledCommercialSpaceTypes,
  getEnabledStructures,
  getSocietyStructurePreviewLabel,
  getSocietyUnitCollectionLabel,
} from '../utils/selectors';

const structureOptions: SocietyStructureOption[] = ['apartment', 'bungalow', 'commercial'];
const commercialSpaceTypes: CommercialSpaceType[] = ['shed', 'office'];

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

function createOfficeFloorEntry(index: number): OfficeFloorPlanEntry {
  return {
    floorLabel: index === 0 ? 'Ground Floor' : `Floor ${index + 1}`,
    officeNumbers: '',
  };
}

function cloneDraft(draft: SocietySetupDraft): SocietySetupDraft {
  return {
    ...draft,
    officeFloorPlan:
      draft.officeFloorPlan.length > 0
        ? cloneOfficeFloorPlan(draft.officeFloorPlan)
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
    ? parseWholeNumber(draft.apartmentUnitCount)
    : 0;
  const bungalowUnitCount = enabledStructures.includes('bungalow')
    ? parseWholeNumber(draft.bungalowUnitCount)
    : 0;
  const shedUnitCount =
    enabledStructures.includes('commercial') && enabledCommercialSpaceTypes.includes('shed')
      ? parseWholeNumber(draft.shedUnitCount)
      : 0;
  const officeUnitCount =
    enabledStructures.includes('commercial') && enabledCommercialSpaceTypes.includes('office')
      ? countOfficeUnits(draft.officeFloorPlan)
      : 0;
  const totalUnits = apartmentUnitCount + bungalowUnitCount + shedUnitCount + officeUnitCount;

  return totalUnits > 0 ? String(totalUnits) : '';
}

function syncDerivedFields(draft: SocietySetupDraft) {
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
  const normalizedDraft = {
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
    officeFloorPlan:
      draft.officeFloorPlan.length > 0
        ? cloneOfficeFloorPlan(draft.officeFloorPlan)
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
  const enabledCommercialSpaceTypes = getEnabledCommercialSpaceTypes(draft);

  if (enabledCommercialSpaceTypes.includes('office')) {
    return 'Office totals are calculated from the floor-wise office allocations you configure above.';
  }

  return 'Set the count for each structure type this society manages. Total inventory is calculated automatically.';
}

export function SocietySetupWizardScreen() {
  const { state, actions } = useApp();
  const [draft, setDraft] = useState(() => syncDerivedFields(cloneDraft(state.defaultSetupDraft)));

  function updateDraft(patch: Partial<SocietySetupDraft>) {
    setDraft((currentDraft) =>
      syncDerivedFields({
        ...currentDraft,
        ...patch,
        officeFloorPlan:
          patch.officeFloorPlan !== undefined
            ? cloneOfficeFloorPlan(patch.officeFloorPlan)
            : currentDraft.officeFloorPlan,
      }),
    );
  }

  function updateOfficeFloor(index: number, patch: Partial<OfficeFloorPlanEntry>) {
    setDraft((currentDraft) =>
      syncDerivedFields({
        ...currentDraft,
        officeFloorPlan: currentDraft.officeFloorPlan.map((floor, floorIndex) =>
          floorIndex === index ? { ...floor, ...patch } : floor,
        ),
      }),
    );
  }

  function addOfficeFloor() {
    setDraft((currentDraft) =>
      syncDerivedFields({
        ...currentDraft,
        officeFloorPlan: [
          ...currentDraft.officeFloorPlan,
          createOfficeFloorEntry(currentDraft.officeFloorPlan.length),
        ],
      }),
    );
  }

  function removeOfficeFloor(index: number) {
    setDraft((currentDraft) => {
      const nextFloorPlan = currentDraft.officeFloorPlan.filter((_, floorIndex) => floorIndex !== index);

      return syncDerivedFields({
        ...currentDraft,
        officeFloorPlan: nextFloorPlan.length > 0 ? nextFloorPlan : [createOfficeFloorEntry(0)],
      });
    });
  }

  const enabledStructures = getEnabledStructures(draft);
  const enabledCommercialSpaceTypes = getEnabledCommercialSpaceTypes(draft);
  const apartmentUnitCount = parseWholeNumber(draft.apartmentUnitCount);
  const bungalowUnitCount = parseWholeNumber(draft.bungalowUnitCount);
  const shedUnitCount = parseWholeNumber(draft.shedUnitCount);
  const totalUnits = Number.parseInt(draft.totalUnits, 10);
  const totalUnitsValid = Number.isFinite(totalUnits) && totalUnits > 0;
  const normalizedOfficeFloors = normalizeOfficeFloorPlan(draft.officeFloorPlan);
  const duplicateOfficeCodes = findDuplicateOfficeCodes(draft.officeFloorPlan);
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

  if (enabledStructures.includes('bungalow') && bungalowUnitCount < 1) {
    validationIssues.push('Add at least one bungalow or plot.');
  }

  if (enabledStructures.includes('commercial') && enabledCommercialSpaceTypes.length === 0) {
    validationIssues.push('Choose at least one commercial space type.');
  }

  if (enabledCommercialSpaceTypes.includes('shed') && shedUnitCount < 1) {
    validationIssues.push('Add at least one shed when commercial sheds are enabled.');
  }

  if (!totalUnitsValid) {
    validationIssues.push('Add at least one unit or commercial space.');
  }

  if (enabledCommercialSpaceTypes.includes('office')) {
    const emptyOfficeFloors = draft.officeFloorPlan
      .map((floor, index) => ({
        label: floor.floorLabel.trim() || `Floor ${index + 1}`,
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
        label: floor.floorLabel,
        rawValue: draft.officeFloorPlan[index]?.officeNumbers.trim() ?? '',
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
        `Duplicate office numbers found: ${duplicateOfficeCodes.join(', ')}.`,
      );
    }
  }

  const canCreate = !state.isSyncing && validationIssues.length === 0;

  return (
    <Page>
      <HeroCard
        eyebrow="Create Society Portal"
        title="Create the society workspace from one structured setup flow."
        subtitle="This portal captures the society identity, country, state, city, area, address, residential or commercial unit structure, amenities, maintenance cycle, and starter operating rules."
        tone="accent"
      >
        <View style={styles.heroActions}>
          <ActionButton
            label={state.onboarding?.membershipsCount ? 'Back to workspaces' : 'Back to portal selection'}
            onPress={actions.cancelSetup}
            variant="secondary"
          />
        </View>
      </HeroCard>

      <SurfaceCard>
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

      <SurfaceCard>
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
                  Add each floor separately and enter the exact office numbers or ranges the society
                  uses. The app will create office names exactly from your input, without adding an
                  `F` prefix.
                </Caption>

                {draft.officeFloorPlan.map((floor, index) => {
                  const officeCount = expandOfficeNumbersInput(floor.officeNumbers).length;

                  return (
                    <View key={`${index}-${floor.floorLabel}`} style={styles.floorPlanCard}>
                      <View style={styles.floorPlanHeader}>
                        <Text style={styles.floorPlanTitle}>Floor setup {index + 1}</Text>
                        {draft.officeFloorPlan.length > 1 ? (
                          <ActionButton
                            label="Remove floor"
                            onPress={() => removeOfficeFloor(index)}
                            variant="secondary"
                          />
                        ) : null}
                      </View>

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
                        <Pill label={floor.floorLabel.trim() || `Floor ${index + 1}`} tone="warning" />
                      </View>
                    </View>
                  );
                })}

                <View style={styles.officeActions}>
                  <ActionButton label="Add another floor" onPress={addOfficeFloor} variant="secondary" />
                </View>

                <Caption>
                  Examples: `101-108`, `201, 203, 205A`, `A-01, A-02, A-03`. Use commas, line
                  breaks, or numeric ranges.
                </Caption>

                {duplicateOfficeCodes.length > 0 ? (
                  <Text style={styles.validationError}>
                    Duplicate office numbers found: {duplicateOfficeCodes.join(', ')}. Each office
                    code must be unique across the society.
                  </Text>
                ) : null}

                <View style={styles.previewRow}>
                  <Pill
                    label={`${countOfficeUnits(draft.officeFloorPlan) || 0} office spaces`}
                    tone="accent"
                  />
                  <Pill label={`${draft.officeFloorPlan.length} configured floors`} tone="primary" />
                </View>
              </>
            ) : null}

            {enabledCommercialSpaceTypes.includes('shed') ? (
              <Caption>
                Each shed will be created as an individual commercial space and can be assigned
                later during occupancy and billing setup.
              </Caption>
            ) : null}
          </View>
        ) : null}
      </SurfaceCard>

      <SurfaceCard>
        <SectionHeader
          title="3. Units and maintenance"
          description={getUnitsSectionDescription(draft)}
        />

        {enabledStructures.includes('apartment') ? (
          <InputField
            label="Apartment / tower homes"
            value={draft.apartmentUnitCount}
            onChangeText={(value) => updateDraft({ apartmentUnitCount: sanitizeNumber(value) })}
            keyboardType="numeric"
            placeholder="48"
          />
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
          <InputField
            label="Commercial sheds"
            value={draft.shedUnitCount}
            onChangeText={(value) => updateDraft({ shedUnitCount: sanitizeNumber(value) })}
            keyboardType="numeric"
            placeholder="8"
          />
        ) : null}

        {enabledCommercialSpaceTypes.includes('office') ? (
          <View style={styles.generatedSummary}>
            <Text style={styles.generatedValue}>{countOfficeUnits(draft.officeFloorPlan) || 0} office spaces</Text>
            <Caption>
              Based on {draft.officeFloorPlan.length} floor allocation
              {draft.officeFloorPlan.length === 1 ? '' : 's'} and the exact office codes you enter.
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

      <SurfaceCard>
        <SectionHeader
          title="4. Common amenities"
          description="Pick the amenities you want the society to start with. Booking rules can be refined later."
        />
        <View style={styles.choiceWrap}>
          {state.amenityLibrary.map((amenityName) => (
            <ChoiceChip
              key={amenityName}
              label={amenityName}
              selected={draft.selectedAmenities.includes(amenityName)}
              onPress={() => setDraft((currentDraft) => toggleAmenity(currentDraft, amenityName))}
            />
          ))}
        </View>
      </SurfaceCard>

      <SurfaceCard>
        <SectionHeader title="5. Rules and operations" />
        <InputField
          label="Starter rules summary"
          value={draft.rulesSummary}
          onChangeText={(value) => updateDraft({ rulesSummary: value })}
          multiline
          placeholder="Write the first operational rules here"
        />
      </SurfaceCard>

      <SurfaceCard>
        <SectionHeader
          title="Workspace preview"
          description="This starter setup will generate a chairman-managed society workspace and make it discoverable in the join portal through the location filters."
        />
        <View style={styles.previewRow}>
          <Pill label={`${draft.totalUnits || '0'} ${getSocietyUnitCollectionLabel(draft)}`} tone="primary" />
          <Pill label={getSocietyStructurePreviewLabel(draft)} tone="accent" />
          <Pill label={`${draft.city || 'City'} / ${draft.area || 'Area'}`} tone="warning" />
          <Pill label={`${draft.selectedAmenities.length} amenities`} tone="warning" />
        </View>
        <Caption>
          After creation, people will be able to find this society by country, state, city, and
          area before selecting their {getSelectionLabel(draft)}.
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
  heroActions: {
    flexDirection: 'row',
    gap: spacing.sm,
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
