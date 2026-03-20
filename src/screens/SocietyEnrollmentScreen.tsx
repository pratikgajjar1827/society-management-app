import { useEffect, useMemo, useState } from 'react';
import {
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

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
import { getCountryCatalog, locationCatalog } from '../data/locationCatalog';
import { useApp } from '../state/AppContext';
import { palette, radius, shadow, spacing } from '../theme/tokens';
import { SocietyWorkspace } from '../types/domain';

type EnrollmentStep = 1 | 2 | 3 | 4;
type ResidentProfile = 'owner' | 'tenant' | 'committee';
type CityCard = ReturnType<typeof buildCityTiles>[number];

function uniqueValues(values: string[]) {
  return [...new Set(values.filter(Boolean))].sort((left, right) =>
    left.localeCompare(right, undefined, { sensitivity: 'base' }),
  );
}

function buildCountryOptions(societies: SocietyWorkspace[]) {
  const seededCountries = uniqueValues(societies.map((society) => society.country));

  return uniqueValues([
    ...locationCatalog.map((country) => country.name),
    ...seededCountries,
  ]).map((countryName) => {
    const catalog = getCountryCatalog(countryName);

    return {
      name: countryName,
      flag: catalog?.flag ?? countryName.slice(0, 2).toUpperCase(),
      subtitle:
        catalog?.subtitle ??
        'Managed societies, apartment communities, and bungalow clusters',
      societyCount: societies.filter((society) => society.country === countryName).length,
    };
  });
}

function buildCityTiles(country: string | undefined, societies: SocietyWorkspace[]) {
  if (!country) {
    return [];
  }

  const catalog = getCountryCatalog(country);
  const dataCities = uniqueValues(
    societies
      .filter((society) => society.country === country)
      .map((society) => society.city),
  );

  const catalogCities =
    catalog?.cities.map((city) => ({
      ...city,
      societyCount: societies.filter(
        (society) => society.country === country && society.city === city.name,
      ).length,
    })) ?? [];

  const missingCities = dataCities
    .filter((cityName) => !catalogCities.some((city) => city.name === cityName))
    .map((cityName) => ({
      id: `${country}-${cityName}`.toLowerCase().replace(/\s+/g, '-'),
      name: cityName,
      famousFor: 'Residential societies, apartment clusters, and local community living',
      imageUrl: `https://source.unsplash.com/featured/1200x800/?${encodeURIComponent(
        `${cityName},${country}`,
      )}`,
      imagePageTitle: cityName.replace(/\s+/g, '_'),
      societyCount: societies.filter(
        (society) => society.country === country && society.city === cityName,
      ).length,
    }));

  return [...catalogCities, ...missingCities];
}

function CityTileCard({
  city,
  onPress,
}: {
  city: CityCard;
  onPress: () => void;
}) {
  const [imageUri, setImageUri] = useState(city.imageUrl);

  useEffect(() => {
    let active = true;

    async function loadWikipediaImage() {
      try {
        const response = await fetch(
          `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(city.imagePageTitle)}`,
        );

        if (!response.ok) {
          return;
        }

        const payload = await response.json();
        const nextImageUri = payload.originalimage?.source ?? payload.thumbnail?.source;

        if (active && typeof nextImageUri === 'string' && nextImageUri.length > 0) {
          setImageUri(nextImageUri);
        }
      } catch (error) {
        // Keep the fallback landmark query URL when the summary API is unavailable.
      }
    }

    setImageUri(city.imageUrl);
    loadWikipediaImage();

    return () => {
      active = false;
    };
  }, [city.imagePageTitle, city.imageUrl]);

  return (
    <Pressable onPress={onPress}>
      <ImageBackground
        source={{ uri: imageUri }}
        imageStyle={styles.cityImage}
        style={styles.cityTile}
      >
        <View style={styles.cityOverlay} />
        <View style={styles.cityContent}>
          <Text style={styles.cityName}>{city.name}</Text>
          <Text style={styles.cityFamousFor}>{city.famousFor}</Text>
          <Pill
            label={`${city.societyCount} society${city.societyCount === 1 ? '' : 'ies'}`}
            tone="warning"
          />
        </View>
      </ImageBackground>
    </Pressable>
  );
}

export function SocietyEnrollmentScreen() {
  const { state, actions } = useApp();
  const [step, setStep] = useState<EnrollmentStep>(1);
  const [selectedCountry, setSelectedCountry] = useState<string | undefined>(undefined);
  const [selectedCity, setSelectedCity] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSocietyId, setSelectedSocietyId] = useState<string | undefined>(undefined);
  const [selectedUnitId, setSelectedUnitId] = useState<string | undefined>(undefined);
  const [residentProfile, setResidentProfile] = useState<ResidentProfile | undefined>(undefined);

  const existingSocietyIds = new Set(
    state.data.memberships
      .filter((membership) => membership.userId === state.session.userId)
      .map((membership) => membership.societyId),
  );

  const societyPool = state.data.societies;

  const countryOptions = useMemo(() => buildCountryOptions(societyPool), [societyPool]);
  const cityTiles = useMemo(
    () => buildCityTiles(selectedCountry, societyPool),
    [selectedCountry, societyPool],
  );

  const matchingSocieties = useMemo(() => {
    if (!selectedCountry || !selectedCity) {
      return [];
    }

    const normalizedQuery = searchQuery.trim().toLowerCase();

    return societyPool.filter((society) => {
      if (society.country !== selectedCountry || society.city !== selectedCity) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return [society.name, society.address, society.area, society.tagline]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [searchQuery, selectedCity, selectedCountry, societyPool]);

  const availableUnits = useMemo(() => {
    if (!selectedSocietyId) {
      return [];
    }

    return [...state.data.units]
      .filter((unit) => unit.societyId === selectedSocietyId)
      .sort((left, right) => left.code.localeCompare(right.code, undefined, { numeric: true }));
  }, [selectedSocietyId, state.data.units]);

  const selectedSociety = matchingSocieties.find((society) => society.id === selectedSocietyId);
  const hasMemberships = Boolean(state.onboarding?.membershipsCount);

  function goBack() {
    if (step === 1) {
      if (hasMemberships) {
        actions.goToWorkspaces();
      } else {
        actions.logout();
      }
      return;
    }

    setStep((currentStep) => (currentStep > 1 ? ((currentStep - 1) as EnrollmentStep) : currentStep));
  }

  function goToCountryStep(countryName: string) {
    setSelectedCountry(countryName);
    setSelectedCity(undefined);
    setSearchQuery('');
    setSelectedSocietyId(undefined);
    setSelectedUnitId(undefined);
    setResidentProfile(undefined);
    setStep(2);
  }

  function goToCityStep(cityName: string) {
    setSelectedCity(cityName);
    setSearchQuery('');
    setSelectedSocietyId(undefined);
    setSelectedUnitId(undefined);
    setResidentProfile(undefined);
    setStep(3);
  }

  function renderCountryStep() {
    return (
      <>
        <SurfaceCard>
          <SectionHeader
            title="Page 2. Select country"
            description="Start by choosing the country where the society is located."
          />
          <View style={styles.countryGrid}>
            {countryOptions.map((country) => (
              <Pressable
                key={country.name}
                onPress={() => goToCountryStep(country.name)}
                style={({ pressed }) => [
                  styles.countryCard,
                  pressed ? styles.tilePressed : null,
                ]}
              >
                <Text style={styles.countryFlag}>{country.flag}</Text>
                <Text style={styles.countryName}>{country.name}</Text>
                <Caption>{country.subtitle}</Caption>
                <Pill
                  label={`${country.societyCount} society${country.societyCount === 1 ? '' : 'ies'}`}
                  tone="accent"
                />
              </Pressable>
            ))}
          </View>
        </SurfaceCard>

        <SurfaceCard>
          <SectionHeader
            title="Need a new society instead?"
            description="If the society has not been created yet, use the creation flow instead of searching."
          />
          <ActionButton
            label={state.isSyncing ? 'Opening creation flow...' : 'Create new society'}
            onPress={actions.startSetup}
            disabled={state.isSyncing}
            variant="secondary"
          />
        </SurfaceCard>
      </>
    );
  }

  function renderCityStep() {
    return (
      <>
        <SurfaceCard>
          <SectionHeader
            title="Page 3. Choose a city"
            description="Major cities for the selected country are shown as large visual tiles."
          />
          <Caption>Selected country: {selectedCountry}</Caption>
        </SurfaceCard>

        {cityTiles.map((city) => (
          <CityTileCard key={city.id} city={city} onPress={() => goToCityStep(city.name)} />
        ))}

        {cityTiles.length === 0 ? (
          <SurfaceCard>
            <Text style={styles.emptyTitle}>No city tiles available</Text>
            <Caption>
              This country does not have city data yet. You can still create a new society for it.
            </Caption>
          </SurfaceCard>
        ) : null}
      </>
    );
  }

  function renderSocietyStep() {
    return (
      <>
        <SurfaceCard>
          <SectionHeader
            title="Page 4. Search the society and choose the home number"
            description="Search by society name, then select the flat, bungalow, or apartment number."
          />
          <Caption>
            {selectedCountry} / {selectedCity}
          </Caption>
          <InputField
            label="Search society name"
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search by society name"
            autoCapitalize="words"
          />
        </SurfaceCard>

        {matchingSocieties.length === 0 ? (
          <SurfaceCard>
            <Text style={styles.emptyTitle}>No society found</Text>
            <Caption>Try another city or update the search term.</Caption>
          </SurfaceCard>
        ) : null}

        {matchingSocieties.map((society) => {
          const isSelected = society.id === selectedSocietyId;
          const isAlreadyLinked = existingSocietyIds.has(society.id);

          return (
            <SurfaceCard key={society.id}>
              <View style={styles.cardHeader}>
                <View style={styles.headingBlock}>
                  <Text style={styles.cardTitle}>{society.name}</Text>
                  <Caption>{society.address}</Caption>
                </View>
                <Pill
                  label={society.structure === 'apartment' ? 'Apartment' : 'Bungalow'}
                  tone="primary"
                />
              </View>

              <Caption>{society.tagline}</Caption>

              <View style={styles.metaRow}>
                <Pill label={society.city} tone="accent" />
                <Pill label={society.area} tone="warning" />
                <Pill label={`${society.totalUnits} homes`} tone="primary" />
                {isAlreadyLinked ? <Pill label="Already linked" tone="success" /> : null}
              </View>

              <ActionButton
                label={
                  isSelected
                    ? 'Selected society'
                    : isAlreadyLinked
                      ? 'Select linked society'
                      : 'Select society'
                }
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
              title="Choose apartment or bungalow number"
              description="Once you select your home number, the next button becomes active."
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
            <ActionButton
              label="Next"
              onPress={() => setStep(4)}
              disabled={!selectedUnitId}
            />
          </SurfaceCard>
        ) : null}
      </>
    );
  }

  function renderProfileStep() {
    return (
      <>
        <SurfaceCard>
          <SectionHeader
            title="Page 5. Residence profile details"
            description="Choose how this mobile user belongs to the selected apartment or bungalow."
          />
          <View style={styles.summaryBlock}>
            <Caption>Country: {selectedCountry}</Caption>
            <Caption>City: {selectedCity}</Caption>
            <Caption>Society: {selectedSociety?.name ?? 'Not selected'}</Caption>
            <Caption>
              Home number:{' '}
              {availableUnits.find((unit) => unit.id === selectedUnitId)?.code ?? 'Not selected'}
            </Caption>
          </View>

          <View style={styles.choiceWrap}>
            <ChoiceChip
              label="Owner"
              selected={residentProfile === 'owner'}
              onPress={() => setResidentProfile('owner')}
            />
            <ChoiceChip
              label="Tenant"
              selected={residentProfile === 'tenant'}
              onPress={() => setResidentProfile('tenant')}
            />
            <ChoiceChip
              label="Society Committee Member"
              selected={residentProfile === 'committee'}
              onPress={() => setResidentProfile('committee')}
            />
          </View>

          <Caption>
            Committee members get the society linked to their home and can continue into the admin-capable profile selection flow.
          </Caption>

          <ActionButton
            label={state.isSyncing ? 'Opening workspace...' : 'Continue'}
            onPress={() =>
              actions.enrollIntoSociety(
                selectedSocietyId ?? '',
                selectedUnitId ?? '',
                residentProfile ?? 'owner',
              )
            }
            disabled={state.isSyncing || !selectedSocietyId || !selectedUnitId || !residentProfile}
          />
        </SurfaceCard>
      </>
    );
  }

  return (
    <Page>
      <HeroCard
        eyebrow="Society Enrollment"
        title="Join the right society in five simple pages."
        subtitle="Login with OTP, choose the country, browse city tiles, search the society, select the home number, and finish with the residence profile."
      >
        <View style={styles.heroActions}>
          <ActionButton label={step === 1 ? 'Exit' : 'Back'} onPress={goBack} variant="secondary" />
          {hasMemberships ? (
            <ActionButton label="Workspaces" onPress={actions.goToWorkspaces} variant="ghost" />
          ) : null}
        </View>
        <View style={styles.metaRow}>
          <Pill label={`Page ${step + 1} of 5`} tone="warning" />
          {selectedCountry ? <Pill label={selectedCountry} tone="accent" /> : null}
          {selectedCity ? <Pill label={selectedCity} tone="primary" /> : null}
        </View>
      </HeroCard>

      {step === 1 ? renderCountryStep() : null}
      {step === 2 ? renderCityStep() : null}
      {step === 3 ? renderSocietyStep() : null}
      {step === 4 ? renderProfileStep() : null}
    </Page>
  );
}

const styles = StyleSheet.create({
  heroActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  countryGrid: {
    gap: spacing.md,
  },
  countryCard: {
    backgroundColor: palette.surfaceMuted,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: palette.border,
  },
  countryFlag: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: palette.primary,
  },
  countryName: {
    fontSize: 24,
    fontWeight: '800',
    color: palette.ink,
  },
  cityTile: {
    minHeight: 260,
    borderRadius: radius.xl,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    marginBottom: spacing.lg,
    ...shadow.card,
  },
  cityImage: {
    borderRadius: radius.xl,
  },
  cityOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(13, 28, 24, 0.42)',
  },
  cityContent: {
    padding: spacing.xl,
    gap: spacing.sm,
  },
  cityName: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
    color: palette.white,
  },
  cityFamousFor: {
    color: '#F6EFE4',
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 440,
  },
  tilePressed: {
    opacity: 0.88,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '800',
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
  choiceWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  summaryBlock: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: palette.surfaceMuted,
  },
});
