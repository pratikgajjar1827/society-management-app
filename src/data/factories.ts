import {
  Amenity,
  AmenityScheduleRule,
  Building,
  SocietyStructure,
  Unit,
} from '../types/domain';

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export function createUnitStructure(
  societyId: string,
  structure: SocietyStructure,
  totalUnits: number,
): { buildings: Building[]; units: Unit[] } {
  if (structure === 'bungalow') {
    const units: Unit[] = Array.from({ length: totalUnits }, (_, index) => {
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

  const buildingCount = totalUnits > 32 ? 3 : totalUnits > 16 ? 2 : 1;
  const buildingNames = ['Tower A', 'Tower B', 'Tower C'];

  const buildings: Building[] = Array.from({ length: buildingCount }, (_, index) => ({
    id: `${societyId}-building-${slugify(buildingNames[index])}`,
    societyId,
    name: buildingNames[index],
    sortOrder: index + 1,
  }));

  const units: Unit[] = [];
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

type AmenityBlueprint = {
  bookingType: Amenity['bookingType'];
  approvalMode: Amenity['approvalMode'];
  capacity?: number;
  priceInr?: number;
};

const amenityBlueprints: Record<string, AmenityBlueprint> = {
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

export function createAmenitiesFromSelection(
  societyId: string,
  selectedAmenities: string[],
): { amenities: Amenity[]; rules: AmenityScheduleRule[] } {
  const amenities: Amenity[] = selectedAmenities.map((name) => {
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

  const rules: AmenityScheduleRule[] = amenities.flatMap((amenity) => {
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
