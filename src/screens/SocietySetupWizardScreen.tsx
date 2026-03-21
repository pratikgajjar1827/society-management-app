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
import { OfficeFloorPlanEntry, SocietySetupDraft } from '../types/domain';
import {
  getSocietyStructurePreviewLabel,
  getSocietyUnitCollectionLabel,
} from '../utils/selectors';

function sanitizeNumber(value: string) {
  return value.replace(/[^0-9]/g, '');
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

function getDerivedTotalUnits(draft: SocietySetupDraft) {
  if (draft.structure !== 'commercial' || draft.commercialSpaceType !== 'office') {
    return draft.totalUnits;
  }

  const totalOfficeSpaces = countOfficeUnits(draft.officeFloorPlan);
  return totalOfficeSpaces > 0 ? String(totalOfficeSpaces) : '';
}

function syncDerivedFields(draft: SocietySetupDraft) {
  return {
    ...draft,
    totalUnits: getDerivedTotalUnits(draft),
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

function getUnitCountFieldLabel(draft: SocietySetupDraft) {
  if (draft.structure === 'commercial') {
    return draft.commercialSpaceType === 'office' ? 'Total office spaces' : 'Total sheds';
  }

  return draft.structure === 'bungalow' ? 'Total plots' : 'Total units';
}

function getSelectionLabel(draft: SocietySetupDraft) {
  if (draft.structure === 'commercial') {
    return draft.commercialSpaceType === 'office' ? 'office space number' : 'shed number';
  }

  return draft.structure === 'bungalow' ? 'plot number' : 'home number';
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

  if (!totalUnitsValid) {
    validationIssues.push('Add at least one unit or commercial space.');
  }

  if (draft.structure === 'commercial' && draft.commercialSpaceType === 'office') {
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
        <SectionHeader title="2. Society structure" />
        <View style={styles.choiceWrap}>
          <ChoiceChip
            label="Apartment / tower model"
            selected={draft.structure === 'apartment'}
            onPress={() => updateDraft({ structure: 'apartment' })}
          />
          <ChoiceChip
            label="Bungalow / plot model"
            selected={draft.structure === 'bungalow'}
            onPress={() => updateDraft({ structure: 'bungalow' })}
          />
          <ChoiceChip
            label="Commercial complex"
            selected={draft.structure === 'commercial'}
            onPress={() => updateDraft({ structure: 'commercial' })}
          />
        </View>

        {draft.structure === 'commercial' ? (
          <View style={styles.structurePanel}>
            <SectionHeader
              title="Commercial space type"
              description="Choose whether this society manages sheds or office spaces."
            />
            <View style={styles.choiceWrap}>
              <ChoiceChip
                label="Shed"
                selected={draft.commercialSpaceType === 'shed'}
                onPress={() => updateDraft({ commercialSpaceType: 'shed' })}
              />
              <ChoiceChip
                label="Office space"
                selected={draft.commercialSpaceType === 'office'}
                onPress={() => updateDraft({ commercialSpaceType: 'office' })}
              />
            </View>

            {draft.commercialSpaceType === 'office' ? (
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
                  <Pill label={`${draft.totalUnits || '0'} office spaces`} tone="accent" />
                  <Pill label={`${draft.officeFloorPlan.length} configured floors`} tone="primary" />
                </View>
              </>
            ) : (
              <Caption>
                Each shed will be created as an individual commercial space and can be assigned
                later during occupancy and billing setup.
              </Caption>
            )}
          </View>
        ) : null}
      </SurfaceCard>

      <SurfaceCard>
        <SectionHeader
          title="3. Units and maintenance"
          description={
            draft.structure === 'commercial' && draft.commercialSpaceType === 'office'
              ? 'Office totals are calculated from the floor-wise office allocations you configure above.'
              : undefined
          }
        />

        {draft.structure === 'commercial' && draft.commercialSpaceType === 'office' ? (
          <View style={styles.generatedSummary}>
            <Text style={styles.generatedValue}>{draft.totalUnits || '0'} office spaces</Text>
            <Caption>
              Based on {draft.officeFloorPlan.length} floor allocation
              {draft.officeFloorPlan.length === 1 ? '' : 's'} and the exact office codes you enter.
            </Caption>
          </View>
        ) : (
          <InputField
            label={getUnitCountFieldLabel(draft)}
            value={draft.totalUnits}
            onChangeText={(value) => updateDraft({ totalUnits: sanitizeNumber(value) })}
            keyboardType="numeric"
            placeholder="48"
          />
        )}

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
