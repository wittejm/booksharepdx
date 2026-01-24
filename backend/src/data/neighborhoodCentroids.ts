/**
 * Portland Neighborhood Centroids
 * Static data for distance calculations - no database needed
 */

export interface NeighborhoodCentroid {
  name: string;
  lat: number;
  lng: number;
}

export const neighborhoodCentroids: Record<string, NeighborhoodCentroid> = {
  alameda: {
    name: "Alameda",
    lat: 45.54632112035774,
    lng: -122.63233192085907,
  },
  "arbor-lodge": {
    name: "Arbor Lodge",
    lat: 45.57204979430147,
    lng: -122.69649253758065,
  },
  "ardenwald-johnson-creek": {
    name: "Ardenwald-Johnson Creek",
    lat: 45.46216968301484,
    lng: -122.62229225519248,
  },
  "argay-terrace": {
    name: "Argay Terrace",
    lat: 45.553590245714425,
    lng: -122.52213141786125,
  },
  "arlington-heights": {
    name: "Arlington Heights",
    lat: 45.51756672351898,
    lng: -122.70816384322504,
  },
  "arnold-creek": {
    name: "Arnold Creek",
    lat: 45.44032909425524,
    lng: -122.69958133482206,
  },
  "ashcreek-crestwood": {
    name: "Ashcreek-Crestwood",
    lat: 45.464427668519534,
    lng: -122.74682503436333,
  },
  "beaumont-wilshire": {
    name: "Beaumont-Wilshire",
    lat: 45.54659043104445,
    lng: -122.62036294843237,
  },
  boise: { name: "Boise", lat: 45.549221496437255, lng: -122.67160255870611 },
  "brentwood-darlington": {
    name: "Brentwood-Darlington",
    lat: 45.46232374982347,
    lng: -122.59700313310823,
  },
  bridgeton: {
    name: "Bridgeton",
    lat: 45.60190711220577,
    lng: -122.6625118726816,
  },
  bridlemile: {
    name: "Bridlemile",
    lat: 45.49416522160601,
    lng: -122.71956682419001,
  },
  brooklyn: {
    name: "Brooklyn",
    lat: 45.48876826805334,
    lng: -122.65388568112651,
  },
  buckman: {
    name: "Buckman",
    lat: 45.51911192659275,
    lng: -122.65565434543865,
  },
  "cathedral-park": {
    name: "Cathedral Park",
    lat: 45.5890092183287,
    lng: -122.75515134626679,
  },
  centennial: {
    name: "Centennial",
    lat: 45.50163789208249,
    lng: -122.49401885116384,
  },
  "collins-view": {
    name: "Collins View",
    lat: 45.451411248980975,
    lng: -122.68046812712691,
  },
  concordia: {
    name: "Concordia",
    lat: 45.567453798125456,
    lng: -122.63298767297877,
  },
  "creston-kenilworth": {
    name: "Creston-Kenilworth",
    lat: 45.493576472850165,
    lng: -122.6235461995557,
  },
  cully: { name: "Cully", lat: 45.56804792391777, lng: -122.60065704596174 },
  "east-columbia": {
    name: "East Columbia",
    lat: 45.593853986591874,
    lng: -122.65894897233646,
  },
  eastmoreland: {
    name: "Eastmoreland",
    lat: 45.47376230196906,
    lng: -122.62977299033699,
  },
  eliot: { name: "Eliot", lat: 45.543560605557715, lng: -122.67013213048065 },
  "far-southwest": {
    name: "Far Southwest",
    lat: 45.440628144423464,
    lng: -122.73105264413765,
  },
  "forest-park": {
    name: "Forest Park",
    lat: 45.570534358376634,
    lng: -122.77327105927526,
  },
  "foster-powell": {
    name: "Foster-Powell",
    lat: 45.49172568153911,
    lng: -122.59646143426875,
  },
  glenfair: {
    name: "Glenfair",
    lat: 45.52290184604455,
    lng: -122.49862318807259,
  },
  "goose-hollow": {
    name: "Goose Hollow",
    lat: 45.515919856549566,
    lng: -122.69606786273297,
  },
  "grant-park": {
    name: "Grant Park",
    lat: 45.53728001058513,
    lng: -122.6256346193674,
  },
  "hayden-island": {
    name: "Hayden Island",
    lat: 45.620153669796,
    lng: -122.69058087811595,
  },
  hayhurst: {
    name: "Hayhurst",
    lat: 45.47872354141074,
    lng: -122.74145016890587,
  },
  hazelwood: {
    name: "Hazelwood",
    lat: 45.522174723438155,
    lng: -122.5245163021375,
  },
  "healy-heights": {
    name: "Healy Heights",
    lat: 45.492384646150114,
    lng: -122.69821017039251,
  },
  hillsdale: {
    name: "Hillsdale",
    lat: 45.485122024797974,
    lng: -122.70249776920974,
  },
  hillside: {
    name: "Hillside",
    lat: 45.52549166395599,
    lng: -122.7183079232844,
  },
  hollywood: {
    name: "Hollywood",
    lat: 45.53395633660541,
    lng: -122.62015895995543,
  },
  homestead: {
    name: "Homestead",
    lat: 45.49708528344619,
    lng: -122.69234388291997,
  },
  "hosford-abernethy": {
    name: "Hosford-Abernethy",
    lat: 45.50488307505654,
    lng: -122.64809645643179,
  },
  humboldt: {
    name: "Humboldt",
    lat: 45.5591457611246,
    lng: -122.67132663161452,
  },
  irvington: {
    name: "Irvington",
    lat: 45.541746470343774,
    lng: -122.64676240551017,
  },
  kenton: { name: "Kenton", lat: 45.591924205182956, lng: -122.69541264193325 },
  kerns: { name: "Kerns", lat: 45.52724743265957, lng: -122.64829161614189 },
  king: { name: "King", lat: 45.55777405063169, lng: -122.65743399281739 },
  laurelhurst: {
    name: "Laurelhurst",
    lat: 45.531298729591896,
    lng: -122.62769866774569,
  },
  lents: { name: "Lents", lat: 45.46853102026646, lng: -122.56183545265276 },
  linnton: {
    name: "Linnton",
    lat: 45.58729620452493,
    lng: -122.79888360158716,
  },
  lloyd: { name: "Lloyd", lat: 45.53025660799915, lng: -122.65687951003508 },
  "madison-south": {
    name: "Madison South",
    lat: 45.53984913923185,
    lng: -122.57960559525726,
  },
  maplewood: {
    name: "Maplewood",
    lat: 45.474814715395134,
    lng: -122.74315563171992,
  },
  markham: { name: "Markham", lat: 45.45626361471787, lng: -122.7007791597578 },
  "marshall-park": {
    name: "Marshall Park",
    lat: 45.45273257221441,
    lng: -122.69342511211977,
  },
  "mc-unclaimed-11": {
    name: "MC Unclaimed #11",
    lat: 45.462333893820855,
    lng: -122.67213477034747,
  },
  "mc-unclaimed-14": {
    name: "MC Unclaimed #14",
    lat: 45.54748021725785,
    lng: -122.72247091220844,
  },
  "mc-unclaimed-5": {
    name: "MC Unclaimed #5",
    lat: 45.54303112483204,
    lng: -122.6219173305346,
  },
  "mill-park": {
    name: "Mill Park",
    lat: 45.51427553716215,
    lng: -122.55147616317052,
  },
  montavilla: {
    name: "Montavilla",
    lat: 45.527399726913146,
    lng: -122.58471184678083,
  },
  "mt-scott-arleta": {
    name: "Mt. Scott-Arleta",
    lat: 45.48558548760155,
    lng: -122.59307307565314,
  },
  "mt-tabor": {
    name: "Mt. Tabor",
    lat: 45.518981969000876,
    lng: -122.60438674304702,
  },
  multnomah: {
    name: "Multnomah",
    lat: 45.466093516259434,
    lng: -122.71023437193382,
  },
  "north-tabor": {
    name: "North Tabor",
    lat: 45.52654050628124,
    lng: -122.60299659172249,
  },
  "northwest-district": {
    name: "Northwest District",
    lat: 45.536071331108126,
    lng: -122.71209588886964,
  },
  "northwest-heights": {
    name: "Northwest Heights",
    lat: 45.54102813956917,
    lng: -122.77055267142735,
  },
  "old-town": {
    name: "Old Town",
    lat: 45.523966370243606,
    lng: -122.67211840142835,
  },
  overlook: {
    name: "Overlook",
    lat: 45.560809314495835,
    lng: -122.69660755147353,
  },
  parkrose: {
    name: "Parkrose",
    lat: 45.556437316278796,
    lng: -122.5500751612514,
  },
  "parkrose-heights": {
    name: "Parkrose Heights",
    lat: 45.54204183068562,
    lng: -122.55441050992091,
  },
  "pearl-district": {
    name: "Pearl District",
    lat: 45.531041645428985,
    lng: -122.68444699508001,
  },
  piedmont: {
    name: "Piedmont",
    lat: 45.58269279749235,
    lng: -122.67131703740765,
  },
  "pleasant-valley": {
    name: "Pleasant Valley",
    lat: 45.46595670674675,
    lng: -122.51087073601687,
  },
  "portland-downtown": {
    name: "Portland Downtown",
    lat: 45.514336221802665,
    lng: -122.68016963711443,
  },
  portsmouth: {
    name: "Portsmouth",
    lat: 45.58398021412413,
    lng: -122.71427922412632,
  },
  "powellhurst-gilbert": {
    name: "Powellhurst-Gilbert",
    lat: 45.494088202349005,
    lng: -122.5265873890523,
  },
  reed: { name: "Reed", lat: 45.48140529189156, lng: -122.63193997123122 },
  richmond: {
    name: "Richmond",
    lat: 45.50382036672867,
    lng: -122.62701246372701,
  },
  "rose-city-park": {
    name: "Rose City Park",
    lat: 45.53642858419546,
    lng: -122.60635860653576,
  },
  roseway: {
    name: "Roseway",
    lat: 45.54531112302527,
    lng: -122.59109043036153,
  },
  russell: { name: "Russell", lat: 45.5407539597763, lng: -122.52020766818576 },
  sabin: { name: "Sabin", lat: 45.552676244289394, lng: -122.64902147115723 },
  "sellwood-moreland": {
    name: "Sellwood-Moreland",
    lat: 45.474980728520066,
    lng: -122.64993454279704,
  },
  "south-burlingame": {
    name: "South Burlingame",
    lat: 45.46652500226013,
    lng: -122.6836674983371,
  },
  "south-portland": {
    name: "South Portland",
    lat: 45.49119755413661,
    lng: -122.67866610451892,
  },
  "south-tabor": {
    name: "South Tabor",
    lat: 45.50324249538667,
    lng: -122.58792608423053,
  },
  "southwest-hills": {
    name: "Southwest Hills",
    lat: 45.50144189019205,
    lng: -122.70715132749083,
  },
  "st-johns": {
    name: "St. Johns",
    lat: 45.62489512559705,
    lng: -122.76471448557794,
  },
  "sullivan-s-gulch": {
    name: "Sullivan's Gulch",
    lat: 45.532798004137305,
    lng: -122.63676979050847,
  },
  sumner: { name: "Sumner", lat: 45.56443116311909, lng: -122.56811729875386 },
  sunderland: {
    name: "Sunderland",
    lat: 45.59533705336701,
    lng: -122.6329896224654,
  },
  sunnyside: {
    name: "Sunnyside",
    lat: 45.5162249157653,
    lng: -122.622273093301,
  },
  "sylvan-highlands": {
    name: "Sylvan-Highlands",
    lat: 45.51541380499337,
    lng: -122.72348323577509,
  },
  "university-park": {
    name: "University Park",
    lat: 45.57753423322408,
    lng: -122.72112835280014,
  },
  vernon: { name: "Vernon", lat: 45.561665226250526, lng: -122.65056244195169 },
  "west-portland-park": {
    name: "West Portland Park",
    lat: 45.44718591103903,
    lng: -122.72124944762922,
  },
  wilkes: { name: "Wilkes", lat: 45.53775335163978, lng: -122.4988534121275 },
  "woodland-park": {
    name: "Woodland Park",
    lat: 45.53554172899411,
    lng: -122.56013083828618,
  },
  woodlawn: {
    name: "Woodlawn",
    lat: 45.57383245842579,
    lng: -122.65208983347544,
  },
  woodstock: {
    name: "Woodstock",
    lat: 45.47022343253676,
    lng: -122.61724336592587,
  },
};

/**
 * Get centroid for a neighborhood ID
 */
export function getNeighborhoodCentroid(
  id: string,
): { lat: number; lng: number } | null {
  const centroid = neighborhoodCentroids[id];
  return centroid ? { lat: centroid.lat, lng: centroid.lng } : null;
}

/**
 * Get all neighborhood IDs
 */
export function getAllNeighborhoodIds(): string[] {
  return Object.keys(neighborhoodCentroids);
}

/**
 * Get neighborhood name by ID
 */
export function getNeighborhoodName(id: string): string | null {
  return neighborhoodCentroids[id]?.name || null;
}
