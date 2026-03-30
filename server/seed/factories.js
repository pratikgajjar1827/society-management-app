function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function expandOfficeNumbersInput(value) {
  return String(value ?? '')
    .split(/[\n,;]+/g)
    .map((part) => part.trim())
    .filter(Boolean)
    .flatMap((part) => {
      const rangeMatch = part.match(/^(\d+)\s*-\s*(\d+)$/);

      if (!rangeMatch) {
        return [part];
      }

      const rangeStart = Number.parseInt(rangeMatch[1], 10);
      const rangeEnd = Number.parseInt(rangeMatch[2], 10);

      if (!Number.isFinite(rangeStart) || !Number.isFinite(rangeEnd) || rangeEnd < rangeStart) {
        return [];
      }

      const padWidth = Math.max(rangeMatch[1].length, rangeMatch[2].length);

      return Array.from({ length: rangeEnd - rangeStart + 1 }, (_, index) =>
        String(rangeStart + index).padStart(padWidth, '0'),
      );
    });
}

function normalizeOfficeFloorPlan(officeFloorPlan = []) {
  return officeFloorPlan.map((floor, index) => ({
    floorLabel: floor.floorLabel.trim() || `Floor ${index + 1}`,
    officeCodes: expandOfficeNumbersInput(floor.officeNumbers),
  }));
}

function countOfficeUnits(officeFloorPlan = []) {
  return normalizeOfficeFloorPlan(officeFloorPlan).reduce(
    (total, floor) => total + floor.officeCodes.length,
    0,
  );
}

function findDuplicateOfficeCodes(officeFloorPlan = []) {
  const seen = new Set();
  const duplicates = new Set();

  normalizeOfficeFloorPlan(officeFloorPlan).forEach((floor) => {
    floor.officeCodes.forEach((officeCode) => {
      const normalized = officeCode.toLowerCase();

      if (seen.has(normalized)) {
        duplicates.add(officeCode);
        return;
      }

      seen.add(normalized);
    });
  });

  return [...duplicates];
}

function normalizeApartmentBlockPlan(apartmentBlockPlan = []) {
  return apartmentBlockPlan.map((block, index) => {
    const parsedTowerCount = Number.parseInt(String(block.towerCount ?? '').trim(), 10);
    const parsedFloorCount = Number.parseInt(String(block.floorsPerTower ?? '').trim(), 10);
    const parsedHomesPerFloor = Number.parseInt(String(block.homesPerFloor ?? '').trim(), 10);

    return {
      blockName: String(block.blockName ?? '').trim() || `Block ${String.fromCharCode(65 + index)}`,
      towerCount: Number.isFinite(parsedTowerCount) ? parsedTowerCount : 0,
      floorsPerTower: Number.isFinite(parsedFloorCount) ? parsedFloorCount : 0,
      homesPerFloor: Number.isFinite(parsedHomesPerFloor) ? parsedHomesPerFloor : 0,
    };
  });
}

function countApartmentUnits(apartmentBlockPlan = []) {
  return normalizeApartmentBlockPlan(apartmentBlockPlan).reduce(
    (total, block) => total + (block.towerCount * block.floorsPerTower * block.homesPerFloor),
    0,
  );
}

function normalizeApartmentStartingFloorNumber(value) {
  const parsed = Number.parseInt(String(value ?? '').trim(), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function formatApartmentUnitNumber(displayedFloorNumber, homeNumber) {
  return `${displayedFloorNumber}${String(homeNumber).padStart(2, '0')}`;
}

function createUnitStructure(societyId, structure, totalUnits, options = {}) {
  if (structure === 'bungalow') {
    const units = Array.from({ length: totalUnits }, (_, index) => {
      const plotNumber = String(index + 1).padStart(2, '0');
      return {
        id: `${societyId}-unit-plot-${plotNumber}`,
        societyId,
        code: `Plot ${plotNumber}`,
        areaSqft: 1800 + index * 30,
        occupancyStatus: 'occupied',
        unitType: 'plot',
      };
    });

    return { buildings: [], units };
  }

  if (structure === 'commercial') {
    if (options.commercialSpaceType === 'office' && Array.isArray(options.officeFloorPlan)) {
      const configuredFloors = normalizeOfficeFloorPlan(options.officeFloorPlan).filter(
        (floor) => floor.officeCodes.length > 0,
      );
      const buildings = configuredFloors.map((floor, index) => ({
        id: `${societyId}-building-office-${slugify(floor.floorLabel) || `floor-${index + 1}`}`,
        societyId,
        name: floor.floorLabel,
        sortOrder: index + 1,
      }));
      const units = [];

      buildings.forEach((building, floorIndex) => {
        configuredFloors[floorIndex].officeCodes.forEach((officeCode, officeIndex) => {
          units.push({
            id: `${societyId}-unit-office-${slugify(`${building.name}-${officeCode}`) || `${floorIndex + 1}-${officeIndex + 1}`}`,
            societyId,
            buildingId: building.id,
            code: officeCode,
            areaSqft: 650 + units.length * 18,
            occupancyStatus: 'occupied',
            unitType: 'office',
          });
        });
      });

      return { buildings, units };
    }

    const units = Array.from({ length: totalUnits }, (_, index) => {
      const shedNumber = String(index + 1).padStart(2, '0');
      return {
        id: `${societyId}-unit-shed-${shedNumber}`,
        societyId,
        code: `Shed ${shedNumber}`,
        areaSqft: 900 + index * 35,
        occupancyStatus: 'occupied',
        unitType: 'shed',
      };
    });

    return { buildings: [], units };
  }

  if (Array.isArray(options.apartmentBlockPlan) && options.apartmentBlockPlan.length > 0) {
    const apartmentStartingFloorNumber = normalizeApartmentStartingFloorNumber(
      options.apartmentStartingFloorNumber,
    );
    const normalizedBlocks = normalizeApartmentBlockPlan(options.apartmentBlockPlan).filter(
      (block) => block.towerCount > 0 && block.floorsPerTower > 0 && block.homesPerFloor > 0,
    );
    const buildings = [];
    const units = [];

    normalizedBlocks.forEach((block, blockIndex) => {
      for (let towerIndex = 0; towerIndex < block.towerCount; towerIndex += 1) {
        const towerLabel = `Tower ${towerIndex + 1}`;
        const buildingName = block.towerCount === 1 ? block.blockName : `${block.blockName} - ${towerLabel}`;
        const buildingId = `${societyId}-building-${slugify(buildingName) || `block-${blockIndex + 1}-tower-${towerIndex + 1}`}`;

        buildings.push({
          id: buildingId,
          societyId,
          name: buildingName,
          sortOrder: buildings.length + 1,
        });

        for (let floorIndex = 0; floorIndex < block.floorsPerTower; floorIndex += 1) {
          const displayedFloorNumber = apartmentStartingFloorNumber + floorIndex;

          for (let homeIndex = 0; homeIndex < block.homesPerFloor; homeIndex += 1) {
            const homeNumber = homeIndex + 1;
            const unitNumber = formatApartmentUnitNumber(displayedFloorNumber, homeNumber);
            const unitCode =
              block.towerCount === 1
                ? `${block.blockName}-${unitNumber}`
                : `${block.blockName}-T${towerIndex + 1}-${unitNumber}`;

            units.push({
              id: `${societyId}-unit-${slugify(unitCode) || `flat-${units.length + 1}`}`,
              societyId,
              buildingId,
              code: unitCode,
              areaSqft: 1180 + units.length * 15,
              occupancyStatus: 'occupied',
              unitType: 'flat',
            });
          }
        }
      }
    });

    return { buildings, units };
  }

  const buildingCount = totalUnits > 32 ? 3 : totalUnits > 16 ? 2 : 1;
  const buildingNames = ['Tower A', 'Tower B', 'Tower C'];

  const buildings = Array.from({ length: buildingCount }, (_, index) => ({
    id: `${societyId}-building-${slugify(buildingNames[index])}`,
    societyId,
    name: buildingNames[index],
    sortOrder: index + 1,
  }));

  const units = [];
  const baseUnitsPerBuilding = Math.floor(totalUnits / buildingCount);
  const remainingUnits = totalUnits % buildingCount;
  const apartmentStartingFloorNumber = normalizeApartmentStartingFloorNumber(
    options.apartmentStartingFloorNumber,
  );

  buildings.forEach((building, buildingIndex) => {
    const unitsForBuilding = baseUnitsPerBuilding + (buildingIndex < remainingUnits ? 1 : 0);
    const buildingLabel = String.fromCharCode(65 + buildingIndex);

    for (let unitIndex = 0; unitIndex < unitsForBuilding; unitIndex += 1) {
      const displayedFloorNumber = apartmentStartingFloorNumber + Math.floor(unitIndex / 4);
      const unitOnFloor = (unitIndex % 4) + 1;
      const unitNumber = formatApartmentUnitNumber(displayedFloorNumber, unitOnFloor);

      units.push({
        id: `${societyId}-unit-${buildingLabel.toLowerCase()}-${unitNumber}`,
        societyId,
        buildingId: building.id,
        code: `${buildingLabel}-${unitNumber}`,
        areaSqft: 1180 + units.length * 15,
        occupancyStatus: 'occupied',
        unitType: 'flat',
      });
    }
  });

  return { buildings, units };
}

const fullDayVenueSchedule = [
  { dayGroup: 'allDays', slotLabel: 'Full day reservation', startTime: '06:00', endTime: '23:00', capacity: 1 },
];
const sportsCourtSchedule = [
  { dayGroup: 'allDays', slotLabel: 'Morning sport slot', startTime: '06:00', endTime: '09:00', capacity: 1 },
  { dayGroup: 'allDays', slotLabel: 'Day sport slot', startTime: '09:00', endTime: '17:00', capacity: 1 },
  { dayGroup: 'allDays', slotLabel: 'Evening sport slot', startTime: '17:00', endTime: '22:00', capacity: 1 },
];
const fitnessSchedule = [
  { dayGroup: 'allDays', slotLabel: 'Morning wellness slot', startTime: '06:00', endTime: '10:00', capacity: 30 },
  { dayGroup: 'allDays', slotLabel: 'Day wellness slot', startTime: '10:00', endTime: '16:00', capacity: 20 },
  { dayGroup: 'allDays', slotLabel: 'Evening wellness slot', startTime: '16:00', endTime: '22:00', capacity: 30 },
];
const poolSchedule = [
  { dayGroup: 'allDays', slotLabel: 'Morning swim slot', startTime: '06:00', endTime: '10:00', capacity: 24 },
  { dayGroup: 'allDays', slotLabel: 'Family swim slot', startTime: '10:00', endTime: '17:00', capacity: 28 },
  { dayGroup: 'allDays', slotLabel: 'Evening swim slot', startTime: '17:00', endTime: '21:00', capacity: 24 },
];
const loungeSchedule = [
  { dayGroup: 'allDays', slotLabel: 'Morning access', startTime: '08:00', endTime: '13:00', capacity: 18 },
  { dayGroup: 'allDays', slotLabel: 'Afternoon access', startTime: '13:00', endTime: '18:00', capacity: 18 },
  { dayGroup: 'allDays', slotLabel: 'Evening access', startTime: '18:00', endTime: '22:00', capacity: 12 },
];
const parkingSchedule = [
  { dayGroup: 'allDays', slotLabel: 'Overnight parking', startTime: '00:00', endTime: '08:00', capacity: 12 },
  { dayGroup: 'allDays', slotLabel: 'Day parking', startTime: '08:00', endTime: '18:00', capacity: 12 },
  { dayGroup: 'allDays', slotLabel: 'Evening parking', startTime: '18:00', endTime: '23:59', capacity: 12 },
];

const amenityBlueprints = {
  'Clubhouse Hall': { bookingType: 'exclusive', reservationScope: 'timeSlot', approvalMode: 'committee', priceInr: 2500, scheduleTemplate: loungeSchedule },
  'Banquet Hall': { bookingType: 'exclusive', reservationScope: 'fullDay', approvalMode: 'committee', priceInr: 6000, scheduleTemplate: fullDayVenueSchedule },
  'Community Hall': { bookingType: 'exclusive', reservationScope: 'fullDay', approvalMode: 'committee', priceInr: 1800, scheduleTemplate: fullDayVenueSchedule },
  'Party Lawn': { bookingType: 'exclusive', reservationScope: 'fullDay', approvalMode: 'committee', priceInr: 4500, scheduleTemplate: fullDayVenueSchedule },
  'Guest Suites': { bookingType: 'exclusive', reservationScope: 'fullDay', approvalMode: 'auto', priceInr: 2200, scheduleTemplate: fullDayVenueSchedule },
  'Coworking Lounge': { bookingType: 'capacity', reservationScope: 'timeSlot', approvalMode: 'auto', capacity: 24, scheduleTemplate: loungeSchedule },
  'Business Lounge': { bookingType: 'capacity', reservationScope: 'timeSlot', approvalMode: 'auto', capacity: 12, scheduleTemplate: loungeSchedule },
  'Cafe Lounge': { bookingType: 'info', reservationScope: 'timeSlot', approvalMode: 'auto' },
  Gym: { bookingType: 'capacity', reservationScope: 'timeSlot', approvalMode: 'auto', capacity: 30, scheduleTemplate: fitnessSchedule },
  'Swimming Pool': { bookingType: 'capacity', reservationScope: 'timeSlot', approvalMode: 'auto', capacity: 24, scheduleTemplate: poolSchedule },
  'Indoor Games Lounge': { bookingType: 'capacity', reservationScope: 'timeSlot', approvalMode: 'auto', capacity: 20, scheduleTemplate: loungeSchedule },
  'Badminton Court': { bookingType: 'exclusive', reservationScope: 'timeSlot', approvalMode: 'auto', priceInr: 250, scheduleTemplate: sportsCourtSchedule },
  'Squash Court': { bookingType: 'exclusive', reservationScope: 'timeSlot', approvalMode: 'auto', priceInr: 250, scheduleTemplate: sportsCourtSchedule },
  'Tennis Court': { bookingType: 'exclusive', reservationScope: 'timeSlot', approvalMode: 'auto', priceInr: 300, scheduleTemplate: sportsCourtSchedule },
  'Basketball Court': { bookingType: 'capacity', reservationScope: 'timeSlot', approvalMode: 'auto', capacity: 10, scheduleTemplate: sportsCourtSchedule },
  'Childrens Play Area': { bookingType: 'info', reservationScope: 'timeSlot', approvalMode: 'auto' },
  'Senior Citizen Lounge': { bookingType: 'info', reservationScope: 'timeSlot', approvalMode: 'auto' },
  'Pet Park': { bookingType: 'capacity', reservationScope: 'timeSlot', approvalMode: 'auto', capacity: 12, scheduleTemplate: loungeSchedule },
  'BBQ Deck': { bookingType: 'exclusive', reservationScope: 'timeSlot', approvalMode: 'committee', priceInr: 1500, scheduleTemplate: loungeSchedule },
  'Yoga Deck': { bookingType: 'capacity', reservationScope: 'timeSlot', approvalMode: 'auto', capacity: 20, scheduleTemplate: fitnessSchedule },
  'Walking Track': { bookingType: 'info', reservationScope: 'timeSlot', approvalMode: 'auto' },
  Garden: { bookingType: 'info', reservationScope: 'timeSlot', approvalMode: 'auto' },
  'Guest Parking': { bookingType: 'capacity', reservationScope: 'timeSlot', approvalMode: 'auto', capacity: 12, scheduleTemplate: parkingSchedule },
};

function createAmenitiesFromSelection(societyId, selectedAmenities) {
  const amenities = selectedAmenities.map((name) => {
    const blueprint = amenityBlueprints[name] ?? {
      bookingType: 'exclusive',
      reservationScope: 'timeSlot',
      approvalMode: 'auto',
      capacity: 1,
      scheduleTemplate: sportsCourtSchedule,
    };

    return {
      id: `${societyId}-amenity-${slugify(name)}`,
      societyId,
      name,
      bookingType: blueprint.bookingType,
      reservationScope: blueprint.reservationScope,
      approvalMode: blueprint.approvalMode,
      capacity: blueprint.capacity,
      priceInr: blueprint.priceInr,
    };
  });

  const rules = amenities.flatMap((amenity) => {
    if (amenity.bookingType === 'info') {
      return [];
    }

    const blueprint = amenityBlueprints[amenity.name];
    const scheduleTemplate = blueprint?.scheduleTemplate ?? sportsCourtSchedule;

    return scheduleTemplate.map((rule, index) => ({
      id: `${amenity.id}-rule-${index + 1}`,
      amenityId: amenity.id,
      dayGroup: rule.dayGroup,
      slotLabel: rule.slotLabel,
      startTime: rule.startTime,
      endTime: rule.endTime,
      capacity: rule.capacity ?? amenity.capacity ?? 1,
      blackoutDates: [],
    }));
  });

  return { amenities, rules };
}

module.exports = {
  countApartmentUnits,
  countOfficeUnits,
  createAmenitiesFromSelection,
  createUnitStructure,
  formatApartmentUnitNumber,
  findDuplicateOfficeCodes,
  normalizeApartmentBlockPlan,
  normalizeApartmentStartingFloorNumber,
  normalizeOfficeFloorPlan,
};
