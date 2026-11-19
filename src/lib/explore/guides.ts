/**
 * Curated things-to-do guides for Explore (sample content until guides move into the database).
 * Photo picks (`photo`) come from the ?curate=1 mode on the Explore page.
 */
import { findGuide, matchGuides as match, placeFactory, withDetails, type CuratedGuide } from "../curated/types";

const p = placeFactory("New York, NY", "sight");

const NEW_YORK: CuratedGuide = {
  slug: "new-york",
  city: "New York City",
  country: "United States",
  aliases: ["new york", "nyc", "manhattan", "brooklyn", "ny"],
  intro: "The New York we'd send our friends to — the icons done right, the museums worth the queue, and the nights out to plan around.",
  sections: [
    {
      id: "sights",
      title: "Iconic sights",
      places: [
        p("nyx-statue-of-liberty", "Statue of Liberty", "Harbour icon", "Liberty Island", 40.6892, -74.0445),
        p("nyx-brooklyn-bridge", "Brooklyn Bridge", "Walk across", "DUMBO", 40.7061, -73.9969),
        p("nyx-empire-state", "Empire State Building", "Observation deck", "Midtown", 40.7484, -73.9857),
        p("nyx-top-of-the-rock", "Top of the Rock", "Skyline views", "Midtown", 40.7593, -73.9794),
        p("nyx-summit", "SUMMIT One Vanderbilt", "Mirrored skydeck", "Midtown", 40.7531, -73.9787),
        p("nyx-grand-central", "Grand Central Terminal", "Beaux-Arts station", "Midtown", 40.7527, -73.9772),
        p("nyx-911-memorial", "9/11 Memorial & Museum", "Memorial", "Financial District", 40.7115, -74.0134),
        p("nyx-edge", "Edge", "Outdoor skydeck", "Hudson Yards", 40.7539, -74.0011),
      ],
    },
    {
      id: "museums",
      title: "Museums",
      places: [
        p("nyx-met", "The Metropolitan Museum of Art", "Art museum", "Upper East Side", 40.7794, -73.9632),
        p("nyx-moma", "Museum of Modern Art", "Modern art", "Midtown", 40.7614, -73.9776),
        p("nyx-guggenheim", "Solomon R. Guggenheim Museum", "Modern art", "Upper East Side", 40.783, -73.959),
        p("nyx-amnh", "American Museum of Natural History", "Natural history", "Upper West Side", 40.7813, -73.974),
        p("nyx-whitney", "Whitney Museum of American Art", "American art", "Meatpacking District", 40.7396, -74.0089),
        p("nyx-frick", "The Frick Collection", "Old masters", "Upper East Side", 40.7712, -73.967),
        p("nyx-tenement", "Tenement Museum", "Immigrant history", "Lower East Side", 40.7188, -73.99),
        p("nyx-cloisters", "The Met Cloisters", "Medieval art", "Fort Tryon Park", 40.8649, -73.9319),
      ],
    },
    {
      id: "shows",
      title: "Shows & music",
      places: [
        p("nyx-hamilton", "Hamilton", "Broadway musical", "Theater District", 40.759, -73.9866, "show"),
        p("nyx-lion-king", "The Lion King", "Broadway musical", "Theater District", 40.7573, -73.9879, "show"),
        p("nyx-comedy-cellar", "Comedy Cellar", "Stand-up comedy", "Greenwich Village", 40.7302, -74.0006, "show"),
        p("nyx-village-vanguard", "Village Vanguard", "Jazz club", "West Village", 40.736, -74.0016, "show"),
        p("nyx-blue-note", "Blue Note Jazz Club", "Jazz club", "Greenwich Village", 40.7308, -74.0005, "show"),
        p("nyx-met-opera", "Metropolitan Opera", "Opera", "Lincoln Center", 40.7725, -73.984, "show"),
        p("nyx-carnegie", "Carnegie Hall", "Concert hall", "Midtown", 40.7651, -73.9799, "show"),
      ],
    },
    {
      id: "outdoors",
      title: "Parks & outdoors",
      places: [
        p("nyx-central-park", "Central Park", "Urban park", "Manhattan", 40.7829, -73.9654, "outdoors"),
        p("nyx-high-line", "The High Line", "Elevated park", "Chelsea", 40.748, -74.0048, "outdoors"),
        p("nyx-little-island", "Little Island", "Pier park", "Chelsea", 40.742, -74.0103, "outdoors"),
        p("nyx-brooklyn-bridge-park", "Brooklyn Bridge Park", "Waterfront park", "DUMBO", 40.7003, -73.9967, "outdoors"),
        p("nyx-prospect-park", "Prospect Park", "Brooklyn park", "Park Slope", 40.6602, -73.969, "outdoors"),
        p("nyx-governors-island", "Governors Island", "Island escape", "New York Harbor", 40.6895, -74.0168, "outdoors"),
        p("nyx-staten-island-ferry", "Staten Island Ferry", "Free ferry", "Whitehall Terminal", 40.7013, -74.0131, "travel"),
      ],
    },
    {
      id: "neighbourhoods",
      title: "Neighbourhoods to wander",
      places: [
        p("nyx-west-village", "West Village", "Charming streets", "Manhattan", 40.7358, -74.0036, "outdoors"),
        p("nyx-dumbo", "DUMBO", "Cobblestone views", "Brooklyn", 40.7033, -73.9881, "outdoors"),
        p("nyx-williamsburg", "Williamsburg", "Indie Brooklyn", "Brooklyn", 40.7081, -73.9571, "outdoors"),
        p("nyx-chinatown", "Chinatown", "Street food", "Manhattan", 40.7158, -73.997, "outdoors"),
        p("nyx-harlem", "Harlem", "Soul & jazz", "Manhattan", 40.8116, -73.9465, "outdoors"),
        p("nyx-soho", "SoHo", "Shopping streets", "Manhattan", 40.7233, -74.003, "shopping"),
      ],
    },
    {
      id: "experiences",
      title: "Experiences",
      places: [
        p("nyx-chelsea-market", "Chelsea Market", "Food hall", "Chelsea", 40.7424, -74.0061, "food"),
        p("nyx-smorgasburg", "Smorgasburg", "Food market", "Williamsburg", 40.721, -73.962, "food"),
        p("nyx-yankee-stadium", "Yankee Stadium", "Baseball game", "The Bronx", 40.8296, -73.9262, "show"),
        p("nyx-msg", "Madison Square Garden", "Arena events", "Midtown", 40.7505, -73.9934, "show"),
        p("nyx-coney-island", "Coney Island", "Beach boardwalk", "Brooklyn", 40.5755, -73.9707, "outdoors"),
        p("nyx-strand", "Strand Book Store", "Bookshop", "Union Square", 40.7332, -73.9907, "shopping"),
      ],
    },
  ],
};

/** Curated write-ups — sample copy. */
const NEW_YORK_DETAILS: Parameters<typeof withDetails>[1] = {
  "nyx-statue-of-liberty": { description: "Book the ferry from Battery Park early in the day (and crown or pedestal tickets well ahead). The stop at Ellis Island is worth the extra hour." },
  "nyx-brooklyn-bridge": { description: "Walk it from Manhattan to Brooklyn so the skyline is behind you when you turn around — early morning is quietest, golden hour is the most beautiful." },
  "nyx-top-of-the-rock": { description: "Arguably the best skyline view, because the Empire State Building and Central Park are both in it. Time it for sunset." },
  "nyx-grand-central": { description: "Look up at the celestial ceiling in the Main Concourse, whisper across the Whispering Gallery, and grab a drink in the Campbell bar." },
  "nyx-met": { description: "One of the world's great museums — don't try to see it all. Pick a few wings (the Temple of Dendur, the Impressionists) and finish on the Roof Garden in season." },
  "nyx-moma": { description: "Starry Night, Monet's Water Lilies and a century of modern art and design. Go at opening or on a weekday evening to beat the crowds." },
  "nyx-guggenheim": { description: "Frank Lloyd Wright's spiral is the star — take the lift to the top and walk down the ramp through the exhibition." },
  "nyx-amnh": { description: "Dinosaur halls, the blue whale and the planetarium. Brilliant with kids, and just as good without them." },
  "nyx-hamilton": { description: "Still one of Broadway's hottest tickets. Enter the digital lottery for cheap seats, or book well in advance." },
  "nyx-comedy-cellar": { description: "The Greenwich Village basement where big-name comics drop in unannounced. Book ahead — shows sell out most nights." },
  "nyx-central-park": { description: "Rent a bike or wander from the Mall to Bethesda Terrace and the Bow Bridge. In winter, skate at the Wollman Rink." },
  "nyx-high-line": { description: "A park built on an old elevated rail line, running from the Meatpacking District to Hudson Yards. Walk it north to south and finish in Chelsea Market." },
};


const vx = placeFactory("Vienna, Austria", "sight");

const VIENNA: CuratedGuide = {
  slug: "vienna",
  city: "Vienna",
  country: "Austria",
  aliases: ["vienna", "wien", "vienne"],
  intro: "The Vienna we'd send our friends to — imperial palaces, grand museums and the city beyond the postcards.",
  sections: [
    {
      id: "sights",
      title: "Iconic sights",
      places: [vx("vix-hofburg", "The Hofburg", "Imperial palace", "Innere Stadt", 48.2066, 16.3655)],
    },
  ],
};

const VIENNA_DETAILS: Parameters<typeof withDetails>[1] = {
  "vix-hofburg": {
    social: ["https://www.youtube.com/watch?v=8h--YHE5rWQ"],
    description: "The Habsburgs' winter palace for over six centuries. See the Imperial Apartments and the Sisi Museum, then the Spanish Riding School and the Imperial Treasury.",
  },
};

export const EXPLORE_GUIDES: CuratedGuide[] = [withDetails(NEW_YORK, NEW_YORK_DETAILS), withDetails(VIENNA, VIENNA_DETAILS)];

export const exploreGuideBySlug = (slug: string | null | undefined) => findGuide(EXPLORE_GUIDES, slug);
export const matchExploreGuides = (q: string) => match(EXPLORE_GUIDES, q);
