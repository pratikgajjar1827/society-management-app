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
import { amenityLibrary, defaultSetupDraft } from '../data/seed';
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
  const { actions } = useApp();
  const [draft, setDraft] = useState(defaultSetupDraft);

  const canCreate = draft.societyName.trim().length > 2 && draft.address.trim().length > 4;

  return (
    <Page>
      <HeroCard
        eyebrow="Chairman Setup Wizard"
        title="Launch a working society workspace in under 30 minutes."
        subtitle="This onboarding focuses on the minimum operational setup: society identity, unit structure, amenities, maintenance cycle, and baseline rules."
        tone="accent"
      >
        <View style={styles.heroActions}>
          <ActionButton label="Back to workspaces" onPress={actions.cancelSetup} variant="secondary" />
        </View>
      </HeroCard>

      <SurfaceCard>
        <SectionHeader title="1. Society identity and structure" />
        <InputField
          label="Society name"
          value={draft.societyName}
          onChangeText={(value) => setDraft({ ...draft, societyName: value })}
          placeholder="Green Valley Residency"
        />
        <InputField
          label="Address"
          value={draft.address}
          onChangeText={(value) => setDraft({ ...draft, address: value })}
          placeholder="Area, city, state"
        />

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
        <SectionHeader title="2. Units and maintenance" />
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
          title="3. Common amenities"
          description="Pick the amenities you want the society to start with. Booking rules can be refined later."
        />
        <View style={styles.choiceWrap}>
          {amenityLibrary.map((amenityName) => (
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
        <SectionHeader title="4. Rules and operations" />
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
          description="This starter setup will generate a chairman-owned society workspace with resident and admin views."
        />
        <View style={styles.previewRow}>
          <Pill label={`${draft.totalUnits || '0'} units`} tone="primary" />
          <Pill
            label={draft.structure === 'apartment' ? 'Tower hierarchy enabled' : 'Plot hierarchy enabled'}
            tone="accent"
          />
          <Pill label={`${draft.selectedAmenities.length} amenities`} tone="warning" />
        </View>
        <Caption>
          Next production modules to add after this setup are resident invitations, ledger reconciliation, push notifications, payments, visitor management, and audit logging.
        </Caption>
        <ActionButton
          label="Create society workspace"
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
