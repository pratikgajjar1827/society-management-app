import { useEffect, useMemo, useState } from 'react';
import {
  Image,
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
import { SocietyWorkspace, VehicleType } from '../types/domain';
import { pickWebFileAsDataUrl, tryDetectVehicleRegistrationFromDataUrl } from '../utils/fileUploads';
import { pickResidentProfilePhoto } from '../utils/media';
import {
  doesSocietyHaveChairman,
  getSocietyStructureLabel,
  getSocietyUnitCollectionLabel,
} from '../utils/selectors';

type EnrollmentStep = 1 | 2 | 3 | 4;
type ResidentProfile = 'owner' | 'tenant' | 'chairman';
type CityCard = ReturnType<typeof buildCityTiles>[number];
type EditableVehicleDraft = {
  id: string;
  unitId: string;
  registrationNumber: string;
  vehicleType: VehicleType;
  color: string;
  parkingSlot: string;
  photoDataUrl: string;
  statusMessage: string;
};

function uniqueValues(values: string[]) {
  return [...new Set(values.filter(Boolean))].sort((left, right) =>
    left.localeCompare(right, undefined, { sensitivity: 'base' }),
  );
}

function normalizeLocationLabel(value: string | undefined) {
  return String(value ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
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
        'Managed societies, apartment communities, bungalow clusters, and commercial campuses',
      societyCount: societies.filter(
        (society) => normalizeLocationLabel(society.country) === normalizeLocationLabel(countryName),
      ).length,
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
      .filter((society) => normalizeLocationLabel(society.country) === normalizeLocationLabel(country))
      .map((society) => society.city),
  );

  const catalogCities =
    catalog?.cities.map((city) => ({
      ...city,
      societyCount: societies.filter(
        (society) =>
          normalizeLocationLabel(society.country) === normalizeLocationLabel(country) &&
          normalizeLocationLabel(society.city) === normalizeLocationLabel(city.name),
      ).length,
    })) ?? [];

  const missingCities = dataCities
    .filter((cityName) => !catalogCities.some((city) => city.name === cityName))
    .map((cityName) => ({
      id: `${country}-${cityName}`.toLowerCase().replace(/\s+/g, '-'),
      name: cityName,
      famousFor: 'Residential societies, apartment clusters, commercial campuses, and local community living',
      imageUrl: `https://source.unsplash.com/featured/1200x800/?${encodeURIComponent(
        `${cityName},${country}`,
      )}`,
      imagePageTitle: cityName.replace(/\s+/g, '_'),
      societyCount: societies.filter(
        (society) =>
          normalizeLocationLabel(society.country) === normalizeLocationLabel(country) &&
          normalizeLocationLabel(society.city) === normalizeLocationLabel(cityName),
      ).length,
    }));

  return [...catalogCities, ...missingCities];
}

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function createEditableVehicleDraft(unitId = ''): EditableVehicleDraft {
  return {
    id: `vehicle-draft-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    unitId,
    registrationNumber: '',
    vehicleType: 'car',
    color: '',
    parkingSlot: '',
    photoDataUrl: '',
    statusMessage: '',
  };
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
  const canCreateSociety = state.session.accountRole === 'superUser';
  const [step, setStep] = useState<EnrollmentStep>(1);
  const [selectedCountry, setSelectedCountry] = useState<string | undefined>(undefined);
  const [selectedCity, setSelectedCity] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSocietyId, setSelectedSocietyId] = useState<string | undefined>(undefined);
  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([]);
  const [residentProfile, setResidentProfile] = useState<ResidentProfile | undefined>(undefined);
  const currentUser = state.session.userId
    ? state.data.users.find((user) => user.id === state.session.userId)
    : undefined;
  const [residentFullName, setResidentFullName] = useState(() => currentUser?.name ?? '');
  const [residentEmail, setResidentEmail] = useState(() => currentUser?.email ?? '');
  const [businessName, setBusinessName] = useState('');
  const [businessDetails, setBusinessDetails] = useState('');
  const [hasEditedResidentFullName, setHasEditedResidentFullName] = useState(false);
  const [hasEditedResidentEmail, setHasEditedResidentEmail] = useState(false);
  const [alternatePhone, setAlternatePhone] = useState('');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [secondaryEmergencyContactName, setSecondaryEmergencyContactName] = useState('');
  const [secondaryEmergencyContactPhone, setSecondaryEmergencyContactPhone] = useState('');
  const [moveInDate, setMoveInDate] = useState(todayString());
  const [profilePhotoDataUrl, setProfilePhotoDataUrl] = useState('');
  const [profilePhotoMessage, setProfilePhotoMessage] = useState('');
  const [dataProtectionConsent, setDataProtectionConsent] = useState(false);
  const [rentAgreementFileName, setRentAgreementFileName] = useState('');
  const [rentAgreementDataUrl, setRentAgreementDataUrl] = useState('');
  const [rentAgreementMessage, setRentAgreementMessage] = useState('');
  const [vehicles, setVehicles] = useState<EditableVehicleDraft[]>([]);

  useEffect(() => {
    if (currentUser?.name && !hasEditedResidentFullName && !residentFullName) {
      setResidentFullName(currentUser.name);
    }

    if (currentUser?.email && !hasEditedResidentEmail && !residentEmail) {
      setResidentEmail(currentUser.email);
    }
  }, [
    currentUser?.email,
    currentUser?.name,
    hasEditedResidentEmail,
    hasEditedResidentFullName,
    residentEmail,
    residentFullName,
  ]);

  const existingSocietyIds = new Set(
    state.data.memberships
      .filter((membership) => membership.userId === state.session.userId)
      .map((membership) => membership.societyId),
  );

  const societyPool = state.data.societies;
  const selectedUnits = useMemo(
    () => state.data.units.filter((unit) => selectedUnitIds.includes(unit.id)),
    [state.data.units, selectedUnitIds],
  );

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
      if (
        normalizeLocationLabel(society.country) !== normalizeLocationLabel(selectedCountry) ||
        normalizeLocationLabel(society.city) !== normalizeLocationLabel(selectedCity)
      ) {
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
  const selectedSocietyHasChairman = useMemo(
    () => (selectedSocietyId ? doesSocietyHaveChairman(state.data, selectedSocietyId) : false),
    [selectedSocietyId, state.data],
  );
  const shouldShowBusinessSection =
    residentProfile !== 'chairman' &&
    (selectedUnits.some((unit) => unit.unitType === 'office' || unit.unitType === 'shed')
      || selectedSociety?.structure === 'commercial');
  const hasMemberships = Boolean(state.onboarding?.membershipsCount);
  const hasIncompleteVehicle = vehicles.some(
    (vehicle) =>
      (vehicle.registrationNumber.trim() ||
        vehicle.photoDataUrl ||
        vehicle.color.trim() ||
        vehicle.parkingSlot.trim()) &&
      (!vehicle.registrationNumber.trim() || !vehicle.unitId),
  );

  function updateVehicleDraft(vehicleId: string, updates: Partial<EditableVehicleDraft>) {
    setVehicles((currentVehicles) =>
      currentVehicles.map((vehicle) =>
        vehicle.id === vehicleId
          ? {
              ...vehicle,
              ...updates,
            }
          : vehicle,
      ),
    );
  }

  function addVehicleDraft() {
    setVehicles((currentVehicles) => [
      ...currentVehicles,
      createEditableVehicleDraft(selectedUnitIds[0] ?? ''),
    ]);
  }

  function removeVehicleDraft(vehicleId: string) {
    setVehicles((currentVehicles) =>
      currentVehicles.filter((vehicle) => vehicle.id !== vehicleId),
    );
  }

  async function attachProfilePhoto(capture?: 'user' | 'environment') {
    try {
      const photo = await pickResidentProfilePhoto(capture);

      if (!photo) {
        return;
      }

      setProfilePhotoDataUrl(photo.dataUrl);
      setProfilePhotoMessage(
        residentProfile === 'chairman'
          ? 'Chairman photo attached. This will be sent with the first-chairman claim.'
          : 'Resident photo attached. This will be saved with the residence profile.',
      );
    } catch (error) {
      setProfilePhotoMessage(
        error instanceof Error ? error.message : 'Could not attach the resident profile photo.',
      );
    }
  }

  async function attachVehiclePhoto(vehicleId: string, capture?: 'user' | 'environment') {
    try {
      const file = await pickWebFileAsDataUrl({
        accept: 'image/png,image/jpeg,image/webp',
        capture,
        maxSizeInBytes: 4 * 1024 * 1024,
        unsupportedMessage: 'Vehicle photo capture is available from the web workspace right now.',
        tooLargeMessage: 'Choose a vehicle photo smaller than 4 MB.',
        readErrorMessage: 'Could not read the selected vehicle photo.',
      });

      if (!file) {
        return;
      }

      const currentVehicle = vehicles.find((vehicle) => vehicle.id === vehicleId);
      const detectedRegistrationNumber = await tryDetectVehicleRegistrationFromDataUrl(file.dataUrl);

      updateVehicleDraft(vehicleId, {
        photoDataUrl: file.dataUrl,
        registrationNumber:
          detectedRegistrationNumber ?? currentVehicle?.registrationNumber ?? '',
        statusMessage: detectedRegistrationNumber
          ? `Vehicle number ${detectedRegistrationNumber} detected from the photo.`
          : 'Photo attached. Enter the vehicle number manually if it was not detected.',
      });
    } catch (error) {
      updateVehicleDraft(vehicleId, {
        statusMessage:
          error instanceof Error ? error.message : 'Could not attach the vehicle photo.',
      });
    }
  }

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
    setSelectedUnitIds([]);
    setResidentProfile(undefined);
    setStep(2);
  }

  function goToCityStep(cityName: string) {
    setSelectedCity(cityName);
    setSearchQuery('');
    setSelectedSocietyId(undefined);
    setSelectedUnitIds([]);
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

        {canCreateSociety ? (
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
        ) : null}
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
            title={
              canCreateSociety
                ? 'Page 4. Search the society and open the workspace'
                : 'Page 4. Search the society and choose the unit number'
            }
            description={
              canCreateSociety
                ? 'Super user can open any existing society directly from this list without joining it as a resident.'
                : 'Search by society name, then select the home, office, or shed number.'
            }
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
          const canOpenDirectly = canCreateSociety || isAlreadyLinked;
          const societyHasChairman = doesSocietyHaveChairman(state.data, society.id);

          return (
            <SurfaceCard key={society.id}>
              <View style={styles.cardHeader}>
                <View style={styles.headingBlock}>
                  <Text style={styles.cardTitle}>{society.name}</Text>
                  <Caption>{society.address}</Caption>
                </View>
                <Pill
                  label={getSocietyStructureLabel(society)}
                  tone="primary"
                />
              </View>

              <Caption>{society.tagline}</Caption>

              <View style={styles.metaRow}>
                <Pill label={society.city} tone="accent" />
                <Pill label={society.area} tone="warning" />
                <Pill
                  label={`${society.totalUnits} ${getSocietyUnitCollectionLabel(society)}`}
                  tone="primary"
                />
                {!societyHasChairman ? <Pill label="Chairman needed" tone="warning" /> : null}
                {isAlreadyLinked ? <Pill label="Already linked" tone="success" /> : null}
              </View>

              <ActionButton
                label={
                  canCreateSociety
                    ? 'Open admin workspace'
                    : isAlreadyLinked
                      ? 'Open linked workspace'
                      : isSelected
                      ? 'Selected society'
                      : 'Select society'
                }
                onPress={() => {
                  if (canOpenDirectly) {
                    actions.selectSociety(society.id);
                    return;
                  }

                  setSelectedSocietyId(society.id);
                  setSelectedUnitIds([]);
                }}
                variant={canOpenDirectly || isSelected ? 'primary' : 'secondary'}
              />
            </SurfaceCard>
          );
        })}

        {selectedSocietyId && !existingSocietyIds.has(selectedSocietyId) && !canCreateSociety ? (
          <SurfaceCard>
            <SectionHeader
              title="Choose one or more unit or space numbers"
              description={
                selectedSocietyHasChairman
                  ? 'Owners or tenants can claim one or more apartments, offices, sheds, or bungalows in one approval request.'
                  : 'This society does not have a chairman yet. Select your unit or space first, then continue to claim the first chairman role.'
              }
            />
            <View style={styles.choiceWrap}>
              {availableUnits.map((unit) => (
                <ChoiceChip
                  key={unit.id}
                  label={unit.code}
                  selected={selectedUnitIds.includes(unit.id)}
                  onPress={() =>
                    setSelectedUnitIds((currentUnitIds) =>
                      currentUnitIds.includes(unit.id)
                        ? currentUnitIds.filter((currentUnitId) => currentUnitId !== unit.id)
                        : [...currentUnitIds, unit.id],
                    )
                  }
                />
              ))}
            </View>
            <Caption>
              Selected: {selectedUnitIds.length > 0
                ? availableUnits
                    .filter((unit) => selectedUnitIds.includes(unit.id))
                    .map((unit) => unit.code)
                    .join(', ')
                : 'None yet'}
            </Caption>
            <ActionButton
              label="Next"
              onPress={() => setStep(4)}
              disabled={selectedUnitIds.length === 0}
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
            description={
              selectedSocietyHasChairman
                ? 'Choose how this mobile user belongs to the selected unit or commercial space.'
                : 'This society does not have a chairman yet. Submit the first-chairman claim using the selected unit or commercial space.'
            }
          />
          <View style={styles.summaryBlock}>
            <Caption>Country: {selectedCountry}</Caption>
            <Caption>City: {selectedCity}</Caption>
            <Caption>Society: {selectedSociety?.name ?? 'Not selected'}</Caption>
            <Caption>
              Selected numbers:{' '}
              {selectedUnitIds.length > 0
                ? availableUnits
                    .filter((unit) => selectedUnitIds.includes(unit.id))
                    .map((unit) => unit.code)
                    .join(', ')
                : 'Not selected'}
            </Caption>
          </View>

          <View style={styles.choiceWrap}>
            {selectedSocietyHasChairman ? (
              <>
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
              </>
            ) : (
              <ChoiceChip
                label="Claim first chairman access"
                selected={residentProfile === 'chairman'}
                onPress={() => setResidentProfile('chairman')}
              />
            )}
          </View>

          {!selectedSocietyHasChairman ? (
            <Caption>
              Resident enrollment is paused until the first chairman is approved. Submit this claim and the super user can activate the society leadership.
            </Caption>
          ) : null}

          <View style={styles.inlineSection}>
            <Text style={styles.formSectionTitle}>
              {residentProfile === 'chairman' ? 'Chairman photo' : 'Resident photo'}
            </Text>
            <Caption>
              {residentProfile === 'chairman'
                ? 'Attach a clear face photo for the first-chairman claim. The super user will review this together with your unit claim.'
                : 'You can add a resident photo now so the workspace profile is ready after approval.'}
            </Caption>
            <View style={styles.profilePhotoPanel}>
              {profilePhotoDataUrl ? (
                <Image source={{ uri: profilePhotoDataUrl }} style={styles.profilePhotoPreview} />
              ) : (
                <View style={styles.profilePhotoPlaceholder}>
                  <Text style={styles.profilePhotoPlaceholderText}>{currentUser?.avatarInitials ?? 'ME'}</Text>
                </View>
              )}
              <View style={styles.profilePhotoPanelCopy}>
                <Caption>
                  {profilePhotoDataUrl
                    ? residentProfile === 'chairman'
                      ? 'Chairman photo ready for submission.'
                      : 'Resident photo ready for submission.'
                    : residentProfile === 'chairman'
                      ? 'A photo is required before the first-chairman claim can be submitted.'
                      : 'Photo is optional, but helpful for the society directory.'}
                </Caption>
                <View style={styles.heroActions}>
                  <ActionButton
                    label="Take photo"
                    onPress={() => {
                      void attachProfilePhoto('user');
                    }}
                    variant="secondary"
                  />
                  <ActionButton
                    label={profilePhotoDataUrl ? 'Replace photo' : 'Upload photo'}
                    onPress={() => {
                      void attachProfilePhoto();
                    }}
                    variant="secondary"
                  />
                  {profilePhotoDataUrl ? (
                    <ActionButton
                      label="Remove photo"
                      onPress={() => {
                        setProfilePhotoDataUrl('');
                        setProfilePhotoMessage(
                          residentProfile === 'chairman'
                            ? 'Chairman photo removed.'
                            : 'Resident photo removed.',
                        );
                      }}
                      variant="danger"
                    />
                  ) : null}
                </View>
                {profilePhotoMessage ? <Caption>{profilePhotoMessage}</Caption> : null}
              </View>
            </View>
          </View>

          <View style={styles.inlineSection}>
            <Text style={styles.formSectionTitle}>Minimal resident information</Text>
            <Caption>
              Only basic verification details are collected here for society access, emergency contact, and tenancy review.
            </Caption>
            <View style={styles.formGrid}>
              <View style={styles.formField}>
                <InputField
                  label="Resident full name"
                  value={residentFullName}
                  onChangeText={(value) => {
                    setHasEditedResidentFullName(true);
                    setResidentFullName(value);
                  }}
                  placeholder="Enter full name"
                  autoCapitalize="words"
                />
              </View>
              <View style={styles.formField}>
                <InputField
                  label="Move-in date"
                  value={moveInDate}
                  onChangeText={setMoveInDate}
                  placeholder="YYYY-MM-DD"
                  autoCapitalize="none"
                  nativeType="date"
                />
              </View>
              <View style={styles.formField}>
                <InputField
                  label="Email for notices (optional)"
                  value={residentEmail}
                  onChangeText={(value) => {
                    setHasEditedResidentEmail(true);
                    setResidentEmail(value);
                  }}
                  placeholder="name@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  nativeType="email"
                />
              </View>
              <View style={styles.formField}>
                <InputField
                  label="Alternate mobile (optional)"
                  value={alternatePhone}
                  onChangeText={setAlternatePhone}
                  placeholder="+91 98765 43210"
                  keyboardType="phone-pad"
                />
              </View>
            </View>
            <View style={styles.summaryBlock}>
              <Caption>Verified mobile: {currentUser?.phone ?? 'Not available'}</Caption>
              <Caption>
                This verified number stays linked to the account and helps avoid collecting duplicate personal data.
              </Caption>
            </View>
          </View>

          {shouldShowBusinessSection ? (
            <View style={styles.inlineSection}>
              <Text style={styles.formSectionTitle}>Business details</Text>
              <Caption>
                If this office or shed is used for a business, add the business name and a short description so the approval flow and society directory reflect the commercial occupant correctly.
              </Caption>
              <View style={styles.formGrid}>
                <View style={styles.formField}>
                  <InputField
                    label="Business name (optional)"
                    value={businessName}
                    onChangeText={setBusinessName}
                    placeholder="Mindsflux Technologies"
                    autoCapitalize="words"
                  />
                </View>
              </View>
              <InputField
                label="Business details (optional)"
                value={businessDetails}
                onChangeText={setBusinessDetails}
                placeholder="Software development office, consulting studio, warehouse operations, fabrication unit, etc."
                multiline
              />
            </View>
          ) : null}

          <View style={styles.inlineSection}>
            <Text style={styles.formSectionTitle}>Emergency contacts</Text>
            <Caption>
              Add one or two people the society can reach during medical, access, or household emergencies.
            </Caption>
            <View style={styles.formGrid}>
              <View style={styles.formField}>
                <InputField
                  label="Primary emergency contact name"
                  value={emergencyContactName}
                  onChangeText={setEmergencyContactName}
                  placeholder="Family contact"
                  autoCapitalize="words"
                />
              </View>
              <View style={styles.formField}>
                <InputField
                  label="Primary emergency contact mobile"
                  value={emergencyContactPhone}
                  onChangeText={setEmergencyContactPhone}
                  placeholder="+91 98980 55555"
                  keyboardType="phone-pad"
                />
              </View>
              <View style={styles.formField}>
                <InputField
                  label="Secondary emergency contact name (optional)"
                  value={secondaryEmergencyContactName}
                  onChangeText={setSecondaryEmergencyContactName}
                  placeholder="Neighbour or relative"
                  autoCapitalize="words"
                />
              </View>
              <View style={styles.formField}>
                <InputField
                  label="Secondary emergency contact mobile (optional)"
                  value={secondaryEmergencyContactPhone}
                  onChangeText={setSecondaryEmergencyContactPhone}
                  placeholder="+91 98980 66666"
                  keyboardType="phone-pad"
                />
              </View>
            </View>
          </View>

          <View style={styles.inlineSection}>
            <Text style={styles.formSectionTitle}>Vehicle details</Text>
            <Caption>
              Add resident vehicles now so security and the society directory can stay in sync. You can take a picture and we will try to read the number automatically.
            </Caption>
            <View style={styles.heroActions}>
              <ActionButton label="Add vehicle" onPress={addVehicleDraft} variant="secondary" />
            </View>
            {vehicles.length > 0 ? vehicles.map((vehicle, index) => (
              <View key={vehicle.id} style={styles.vehicleCard}>
                <View style={styles.rowBetween}>
                  <Text style={styles.formSectionTitle}>Vehicle {index + 1}</Text>
                  <ActionButton
                    label="Remove"
                    variant="danger"
                    onPress={() => removeVehicleDraft(vehicle.id)}
                  />
                </View>
                <View style={styles.choiceWrap}>
                  {([
                    { key: 'car' as const, label: 'Car' },
                    { key: 'bike' as const, label: 'Bike' },
                    { key: 'scooter' as const, label: 'Scooter' },
                  ]).map((option) => (
                    <ChoiceChip
                      key={`${vehicle.id}-${option.key}`}
                      label={option.label}
                      selected={vehicle.vehicleType === option.key}
                      onPress={() => updateVehicleDraft(vehicle.id, { vehicleType: option.key })}
                    />
                  ))}
                </View>
                {selectedUnits.length > 0 ? (
                  <View style={styles.choiceWrap}>
                    {selectedUnits.map((unit) => (
                      <ChoiceChip
                        key={`${vehicle.id}-${unit.id}`}
                        label={unit.code}
                        selected={vehicle.unitId === unit.id}
                        onPress={() => updateVehicleDraft(vehicle.id, { unitId: unit.id })}
                      />
                    ))}
                  </View>
                ) : null}
                <View style={styles.formGrid}>
                  <View style={styles.formField}>
                    <InputField
                      label="Vehicle number"
                      value={vehicle.registrationNumber}
                      onChangeText={(value) =>
                        updateVehicleDraft(vehicle.id, {
                          registrationNumber: value.toUpperCase(),
                          statusMessage: '',
                        })}
                      placeholder="GJ01AB1234"
                      autoCapitalize="characters"
                    />
                  </View>
                  <View style={styles.formField}>
                    <InputField
                      label="Color (optional)"
                      value={vehicle.color}
                      onChangeText={(value) => updateVehicleDraft(vehicle.id, { color: value })}
                      placeholder="Pearl white"
                    />
                  </View>
                  <View style={styles.formField}>
                    <InputField
                      label="Parking slot (optional)"
                      value={vehicle.parkingSlot}
                      onChangeText={(value) => updateVehicleDraft(vehicle.id, { parkingSlot: value })}
                      placeholder="Basement P1-12"
                    />
                  </View>
                </View>
                <View style={styles.heroActions}>
                  <ActionButton
                    label="Take vehicle photo"
                    onPress={() => {
                      void attachVehiclePhoto(vehicle.id, 'environment');
                    }}
                    variant="secondary"
                  />
                  <ActionButton
                    label={vehicle.photoDataUrl ? 'Replace photo' : 'Upload photo'}
                    onPress={() => {
                      void attachVehiclePhoto(vehicle.id);
                    }}
                    variant="secondary"
                  />
                </View>
                {vehicle.statusMessage ? <Caption>{vehicle.statusMessage}</Caption> : null}
                {vehicle.photoDataUrl ? (
                  <View style={styles.vehiclePhotoCard}>
                    <Image source={{ uri: vehicle.photoDataUrl }} style={styles.vehiclePhoto} />
                  </View>
                ) : null}
              </View>
            )) : (
              <Caption>No vehicle added yet. You can still continue and add it later.</Caption>
            )}
          </View>

          {residentProfile === 'tenant' ? (
            <View style={styles.inlineSection}>
              <Text style={styles.formSectionTitle}>Tenant rent agreement</Text>
              <Caption>
                Upload the current rent agreement here. You can also replace it later from the resident workspace.
              </Caption>
              <View style={styles.choiceWrap}>
                <Pill label="Tenant flag enabled" tone="accent" />
                <Pill
                  label={rentAgreementFileName ? 'Agreement uploaded' : 'Agreement pending'}
                  tone={rentAgreementFileName ? 'success' : 'warning'}
                />
              </View>
              <ActionButton
                label={rentAgreementFileName ? 'Replace rent agreement' : 'Upload rent agreement'}
                onPress={async () => {
                  try {
                    const file = await pickWebFileAsDataUrl({
                      accept: 'application/pdf,image/png,image/jpeg,image/webp',
                      maxSizeInBytes: 4 * 1024 * 1024,
                      unsupportedMessage: 'Rent agreement upload is available from the web workspace right now.',
                      tooLargeMessage: 'Choose a rent agreement file smaller than 4 MB.',
                      readErrorMessage: 'Could not read the selected rent agreement file.',
                    });

                    if (!file) {
                      return;
                    }

                    setRentAgreementFileName(file.fileName);
                    setRentAgreementDataUrl(file.dataUrl);
                    setRentAgreementMessage(`${file.fileName} is attached.`);
                  } catch (error) {
                    setRentAgreementMessage(error instanceof Error ? error.message : 'Could not upload the rent agreement.');
                  }
                }}
                variant="secondary"
              />
              {rentAgreementFileName ? <Caption>Selected file: {rentAgreementFileName}</Caption> : null}
              {rentAgreementMessage ? <Caption>{rentAgreementMessage}</Caption> : null}
            </View>
          ) : null}

          <View style={styles.inlineSection}>
            <Text style={styles.formSectionTitle}>Privacy confirmation</Text>
            <Caption>
              Confirm that the society may use this limited data only for access control, occupancy verification, emergency contact, and tenancy review.
            </Caption>
            <View style={styles.choiceWrap}>
              <ChoiceChip
                label="Privacy notice accepted"
                selected={dataProtectionConsent}
                onPress={() => setDataProtectionConsent((currentValue) => !currentValue)}
              />
            </View>
          </View>

          <Caption>
            {residentProfile === 'chairman'
              ? 'Your first-chairman claim will be sent to the platform super user for confirmation. After approval, you can open the admin workspace and start approving resident requests.'
              : 'Your claim will be sent to the society chairman for confirmation before access is granted. This supports members who own or manage multiple units or office spaces in the same society.'}
          </Caption>

          <ActionButton
            label={
              state.isSyncing
                ? 'Sending request...'
                : residentProfile === 'chairman'
                  ? 'Send first-chairman claim'
                  : 'Send request for chairman approval'
            }
            onPress={() =>
              actions.enrollIntoSociety(
                selectedSocietyId ?? '',
                selectedUnitIds,
                residentProfile ?? 'owner',
                {
                  residentType: residentProfile ?? 'owner',
                  fullName: residentFullName,
                  photoDataUrl: profilePhotoDataUrl || undefined,
                  email: residentEmail,
                  businessName: shouldShowBusinessSection ? businessName : undefined,
                  businessDetails: shouldShowBusinessSection ? businessDetails : undefined,
                  alternatePhone,
                  emergencyContactName,
                  emergencyContactPhone,
                  secondaryEmergencyContactName,
                  secondaryEmergencyContactPhone,
                  vehicles: vehicles
                    .filter(
                      (vehicle) =>
                        vehicle.registrationNumber.trim() ||
                        vehicle.photoDataUrl ||
                        vehicle.color.trim() ||
                        vehicle.parkingSlot.trim(),
                    )
                    .map((vehicle) => ({
                      unitId: vehicle.unitId,
                      registrationNumber: vehicle.registrationNumber,
                      vehicleType: vehicle.vehicleType,
                      color: vehicle.color,
                      parkingSlot: vehicle.parkingSlot,
                      photoDataUrl: vehicle.photoDataUrl || undefined,
                    })),
                  moveInDate,
                  dataProtectionConsent,
                  rentAgreementFileName: residentProfile === 'tenant' ? rentAgreementFileName : undefined,
                  rentAgreementDataUrl: residentProfile === 'tenant' ? rentAgreementDataUrl : undefined,
                },
              )
            }
            disabled={
              state.isSyncing ||
              !selectedSocietyId ||
              selectedUnitIds.length === 0 ||
              !residentProfile ||
              !residentFullName.trim() ||
              !moveInDate ||
              hasIncompleteVehicle ||
              (residentProfile === 'chairman' && !profilePhotoDataUrl) ||
              !dataProtectionConsent
            }
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
        subtitle="Login with OTP, choose the country, browse city tiles, search the society, select the right unit or space number, and finish with the residence profile."
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
  inlineSection: {
    gap: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#EFE5D9',
  },
  formGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  formField: {
    flexGrow: 1,
    flexBasis: 220,
  },
  formSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: palette.ink,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  summaryBlock: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: palette.surfaceMuted,
  },
  vehicleCard: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surfaceMuted,
  },
  vehiclePhotoCard: {
    alignSelf: 'flex-start',
    padding: spacing.xs,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.white,
  },
  vehiclePhoto: {
    width: 200,
    height: 150,
    borderRadius: radius.md,
    backgroundColor: '#F4F1EB',
  },
  profilePhotoPanel: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surfaceMuted,
  },
  profilePhotoPanelCopy: {
    flex: 1,
    minWidth: 220,
    gap: spacing.sm,
  },
  profilePhotoPreview: {
    width: 128,
    height: 128,
    borderRadius: radius.lg,
    backgroundColor: '#F4F1EB',
  },
  profilePhotoPlaceholder: {
    width: 128,
    height: 128,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.primarySoft,
  },
  profilePhotoPlaceholderText: {
    fontSize: 28,
    fontWeight: '800',
    color: palette.primary,
  },
});
