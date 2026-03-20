import { useMemo, useState } from 'react';
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
import { useApp } from '../state/AppContext';
import { palette, spacing } from '../theme/tokens';
import { SocietyWorkspace } from '../types/domain';

function getUniqueValues(items: SocietyWorkspace[], key: 'country' | 'state' | 'city' | 'area') {
  return [...new Set(items.map((item) => item[key]).filter(Boolean))].sort((left, right) =>
    left.localeCompare(right, undefined, { sensitivity: 'base' }),
  );
}

export function SocietyEnrollmentScreen() {
  const { state, actions } = useApp();
  const [residentType, setResidentType] = useState<'owner' | 'tenant' | undefined>(undefined);
  const [selectedCountry, setSelectedCountry] = useState<string | undefined>(undefined);
  const [selectedState, setSelectedState] = useState<string | undefined>(undefined);
  const [selectedCity, setSelectedCity] = useState<string | undefined>(undefined);
  const [selectedArea, setSelectedArea] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSocietyId, setSelectedSocietyId] = useState<string | undefined>(undefined);
  const [selectedUnitId, setSelectedUnitId] = useState<string | undefined>(undefined);

  const existingSocietyIds = new Set(
    state.data.memberships
      .filter((membership) => membership.userId === state.session.userId)
      .map((membership) => membership.societyId),
  );

  const societyPool = useMemo(
    () => state.data.societies.filter((society) => !existingSocietyIds.has(society.id)),
    [existingSocietyIds, state.data.societies],
  );

  const countryOptions = useMemo(() => getUniqueValues(societyPool, 'country'), [societyPool]);

  const stateOptions = useMemo(() => {
    const filtered = selectedCountry
      ? societyPool.filter((society) => society.country === selectedCountry)
      : [];
    return getUniqueValues(filtered, 'state');
  }, [selectedCountry, societyPool]);

  const cityOptions = useMemo(() => {
    const filtered =
      selectedCountry && selectedState
        ? societyPool.filter(
            (society) =>
              society.country === selectedCountry && society.state === selectedState,
          )
        : [];
    return getUniqueValues(filtered, 'city');
  }, [selectedCountry, selectedState, societyPool]);

  const areaOptions = useMemo(() => {
    const filtered =
      selectedCountry && selectedState && selectedCity
        ? societyPool.filter(
            (society) =>
              society.country === selectedCountry &&
              society.state === selectedState &&
              society.city === selectedCity,
          )
        : [];
    return getUniqueValues(filtered, 'area');
  }, [selectedCity, selectedCountry, selectedState, societyPool]);

  const locationReady = Boolean(selectedCountry && selectedState && selectedCity && selectedArea);

  const matchingSocieties = useMemo(() => {
    if (!locationReady) {
      return [];
    }

    const normalizedQuery = searchQuery.trim().toLowerCase();

    return societyPool.filter((society) => {
      const matchesLocation =
        society.country === selectedCountry &&
        society.state === selectedState &&
        society.city === selectedCity &&
        society.area === selectedArea;

      if (!matchesLocation) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return [society.name, society.address, society.tagline]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [
    locationReady,
    searchQuery,
    selectedArea,
    selectedCity,
    selectedCountry,
    selectedState,
    societyPool,
  ]);

  const availableUnits = useMemo(() => {
    if (!selectedSocietyId) {
      return [];
    }

    return [...state.data.units]
      .filter((unit) => unit.societyId === selectedSocietyId)
      .sort((left, right) => left.code.localeCompare(right.code, undefined, { numeric: true }));
  }, [selectedSocietyId, state.data.units]);

  const hasMemberships = Boolean(state.onboarding?.membershipsCount);

  return (
    <Page>
      <HeroCard
        eyebrow="Join Society Portal"
        title="Find the correct society before entering the workspace."
        subtitle="Choose your resident type, narrow the location step by step, select the society, and then choose your resident number or home."
      >
        <View style={styles.heroActions}>
          <ActionButton
            label={hasMemberships ? 'Back to workspaces' : 'Back to portal selection'}
            onPress={hasMemberships ? actions.goToWorkspaces : actions.goToPortalSelection}
            variant="secondary"
          />
          <ActionButton label="Sign out" onPress={actions.logout} variant="ghost" />
        </View>
      </HeroCard>

      <SurfaceCard>
        <SectionHeader
          title="1. Choose resident type"
          description="This decides how the membership and occupancy record will be attached to the selected home."
        />
        <View style={styles.choiceWrap}>
          <ChoiceChip
            label="Resident Owner"
            selected={residentType === 'owner'}
            onPress={() => setResidentType('owner')}
          />
          <ChoiceChip
            label="Tenant"
            selected={residentType === 'tenant'}
            onPress={() => setResidentType('tenant')}
          />
        </View>
      </SurfaceCard>

      <SurfaceCard>
        <SectionHeader
          title="2. Select location"
          description="Societies are discovered only after you choose country, state, city, and area in order."
        />

        <Text style={styles.groupLabel}>Country</Text>
        <View style={styles.choiceWrap}>
          {countryOptions.map((country) => (
            <ChoiceChip
              key={country}
              label={country}
              selected={selectedCountry === country}
              onPress={() => {
                setSelectedCountry(country);
                setSelectedState(undefined);
                setSelectedCity(undefined);
                setSelectedArea(undefined);
                setSelectedSocietyId(undefined);
                setSelectedUnitId(undefined);
              }}
            />
          ))}
        </View>

        {selectedCountry ? (
          <>
            <Text style={styles.groupLabel}>State</Text>
            <View style={styles.choiceWrap}>
              {stateOptions.map((option) => (
                <ChoiceChip
                  key={option}
                  label={option}
                  selected={selectedState === option}
                  onPress={() => {
                    setSelectedState(option);
                    setSelectedCity(undefined);
                    setSelectedArea(undefined);
                    setSelectedSocietyId(undefined);
                    setSelectedUnitId(undefined);
                  }}
                />
              ))}
            </View>
          </>
        ) : null}

        {selectedCountry && selectedState ? (
          <>
            <Text style={styles.groupLabel}>City</Text>
            <View style={styles.choiceWrap}>
              {cityOptions.map((option) => (
                <ChoiceChip
                  key={option}
                  label={option}
                  selected={selectedCity === option}
                  onPress={() => {
                    setSelectedCity(option);
                    setSelectedArea(undefined);
                    setSelectedSocietyId(undefined);
                    setSelectedUnitId(undefined);
                  }}
                />
              ))}
            </View>
          </>
        ) : null}

        {selectedCountry && selectedState && selectedCity ? (
          <>
            <Text style={styles.groupLabel}>Area</Text>
            <View style={styles.choiceWrap}>
              {areaOptions.map((option) => (
                <ChoiceChip
                  key={option}
                  label={option}
                  selected={selectedArea === option}
                  onPress={() => {
                    setSelectedArea(option);
                    setSelectedSocietyId(undefined);
                    setSelectedUnitId(undefined);
                  }}
                />
              ))}
            </View>
          </>
        ) : null}
      </SurfaceCard>

      {locationReady ? (
        <SurfaceCard>
          <SectionHeader
            title="3. Search and choose society"
            description="Only societies created in the selected location are shown below."
          />
          <InputField
            label="Search society name"
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search by society name or address"
            autoCapitalize="words"
          />
        </SurfaceCard>
      ) : null}

      {locationReady && matchingSocieties.length === 0 ? (
        <SurfaceCard>
          <Text style={styles.cardTitle}>No society found in this area</Text>
          <Caption>Try another area or adjust the search term.</Caption>
        </SurfaceCard>
      ) : null}

      {matchingSocieties.map((society) => {
        const isSelected = selectedSocietyId === society.id;

        return (
          <SurfaceCard key={society.id}>
            <View style={styles.cardHeader}>
              <View style={styles.headingBlock}>
                <Text style={styles.cardTitle}>{society.name}</Text>
                <Caption>{society.address}</Caption>
              </View>
              <Pill
                label={society.structure === 'apartment' ? 'Apartment society' : 'Bungalow society'}
                tone="primary"
              />
            </View>

            <Caption>{society.tagline}</Caption>

            <View style={styles.metaRow}>
              <Pill label={`${society.country} / ${society.state}`} tone="accent" />
              <Pill label={`${society.city} / ${society.area}`} tone="warning" />
              <Pill label={`${society.totalUnits} homes`} tone="primary" />
            </View>

            <ActionButton
              label={isSelected ? 'Selected society' : 'Select society'}
              onPress={() => {
                setSelectedSocietyId(society.id);
                setSelectedUnitId(undefined);
              }}
              variant={isSelected ? 'primary' : 'secondary'}
            />
          </SurfaceCard>
        );
      })}

      {selectedSocietyId ? (
        <SurfaceCard>
          <SectionHeader
            title="4. Choose resident number or home"
            description="Select the flat, bungalow, or plot number that belongs to this mobile login."
          />
          <View style={styles.choiceWrap}>
            {availableUnits.map((unit) => (
              <ChoiceChip
                key={unit.id}
                label={unit.code}
                selected={selectedUnitId === unit.id}
                onPress={() => setSelectedUnitId(unit.id)}
              />
            ))}
          </View>
          {availableUnits.length === 0 ? (
            <Caption>No home numbers are available for this society yet.</Caption>
          ) : null}
          <ActionButton
            label={state.isSyncing ? 'Joining society...' : 'Continue to workspace'}
            onPress={() =>
              actions.enrollIntoSociety(
                selectedSocietyId,
                selectedUnitId ?? '',
                residentType as 'owner' | 'tenant',
              )
            }
            disabled={state.isSyncing || !residentType || !selectedUnitId}
          />
        </SurfaceCard>
      ) : null}
    </Page>
  );
}

const styles = StyleSheet.create({
  heroActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  choiceWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  groupLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: palette.ink,
  },
  cardHeader: {
    gap: spacing.sm,
  },
  headingBlock: {
    gap: spacing.xs,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: palette.ink,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
