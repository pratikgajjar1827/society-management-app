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
        id: `${societyId}-building-${slugify(floor.floorLabel) || `floor-${index + 1}`}`,
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

  buildings.forEach((building, buildingIndex) => {
    const unitsForBuilding = baseUnitsPerBuilding + (buildingIndex < remainingUnits ? 1 : 0);
    const buildingLabel = String.fromCharCode(65 + buildingIndex);

    for (let unitIndex = 0; unitIndex < unitsForBuilding; unitIndex += 1) {
      const floorNumber = Math.floor(unitIndex / 4) + 1;
      const unitOnFloor = (unitIndex % 4) + 1;
      const unitNumber = floorNumber * 100 + unitOnFloor;

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

const amenityBlueprints = {
  'Clubhouse Hall': { bookingType: 'exclusive', approvalMode: 'committee', priceInr: 2500 },
  Gym: { bookingType: 'capacity', approvalMode: 'auto', capacity: 30 },
  'Swimming Pool': { bookingType: 'capacity', approvalMode: 'auto', capacity: 18 },
  'Tennis Court': { bookingType: 'exclusive', approvalMode: 'auto', priceInr: 300 },
  'Guest Parking': { bookingType: 'capacity', approvalMode: 'auto', capacity: 8 },
  'Party Lawn': { bookingType: 'exclusive', approvalMode: 'committee', priceInr: 4500 },
  Garden: { bookingType: 'info', approvalMode: 'auto' },
  'Walking Track': { bookingType: 'info', approvalMode: 'auto' },
  'Community Hall': { bookingType: 'exclusive', approvalMode: 'committee', priceInr: 1800 },
};

function createAmenitiesFromSelection(societyId, selectedAmenities) {
  const amenities = selectedAmenities.map((name) => {
    const blueprint = amenityBlueprints[name] ?? {
      bookingType: 'exclusive',
      approvalMode: 'auto',
      capacity: 1,
    };

    return {
      id: `${societyId}-amenity-${slugify(name)}`,
      societyId,
      name,
      bookingType: blueprint.bookingType,
      approvalMode: blueprint.approvalMode,
      capacity: blueprint.capacity,
      priceInr: blueprint.priceInr,
    };
  });

  const rules = amenities.flatMap((amenity) => {
    if (amenity.bookingType === 'info') {
      return [];
    }

    return [
      {
        id: `${amenity.id}-rule-morning`,
        amenityId: amenity.id,
        dayGroup: 'allDays',
        slotLabel: 'Morning',
        startTime: '06:00',
        endTime: amenity.bookingType === 'exclusive' ? '08:00' : '10:00',
        capacity: amenity.capacity ?? 1,
        blackoutDates: [],
      },
      {
        id: `${amenity.id}-rule-evening`,
        amenityId: amenity.id,
        dayGroup: 'allDays',
        slotLabel: 'Evening',
        startTime: amenity.bookingType === 'exclusive' ? '18:00' : '17:00',
        endTime: '21:00',
        capacity: amenity.capacity ?? 1,
        blackoutDates: [],
      },
    ];
  });

  return { amenities, rules };
}

module.exports = {
  countOfficeUnits,
  createAmenitiesFromSelection,
  createUnitStructure,
  findDuplicateOfficeCodes,
  normalizeOfficeFloorPlan,
};
