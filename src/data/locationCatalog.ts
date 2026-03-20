export interface CityTile {
  id: string;
  name: string;
  famousFor: string;
  imageUrl: string;
  imagePageTitle: string;
}

export interface CountryTile {
  id: string;
  name: string;
  flag: string;
  subtitle: string;
  cities: CityTile[];
}

function landmarkImage(query: string) {
  return `https://source.unsplash.com/featured/1200x800/?${encodeURIComponent(query)}`;
}

export const locationCatalog: CountryTile[] = [
  {
    id: 'india',
    name: 'India',
    flag: 'IN',
    subtitle: 'Apartments, bungalows, gated communities, and township societies',
    cities: [
      {
        id: 'india-ahmedabad',
        name: 'Ahmedabad',
        famousFor: 'Riverfront, pol culture, and fast-growing townships',
        imageUrl: landmarkImage('Sabarmati Riverfront Ahmedabad India'),
        imagePageTitle: 'Sabarmati_Riverfront',
      },
      {
        id: 'india-mumbai',
        name: 'Mumbai',
        famousFor: 'Marine Drive, business districts, and high-rise living',
        imageUrl: landmarkImage('Gateway of India Mumbai India'),
        imagePageTitle: 'Gateway_of_India',
      },
      {
        id: 'india-delhi',
        name: 'Delhi',
        famousFor: 'Historic monuments, capital districts, and dense residential hubs',
        imageUrl: landmarkImage('India Gate Delhi India'),
        imagePageTitle: 'India_Gate',
      },
      {
        id: 'india-bengaluru',
        name: 'Bengaluru',
        famousFor: 'Tech corridors, gated apartments, and clubhouse communities',
        imageUrl: landmarkImage('Vidhana Soudha Bengaluru India'),
        imagePageTitle: 'Vidhana_Soudha',
      },
      {
        id: 'india-hyderabad',
        name: 'Hyderabad',
        famousFor: 'Charminar, IT parks, and modern residential enclaves',
        imageUrl: landmarkImage('Charminar Hyderabad India'),
        imagePageTitle: 'Charminar',
      },
      {
        id: 'india-pune',
        name: 'Pune',
        famousFor: 'Township projects, education hubs, and family housing clusters',
        imageUrl: landmarkImage('Shaniwar Wada Pune India'),
        imagePageTitle: 'Shaniwar_Wada',
      },
      {
        id: 'india-chennai',
        name: 'Chennai',
        famousFor: 'Marina Beach, IT corridors, and large residential neighborhoods',
        imageUrl: landmarkImage('Marina Beach Chennai India'),
        imagePageTitle: 'Marina_Beach',
      },
      {
        id: 'india-kolkata',
        name: 'Kolkata',
        famousFor: 'Howrah Bridge, heritage districts, and dense urban communities',
        imageUrl: landmarkImage('Howrah Bridge Kolkata India'),
        imagePageTitle: 'Howrah_Bridge',
      },
      {
        id: 'india-jaipur',
        name: 'Jaipur',
        famousFor: 'Pink City heritage, walled neighborhoods, and villa clusters',
        imageUrl: landmarkImage('Hawa Mahal Jaipur India'),
        imagePageTitle: 'Hawa_Mahal',
      },
      {
        id: 'india-surat',
        name: 'Surat',
        famousFor: 'Textile commerce, rapid urban growth, and new apartment townships',
        imageUrl: landmarkImage('Surat Riverfront India'),
        imagePageTitle: 'Surat_Castle',
      },
      {
        id: 'india-vadodara',
        name: 'Vadodara',
        famousFor: 'Palaces, industrial growth, and organized residential sectors',
        imageUrl: landmarkImage('Laxmi Vilas Palace Vadodara India'),
        imagePageTitle: 'Laxmi_Vilas_Palace',
      },
      {
        id: 'india-indore',
        name: 'Indore',
        famousFor: 'Clean city districts, townships, and expanding residential hubs',
        imageUrl: landmarkImage('Rajwada Palace Indore India'),
        imagePageTitle: 'Rajwada',
      },
      {
        id: 'india-lucknow',
        name: 'Lucknow',
        famousFor: 'Nawabi heritage, gated colonies, and family apartment projects',
        imageUrl: landmarkImage('Rumi Darwaza Lucknow India'),
        imagePageTitle: 'Rumi_Darwaza',
      },
      {
        id: 'india-nagpur',
        name: 'Nagpur',
        famousFor: 'Central India connectivity, orange city identity, and plotted communities',
        imageUrl: landmarkImage('Deekshabhoomi Nagpur India'),
        imagePageTitle: 'Deekshabhoomi',
      },
      {
        id: 'india-kochi',
        name: 'Kochi',
        famousFor: 'Waterfront living, port city charm, and mixed housing enclaves',
        imageUrl: landmarkImage('Chinese Fishing Nets Kochi India'),
        imagePageTitle: 'Chinese_fishing_nets',
      },
      {
        id: 'india-chandigarh',
        name: 'Chandigarh',
        famousFor: 'Planned sectors, green corridors, and premium housing blocks',
        imageUrl: landmarkImage('Capitol Complex Chandigarh India'),
        imagePageTitle: 'Capitol_Complex_(Chandigarh)',
      },
      {
        id: 'india-bhopal',
        name: 'Bhopal',
        famousFor: 'Lakefront neighborhoods, plotted homes, and growing communities',
        imageUrl: landmarkImage('Upper Lake Bhopal India'),
        imagePageTitle: 'Upper_Lake_(Bhopal)',
      },
      {
        id: 'india-patna',
        name: 'Patna',
        famousFor: 'Historic river city, expanding apartments, and civic growth',
        imageUrl: landmarkImage('Golghar Patna India'),
        imagePageTitle: 'Golghar',
      },
      {
        id: 'india-bhubaneswar',
        name: 'Bhubaneswar',
        famousFor: 'Temple city planning, modern layouts, and housing societies',
        imageUrl: landmarkImage('Lingaraj Temple Bhubaneswar India'),
        imagePageTitle: 'Lingaraj_Temple',
      },
      {
        id: 'india-thiruvananthapuram',
        name: 'Thiruvananthapuram',
        famousFor: 'Coastal neighborhoods, tech parks, and family communities',
        imageUrl: landmarkImage('Padmanabhaswamy Temple Thiruvananthapuram India'),
        imagePageTitle: 'Padmanabhaswamy_Temple',
      },
      {
        id: 'india-goa',
        name: 'Panaji',
        famousFor: 'Beachside living, villas, and premium gated communities',
        imageUrl: landmarkImage('Panaji Goa India'),
        imagePageTitle: 'Panaji',
      },
    ],
  },
  {
    id: 'uae',
    name: 'United Arab Emirates',
    flag: 'AE',
    subtitle: 'Towers, villa compounds, and managed residential communities',
    cities: [
      {
        id: 'uae-dubai',
        name: 'Dubai',
        famousFor: 'Marina towers, skyline communities, and luxury residences',
        imageUrl: landmarkImage('Burj Khalifa Dubai UAE'),
        imagePageTitle: 'Burj_Khalifa',
      },
      {
        id: 'uae-abu-dhabi',
        name: 'Abu Dhabi',
        famousFor: 'Corniche living, gated villas, and premium mixed-use districts',
        imageUrl: landmarkImage('Sheikh Zayed Grand Mosque Abu Dhabi UAE'),
        imagePageTitle: 'Sheikh_Zayed_Grand_Mosque',
      },
      {
        id: 'uae-sharjah',
        name: 'Sharjah',
        famousFor: 'Family housing districts, waterfront communities, and cultural hubs',
        imageUrl: landmarkImage('Al Noor Mosque Sharjah UAE'),
        imagePageTitle: 'Al_Noor_Mosque',
      },
      {
        id: 'uae-ajman',
        name: 'Ajman',
        famousFor: 'Coastal apartments, villa compounds, and growing communities',
        imageUrl: landmarkImage('Ajman Corniche UAE'),
        imagePageTitle: 'Ajman',
      },
      {
        id: 'uae-ras-al-khaimah',
        name: 'Ras Al Khaimah',
        famousFor: 'Mountain views, villa neighborhoods, and resort communities',
        imageUrl: landmarkImage('Jebel Jais Ras Al Khaimah UAE'),
        imagePageTitle: 'Jebel_Jais',
      },
    ],
  },
  {
    id: 'usa',
    name: 'United States',
    flag: 'US',
    subtitle: 'HOAs, condo communities, and suburban neighborhood associations',
    cities: [
      {
        id: 'usa-new-york',
        name: 'New York',
        famousFor: 'Skyline towers, co-op buildings, and urban neighborhoods',
        imageUrl: landmarkImage('Statue of Liberty New York USA'),
        imagePageTitle: 'Statue_of_Liberty',
      },
      {
        id: 'usa-austin',
        name: 'Austin',
        famousFor: 'Suburban communities, condos, and mixed-use neighborhoods',
        imageUrl: landmarkImage('Austin Texas skyline USA'),
        imagePageTitle: 'Austin,_Texas',
      },
      {
        id: 'usa-los-angeles',
        name: 'Los Angeles',
        famousFor: 'Urban sprawl, condo towers, and iconic residential districts',
        imageUrl: landmarkImage('Hollywood Sign Los Angeles USA'),
        imagePageTitle: 'Hollywood_Sign',
      },
      {
        id: 'usa-chicago',
        name: 'Chicago',
        famousFor: 'Lakefront towers, neighborhood blocks, and skyline communities',
        imageUrl: landmarkImage('Cloud Gate Chicago USA'),
        imagePageTitle: 'Cloud_Gate',
      },
      {
        id: 'usa-san-francisco',
        name: 'San Francisco',
        famousFor: 'Hillside housing, condos, and iconic waterfront living',
        imageUrl: landmarkImage('Golden Gate Bridge San Francisco USA'),
        imagePageTitle: 'Golden_Gate_Bridge',
      },
      {
        id: 'usa-seattle',
        name: 'Seattle',
        famousFor: 'Tech neighborhoods, mixed-use living, and urban communities',
        imageUrl: landmarkImage('Space Needle Seattle USA'),
        imagePageTitle: 'Space_Needle',
      },
    ],
  },
  {
    id: 'uk',
    name: 'United Kingdom',
    flag: 'UK',
    subtitle: 'Managed blocks, townhouse clusters, and residential associations',
    cities: [
      {
        id: 'uk-london',
        name: 'London',
        famousFor: 'Historic boroughs, modern apartment blocks, and iconic landmarks',
        imageUrl: landmarkImage('Tower Bridge London UK'),
        imagePageTitle: 'Tower_Bridge',
      },
      {
        id: 'uk-manchester',
        name: 'Manchester',
        famousFor: 'Canal-side redevelopment, apartment living, and civic districts',
        imageUrl: landmarkImage('Manchester Town Hall UK'),
        imagePageTitle: 'Manchester_Town_Hall',
      },
      {
        id: 'uk-birmingham',
        name: 'Birmingham',
        famousFor: 'Canal districts, family neighborhoods, and mixed-use communities',
        imageUrl: landmarkImage('Birmingham Library UK'),
        imagePageTitle: 'Library_of_Birmingham',
      },
      {
        id: 'uk-edinburgh',
        name: 'Edinburgh',
        famousFor: 'Castle views, historic neighborhoods, and premium residential pockets',
        imageUrl: landmarkImage('Edinburgh Castle UK'),
        imagePageTitle: 'Edinburgh_Castle',
      },
      {
        id: 'uk-glasgow',
        name: 'Glasgow',
        famousFor: 'Riverside housing, urban renewal, and apartment districts',
        imageUrl: landmarkImage('Clyde Arc Glasgow UK'),
        imagePageTitle: 'Clyde_Arc',
      },
    ],
  },
];

export function getCountryCatalog(name: string) {
  return locationCatalog.find(
    (country) => country.name.toLowerCase() === name.trim().toLowerCase(),
  );
}
