/**
 * Hotel chain / loyalty programme from a hotel's name, by brand. Hotel search results
 * don't say which group a property belongs to, so this matches the brand names each
 * group uses. More specific brands come first (e.g. "Park Hyatt" before "Hyatt").
 */

const GROUPS: { programme: string; brands: string[] }[] = [
  {
    programme: "Marriott Bonvoy",
    brands: [
      "JW Marriott", "Ritz-Carlton", "Ritz Carlton", "St. Regis", "St Regis", "EDITION", "W Hotel", "W Vienna", "Luxury Collection",
      "Westin", "Sheraton", "Le Méridien", "Le Meridien", "Renaissance", "Autograph Collection", "Tribute Portfolio",
      "Delta Hotels", "Courtyard", "Four Points", "Aloft", "Moxy", "AC Hotel", "^Element", "Residence Inn",
      "Fairfield", "SpringHill Suites", "TownePlace", "Gaylord", "Marriott",
    ],
  },
  {
    programme: "Hilton Honors",
    brands: [
      "Waldorf Astoria", "^Conrad", "LXR", "^Signia", "^Canopy", "Curio Collection", "Tapestry Collection", "DoubleTree",
      "Embassy Suites", "Hampton", "Homewood Suites", "Home2 Suites", "Motto by Hilton", "Tempo by Hilton",
      "Spark by Hilton", "Garden Inn", "Hilton",
    ],
  },
  {
    programme: "IHG One Rewards",
    brands: [
      "InterContinental", "Intercontinental", "Six Senses", "^Regent", "Kimpton", "Hotel Indigo", "voco", "Vignette Collection",
      "Crowne Plaza", "EVEN Hotel", "Holiday Inn", "Staybridge", "Candlewood", "avid hotel", "HUALUXE",
    ],
  },
  {
    programme: "World of Hyatt",
    brands: ["Park Hyatt", "Grand Hyatt", "Hyatt Regency", "Hyatt Place", "Hyatt House", "Hyatt Centric", "Andaz", "^Alila", "^Thompson", "Caption by Hyatt", "Hyatt"],
  },
  {
    programme: "ALL – Accor",
    brands: [
      "Raffles", "Fairmont", "Sofitel", "MGallery", "Pullman", "Swissôtel", "Swissotel", "Mövenpick", "Movenpick", "Novotel",
      "Mercure", "Adagio", "ibis", "Mama Shelter", "25hours", "The Hoxton", "Jo&Joe", "greet", "TRIBE", "Rixos", "Hotel F1",
    ],
  },
  {
    programme: "Wyndham Rewards",
    brands: ["Wyndham", "Ramada", "Days Inn", "Super 8", "La Quinta", "Microtel", "Wingate", "Howard Johnson", "Baymont", "^Dolce", "TRYP"],
  },
  { programme: "Radisson Rewards", brands: ["Radisson", "Park Inn", "Country Inn", "art'otel", "Park Plaza"] },
  { programme: "Best Western Rewards", brands: ["Best Western", "SureStay", "^Sure Hotel", "Vib Hotel", "GLō", "Aiden by Best Western"] },
  {
    programme: "Choice Privileges",
    brands: ["Comfort Inn", "Comfort Suites", "Comfort Hotel", "Quality Inn", "Quality Hotel", "Clarion", "Sleep Inn", "Cambria", "^Ascend", "Econo Lodge", "Rodeway"],
  },
  { programme: "MeliáRewards", brands: ["Gran Meliá", "ME by Meliá", "Meliá", "Melia", "Paradisus", "INNSiDE", "Sol by Meliá"] },
  { programme: "NH Discovery", brands: ["NH Collection", "nhow", "NH Hotel", "NH ", "Anantara", "^Tivoli", "^Avani"] },
  { programme: "Leonardo Hotels", brands: ["Leonardo"] },
  { programme: "Motel One", brands: ["Motel One"] },
  { programme: "Premier Inn", brands: ["Premier Inn"] },
  { programme: "Barceló", brands: ["Barceló", "Barcelo", "Occidental"] },
  { programme: "Scandic", brands: ["Scandic"] },
  { programme: "Travelodge", brands: ["Travelodge"] },
  { programme: "Steigenberger / H World", brands: ["Steigenberger", "IntercityHotel", "Jaz in the City", "MAXX by Steigenberger"] },
];

export const INDEPENDENT = "Independent";

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// "^Brand" = brand words that are also ordinary words: only match at the start of the name
// ("Conrad Tokyo", "Regent Hong Kong") so "Hotel Regent" isn't counted as IHG.
const MATCHERS = GROUPS.flatMap((g) =>
  g.brands.map((b) => {
    const start = b.startsWith("^");
    const brand = escapeRe((start ? b.slice(1) : b).trim());
    const flags = b.trim() === b ? "iu" : "u"; // brands with a trailing space ("NH ") are case-sensitive
    return { programme: g.programme, re: new RegExp(`${start ? "^" : "(^|[^\\p{L}])"}${brand}(?=$|[^\\p{L}])`, flags) };
  }),
);

const cache = new Map<string, string>();

/** Loyalty programme for a hotel name, or "Independent". */
export function hotelChain(name: string): string {
  const hit = cache.get(name);
  if (hit) return hit;
  const programme = MATCHERS.find((m) => m.re.test(name))?.programme ?? INDEPENDENT;
  cache.set(name, programme);
  return programme;
}
