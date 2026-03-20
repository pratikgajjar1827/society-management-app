import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

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
import { useApp } from '../state/AppContext';
import { spacing } from '../theme/tokens';
import { SocietySetupDraft } from '../types/domain';

function toggleAmenity(draft: SocietySetupDraft, amenityName: string): SocietySetupDraft {
  const alreadySelected = draft.selectedAmenities.includes(amenityName);

  return {
    ...draft,
    selectedAmenities: alreadySelected
      ? draft.selectedAmenities.filter((item) => item !== amenityName)
      : [...draft.selectedAmenities, amenityName],
  };
}

export function SocietySetupWizardScreen() {
  const { state, actions } = useApp();
  const [draft, setDraft] = useState(state.defaultSetupDraft);

  const canCreate =
    !state.isSyncing &&
    draft.societyName.trim().length > 2 &&
    draft.country.trim().length > 1 &&
    draft.state.trim().length > 1 &&
    draft.city.trim().length > 1 &&
    draft.area.trim().length > 1 &&
    draft.address.trim().length > 4;

  return (
    <Page>
      <HeroCard
        eyebrow="Create Society Portal"
        title="Create the society workspace from one structured setup flow."
        subtitle="This portal captures the society identity, country, state, city, area, address, unit structure, amenities, maintenance cycle, and starter operating rules."
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
          onChangeText={(value) => setDraft({ ...draft, societyName: value })}
          placeholder="Green Valley Residency"
        />
        <View style={styles.twoColumn}>
          <View style={styles.column}>
            <InputField
              label="Country"
              value={draft.country}
              onChangeText={(value) => setDraft({ ...draft, country: value })}
              placeholder="India"
              autoCapitalize="words"
            />
          </View>
          <View style={styles.column}>
            <InputField
              label="State"
              value={draft.state}
              onChangeText={(value) => setDraft({ ...draft, state: value })}
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
              onChangeText={(value) => setDraft({ ...draft, city: value })}
              placeholder="Ahmedabad"
              autoCapitalize="words"
            />
          </View>
          <View style={styles.column}>
            <InputField
              label="Area"
              value={draft.area}
              onChangeText={(value) => setDraft({ ...draft, area: value })}
              placeholder="Prahladnagar"
              autoCapitalize="words"
            />
          </View>
        </View>
        <InputField
          label="Address"
          value={draft.address}
          onChangeText={(value) => setDraft({ ...draft, address: value })}
          placeholder="Street, landmark, pin code"
        />
      </SurfaceCard>

      <SurfaceCard>
        <SectionHeader title="2. Society structure" />
        <View style={styles.choiceWrap}>
          <ChoiceChip
            label="Apartment / tower model"
            selected={draft.structure === 'apartment'}
            onPress={() => setDraft({ ...draft, structure: 'apartment' })}
          />
          <ChoiceChip
            label="Bungalow / plot model"
            selected={draft.structure === 'bungalow'}
            onPress={() => setDraft({ ...draft, structure: 'bungalow' })}
          />
        </View>
      </SurfaceCard>

      <SurfaceCard>
        <SectionHeader title="3. Units and maintenance" />
        <View style={styles.twoColumn}>
          <View style={styles.column}>
            <InputField
              label="Total units"
              value={draft.totalUnits}
              onChangeText={(value) => setDraft({ ...draft, totalUnits: value.replace(/[^0-9]/g, '') })}
              keyboardType="numeric"
              placeholder="48"
            />
          </View>
          <View style={styles.column}>
            <InputField
              label="Maintenance due day"
              value={draft.maintenanceDay}
              onChangeText={(value) =>
                setDraft({ ...draft, maintenanceDay: value.replace(/[^0-9]/g, '') })
              }
              keyboardType="numeric"
              placeholder="10"
            />
          </View>
        </View>
        <InputField
          label="Monthly maintenance amount (INR)"
          value={draft.maintenanceAmount}
          onChangeText={(value) => setDraft({ ...draft, maintenanceAmount: value.replace(/[^0-9]/g, '') })}
          keyboardType="numeric"
          placeholder="6500"
        />
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
          onChangeText={(value) => setDraft({ ...draft, rulesSummary: value })}
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
          <Pill label={`${draft.totalUnits || '0'} units`} tone="primary" />
          <Pill
            label={draft.structure === 'apartment' ? 'Tower hierarchy enabled' : 'Plot hierarchy enabled'}
            tone="accent"
          />
          <Pill label={`${draft.city || 'City'} / ${draft.area || 'Area'}`} tone="warning" />
          <Pill label={`${draft.selectedAmenities.length} amenities`} tone="warning" />
        </View>
        <Caption>
          After creation, new residents will be able to find this society by country, state, city, and area before selecting their home number.
        </Caption>
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
  previewRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
