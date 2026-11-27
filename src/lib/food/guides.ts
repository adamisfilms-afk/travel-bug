/**
 * Curated food guides (sample content until guides move into the database).
 * Photo picks (`photo`) come from the ?curate=1 mode on the Food page.
 */
import { findGuide, matchGuides as match, mergeDetails, placeFactory, withDetails, type CuratedGuide } from "../curated/types";

export type { CuratedGuide as FoodGuide, CuratedPlace as FoodPlace } from "../curated/types";

const p = placeFactory("New York, NY", "food");

const NEW_YORK: CuratedGuide = {
  slug: "new-york",
  city: "New York City",
  country: "United States",
  aliases: ["new york", "nyc", "manhattan", "brooklyn", "ny"],
  intro: "Where we'd actually eat in New York — from red-sauce icons to tasting menus, slices to speakeasies.",
  sections: [
    {
      id: "dinner",
      title: "Dinner",
      places: [
        p("ny-carbone", "Carbone", "Italian-American", "Greenwich Village", 40.7279, -74.0003),
        p("ny-le-bernardin", "Le Bernardin", "Fine dining", "Midtown", 40.7615, -73.9818),
        p("ny-via-carota", "Via Carota", "Italian", "West Village", 40.7334, -74.0035),
        p("ny-lilia", "Lilia", "Pasta", "Williamsburg", 40.7176, -73.9524),
        p("ny-atomix", "Atomix", "Korean tasting", "NoMad", 40.7442, -73.9837),
        p("ny-peter-luger", "Peter Luger", "Steakhouse", "Williamsburg", 40.7099, -73.9623),
        p("ny-don-angie", "Don Angie", "Italian-American", "West Village", 40.7376, -74.0029),
        p("ny-gramercy-tavern", "Gramercy Tavern", "New American", "Flatiron", 40.7385, -73.9884),
        p("ny-cosme", "Cosme", "Modern Mexican", "Flatiron", 40.7397, -73.9883),
        p("ny-raouls", "Raoul's", "French bistro", "SoHo", 40.7262, -74.0024),
        p("ny-torrisi", "Torrisi", "Italian-American", "Nolita", 40.7243, -73.9952),
        p("ny-semma", "Semma", "South Indian", "West Village", 40.7349, -74.0005),
        p("ny-thai-diner", "Thai Diner", "Thai-American", "Nolita", 40.7215, -73.9958),
        p("ny-llama-inn", "Llama Inn", "Peruvian", "Williamsburg", 40.7146, -73.9496),
        p("ny-keens", "Keens Steakhouse", "Historic steakhouse", "Midtown", 40.7508, -73.9871),
      ],
    },
    {
      id: "brunch",
      title: "Brunch",
      places: [
        p("ny-balthazar", "Balthazar", "French brasserie", "SoHo", 40.7226, -73.998),
        p("ny-clinton-st", "Clinton St. Baking Company", "Pancakes", "Lower East Side", 40.7212, -73.9839),
        p("ny-russ-daughters-cafe", "Russ & Daughters Cafe", "Jewish appetizing", "Lower East Side", 40.7196, -73.9898),
        p("ny-sadelles", "Sadelle's", "Bagel brunch", "SoHo", 40.7244, -74.0024),
        p("ny-buvette", "Buvette", "French café", "West Village", 40.7326, -74.0048),
        p("ny-jacks-wife-freda", "Jack's Wife Freda", "Mediterranean", "SoHo", 40.7254, -73.9984),
        p("ny-cafe-mogador", "Café Mogador", "Moroccan", "East Village", 40.7272, -73.9844),
        p("ny-bubbys", "Bubby's", "American comfort", "Tribeca", 40.7197, -74.0084),
        p("ny-cafe-cluny", "Café Cluny", "French café", "West Village", 40.7369, -74.0052),
        p("ny-sunday-in-brooklyn", "Sunday in Brooklyn", "Brunch classic", "Williamsburg", 40.7197, -73.9564),
        p("ny-golden-diner", "Golden Diner", "Asian diner", "Chinatown", 40.7136, -73.9915),
        p("ny-five-leaves", "Five Leaves", "Neighbourhood café", "Greenpoint", 40.7234, -73.9512),
      ],
    },
    {
      id: "lunch",
      title: "Lunch on the go",
      places: [
        p("ny-katzs", "Katz's Delicatessen", "Classic deli", "Lower East Side", 40.7223, -73.9874),
        p("ny-joes-pizza", "Joe's Pizza", "NY slice", "Greenwich Village", 40.7305, -74.0021),
        p("ny-xian", "Xi'an Famous Foods", "Hand-pulled noodles", "Chinatown", 40.7155, -73.9973),
        p("ny-los-tacos", "Los Tacos No. 1", "Tacos", "Chelsea Market", 40.7424, -74.0061),
        p("ny-prince-st", "Prince Street Pizza", "Square slice", "Nolita", 40.7231, -73.9945),
        p("ny-superiority", "Superiority Burger", "Vegetarian diner", "East Village", 40.7262, -73.9844),
        p("ny-mamouns", "Mamoun's Falafel", "Falafel", "Greenwich Village", 40.7303, -74.0004),
        p("ny-di-fara", "Di Fara Pizza", "Legendary pizza", "Midwood", 40.625, -73.9615),
        p("ny-nom-wah", "Nom Wah Tea Parlor", "Dim sum", "Chinatown", 40.7144, -73.9982),
        p("ny-shake-shack", "Shake Shack Madison Square Park", "Burgers", "Flatiron", 40.7414, -73.9882),
        p("ny-ess-a-bagel", "Ess-a-Bagel", "Bagels", "Midtown East", 40.7547, -73.969),
        p("ny-faiccos", "Faicco's Italian Specialties", "Italian heroes", "West Village", 40.7306, -74.0033),
      ],
    },
    {
      id: "sweet",
      title: "Sweet",
      places: [
        p("ny-levain", "Levain Bakery", "Giant cookies", "Upper West Side", 40.7799, -73.9802),
        p("ny-dominique-ansel", "Dominique Ansel Bakery", "French pastry", "SoHo", 40.7252, -74.0029),
        p("ny-morgensterns", "Morgenstern's Finest Ice Cream", "Ice cream", "Lower East Side", 40.7212, -73.9883),
        p("ny-lady-m", "Lady M", "Crêpe cakes", "Upper East Side", 40.7718, -73.9629),
        p("ny-venieros", "Veniero's", "Italian pastry", "East Village", 40.7296, -73.9848),
        p("ny-magnolia", "Magnolia Bakery", "Banana pudding", "West Village", 40.7358, -74.005),
        p("ny-supermoon", "Supermoon Bakehouse", "Creative pastry", "Lower East Side", 40.7187, -73.9877),
        p("ny-daveys", "Davey's Ice Cream", "Ice cream", "East Village", 40.728, -73.9859),
        p("ny-juniors", "Junior's", "Cheesecake", "Downtown Brooklyn", 40.6903, -73.9817),
        p("ny-breads", "Breads Bakery", "Chocolate babka", "Union Square", 40.7363, -73.9915),
        p("ny-mah-ze-dahr", "Mah-Ze-Dahr Bakery", "Bakery", "West Village", 40.7353, -74.0003),
        p("ny-doughnut-plant", "Doughnut Plant", "Doughnuts", "Lower East Side", 40.7164, -73.9884),
      ],
    },
    {
      id: "coffee",
      title: "Coffee",
      places: [
        p("ny-la-cabra", "La Cabra", "Specialty coffee", "East Village", 40.7262, -73.9876),
        p("ny-devocion", "Devoción", "Colombian roaster", "Williamsburg", 40.7162, -73.9643),
        p("ny-abraco", "Abraço", "Espresso bar", "East Village", 40.7268, -73.9866),
        p("ny-sey", "Sey Coffee", "Light roast", "Bushwick", 40.7066, -73.9223),
        p("ny-kinship", "Kinship Coffee", "Neighbourhood café", "Astoria", 40.7623, -73.9255),
        p("ny-partners", "Partners Coffee", "Roaster café", "Williamsburg", 40.7179, -73.9572),
        p("ny-cafe-integral", "Café Integral", "Nicaraguan coffee", "Nolita", 40.7219, -73.9967),
        p("ny-ninth-street", "Ninth Street Espresso", "Espresso bar", "East Village", 40.7242, -73.9787),
      ],
    },
    {
      id: "drinks",
      title: "Drinks",
      places: [
        p("ny-double-chicken", "Double Chicken Please", "Cocktail bar", "Lower East Side", 40.7196, -73.9909),
        p("ny-attaboy", "Attaboy", "No-menu cocktails", "Lower East Side", 40.7189, -73.9918),
        p("ny-death-co", "Death & Co", "Cocktail bar", "East Village", 40.7258, -73.9845),
        p("ny-pdt", "Please Don't Tell", "Hidden speakeasy", "East Village", 40.7271, -73.9837),
        p("ny-dead-rabbit", "The Dead Rabbit", "Irish pub", "Financial District", 40.7034, -74.0111),
        p("ny-bemelmans", "Bemelmans Bar", "Piano bar", "Upper East Side", 40.7743, -73.9637),
        p("ny-employees-only", "Employees Only", "Cocktail bar", "West Village", 40.7334, -74.0062),
        p("ny-katana-kitten", "Katana Kitten", "Japanese highballs", "West Village", 40.7334, -74.0057),
        p("ny-overstory", "Overstory", "Rooftop cocktails", "Financial District", 40.7068, -74.0075),
        p("ny-king-cole", "King Cole Bar", "Hotel bar", "Midtown", 40.7613, -73.9748),
        p("ny-mcsorleys", "McSorley's Old Ale House", "Historic pub", "East Village", 40.7287, -73.9897),
        p("ny-bar-pisellino", "Bar Pisellino", "Aperitivo bar", "West Village", 40.7334, -74.0035),
      ],
    },
  ],
};

/** Curated write-ups and price levels (1–4) — sample copy. */
const NEW_YORK_DETAILS: Parameters<typeof withDetails>[1] = {
  "ny-carbone": {
    priceLevel: 4,
    social: ["https://www.instagram.com/p/DQzdNKnDNDH/"],
    description: "Red-sauce theatre at its most polished — tuxedoed captains, tableside Caesar and the spicy rigatoni everyone posts about. Booking is a sport, but the night lives up to it." },
  "ny-le-bernardin": { priceLevel: 4, description: "Eric Ripert's temple to seafood, where fish is treated with almost religious restraint. Calm, formal and flawless — the special-occasion meal that never feels stuffy." },
  "ny-via-carota": { priceLevel: 3, description: "A candlelit West Village trattoria that feels like it's been here forever. No reservations, so put your name down, have a drink nearby and come back for the cacio e pepe and the insalata verde." },
  "ny-lilia": { priceLevel: 3, description: "Missy Robbins' wood-fired Williamsburg favourite, set in an old auto-body shop. The pastas are the reason to go — the sheep's milk agnolotti especially — with a lovely café counter by day." },
  "ny-atomix": { priceLevel: 4, description: "An intimate counter serving a tasting menu that reimagines Korean cooking, with each course explained on a small card. Precise, personal and one of the city's most memorable meals." },
  "ny-peter-luger": { priceLevel: 4, description: "The old-school Brooklyn steakhouse since 1887: porterhouse for two, creamed spinach, gruff waiters and a cash-and-card-only legend. Go for the ritual as much as the steak." },
  "ny-don-angie": { priceLevel: 3, description: "A playful take on Italian-American cooking in a cosy West Village corner — the pinwheel lasagna for two is the dish to order, and the room is made for date nights." },
  "ny-gramercy-tavern": { priceLevel: 4, description: "A warm, timeless New York institution. Book the dining room for the seasonal tasting menu, or walk into the front tavern for a more relaxed meal by the fire." },
  "ny-thai-diner": { priceLevel: 2, description: "A cheerful, kitschy all-day spot mixing Thai flavours with American diner classics — the Thai disco fries and the khao soi are worth the wait." },
  "ny-keens": { priceLevel: 4, description: "Clay pipes on the ceiling, mutton chops on the plate and over a century of history in every wood-panelled room. A uniquely New York steakhouse." },
  "ny-balthazar": { description: "Keith McNally's SoHo brasserie looks lifted straight from Paris — zinc bar, mirrors, bread baskets. Brunch here is a New York rite of passage." },
  "ny-clinton-st": { description: "The blueberry pancakes with warm maple butter have drawn queues for years. Small, bright and friendly — go early or go on a weekday." },
  "ny-russ-daughters-cafe": { description: "A sit-down offshoot of the century-old appetizing shop: smoked fish boards, bagels and latkes served in a retro diner-style room." },
  "ny-katzs": { description: "The pastrami on rye that made a deli famous. Take a ticket, tip your carver and soak up one of the city's great old-school rooms." },
  "ny-joes-pizza": { description: "The benchmark New York slice — thin, foldable and perfectly balanced. Grab one standing up and eat it on the corner." },
  "ny-levain": { description: "Famously huge, gooey-centred cookies that are more like small cakes. The chocolate chip walnut is the classic." },
  "ny-dominique-ansel": { description: "The SoHo bakery behind the Cronut, still making a limited run each day alongside plenty of other inventive pastries." },
  "ny-double-chicken": { description: "A buzzy Lower East Side bar with a front room for drinks on tap and a back room where cocktails are designed to taste like dishes. Inventive, fun and frequently ranked among the world's best." },
  "ny-pdt": { description: "Walk into a hot-dog shop, step into the phone booth and dial in — it's the original modern speakeasy. Reservations help." },
  "ny-bemelmans": { description: "A gilded piano bar in The Carlyle, wrapped in Ludwig Bemelmans' whimsical murals. Classic martinis, live music and old New York glamour." },
};


// ---------------------------------------------------------------------------
// Vienna
// ---------------------------------------------------------------------------

const v = placeFactory("Vienna, Austria", "food");

const YT_VIENNA_1 = "https://www.youtube.com/watch?v=8h--YHE5rWQ";
const YT_VIENNA_2 = "https://www.youtube.com/watch?v=e23eFbtBSGw";
const YT_CAFES = "https://www.youtube.com/shorts/OAJtgONQL6k";
const YT_CLASSICS = "https://www.youtube.com/shorts/McNbVgJHm88";

/** Places added from the curated list are looked up on Google by street address. */
const va = (id: string, name: string, tagline: string, neighbourhood: string, address: string, lat: number, lng: number) => ({
  ...v(id, name, tagline, neighbourhood, lat, lng),
  mapsQuery: `${name}, ${address}`,
});

const VIENNA: CuratedGuide = {
  slug: "vienna",
  city: "Vienna",
  country: "Austria",
  aliases: ["vienna", "wien", "vienne"],
  intro: "Where we'd eat in Vienna — schnitzel institutions and grand cafés, sausage stands at midnight and the new wave cooking around them.",
  sections: [
    {
      id: "dinner",
      title: "Dinner",
      places: [
        v("vie-skopik-lohn", "Skopik & Lohn", "Viennese bistro", "Leopoldstadt", 48.216, 16.3772),
        v("vie-glacis-beisl", "Glacis Beisl", "Viennese Beisl", "MuseumsQuartier", 48.2036, 16.3578),
        va("vie-figlmuller", "Figlmüller", "Schnitzel institution", "Innere Stadt", "Bäckerstraße 6, 1010 Wien", 48.2087, 16.3765),
        v("vie-schwarzen-kameel", "Zum Schwarzen Kameel", "Viennese classic", "Innere Stadt", 48.2104, 16.3687),
        va("vie-steirereck", "Steirereck", "Fine dining", "Stadtpark", "Am Heumarkt 2A, 1030 Wien", 48.2045, 16.381),
        v("vie-mraz-sohn", "Mraz & Sohn", "Tasting menu", "Brigittenau", 48.2297, 16.3707),
        v("vie-cucina-itameshi", "Cucina Itameshi", "Italian-Japanese", "Leopoldstadt", 48.216, 16.388),
        va("vie-mochi", "Mochi", "Japanese", "Leopoldstadt", "Praterstraße 15, 1020 Wien", 48.214, 16.3815),
        va("vie-kikko-ba", "Kikko Bā", "Japanese tapas", "Freihausviertel", "Schleifmühlgasse 8, 1040 Wien", 48.1965, 16.3655),
        va("vie-nagano", "Nagano", "Japanese izakaya", "Innere Stadt", "Schellinggasse 3, 1010 Wien", 48.2035, 16.373),
        va("vie-nikkai", "Nikkai", "Japanese", "Innere Stadt", "Wipplingerstraße 34, 1010 Wien", 48.2135, 16.367),
        v("vie-chez-bernard", "Chez Bernard", "Rooftop brasserie", "Mariahilf", 48.1982, 16.3485),
        va("vie-bruder", "Bruder", "Fermentation kitchen", "Mariahilf", "Windmühlgasse 20, 1060 Wien", 48.199, 16.3535),
        va("vie-the-bank", "The Bank Brasserie & Bar", "Grand brasserie", "Am Hof", "Am Hof 2, 1010 Wien", 48.211, 16.3675),
        va("vie-cantinetta-antinori", "Cantinetta Antinori", "Tuscan", "Innere Stadt", "Jasomirgottstraße 3-5, 1010 Wien", 48.2085, 16.3715),
        va("vie-terrae", "Terrae", "Tuscan kitchen", "Innere Stadt", "Dorotheergasse 19, 1010 Wien", 48.2065, 16.3695),
        va("vie-pastamara", "Pastamara", "Sicilian", "Ringstraße", "Schubertring 5-7, 1010 Wien", 48.2015, 16.3755),
        va("vie-poco", "Poco", "Wood-fired pizza", "Spittelberg", "Kirchberggasse 6, 1070 Wien", 48.204, 16.355),
        va("vie-plachutta", "Plachutta Gasthaus zur Oper", "Tafelspitz", "Innere Stadt", "Walfischgasse 5, 1010 Wien", 48.2025, 16.3705),
        va("vie-meissl-schadn", "Meissl & Schadn", "Schnitzel", "Ringstraße", "Schubertring 10-12, 1010 Wien", 48.201, 16.3765),
        va("vie-salzamt", "Salzamt", "Viennese classic", "Bermudadreieck", "Ruprechtsplatz 1, 1010 Wien", 48.212, 16.374),
        va("vie-rosi", "Rosi", "Sharing plates", "Rudolfsheim-Fünfhaus", "Sechshauser Straße 120, 1150 Wien", 48.1885, 16.329),
        va("vie-boca", "Boca", "Mediterranean", "Westbahnhof", "Mariahilfer Straße 127a, 1150 Wien", 48.196, 16.3385),
        va("vie-seven-north", "Seven North", "Israeli", "Neubau", "Schottenfeldgasse 74, 1070 Wien", 48.202, 16.341),
        va("vie-kubey", "Kübey", "Neo-Turkish tapas", "Innere Stadt", "Rudolfsplatz 3, 1010 Wien", 48.2145, 16.3705),
        va("vie-el-gaucho", "El Gaucho", "Steakhouse", "Leopoldstadt", "Praterstraße 1, 1020 Wien", 48.212, 16.3795),
        va("vie-lao-lao", "Lao Lao", "Laotian", "Mariahilf", "Mariahilfer Straße 126, 1070 Wien", 48.1955, 16.341),
        va("vie-sura", "Sura", "Restaurant", "Innere Stadt", "Singerstraße 13, 1010 Wien", 48.207, 16.374),
        va("vie-asia-pavillon", "Asia Pavillon", "Asian kitchen", "Wieden", "Favoritenstraße 1, 1040 Wien", 48.198, 16.3705),
        va("vie-arici", "Arici", "Bar & restaurant", "Josefstadt", "Blindengasse 3, 1080 Wien", 48.208, 16.344),
        va("vie-le-petit-jeudi", "Le Petit Jeudi", "French bistro", "Brigittenau", "Traunfelsgasse 1, 1200 Wien", 48.229, 16.37),
        va("vie-meinklang", "Meinklang", "Biodynamic bistro", "Margareten", "Margaretenstraße 58, 1050 Wien", 48.1945, 16.359),
        va("vie-zoku", "Zoku Vienna", "Hotel kitchen & bar", "Leopoldstadt", "Perspektivstraße, 1020 Wien", 48.212, 16.414),
        v("vie-palmenhaus", "Brasserie Palmenhaus", "Glasshouse brasserie", "Burggarten", 48.2052, 16.3664),
        v("vie-cop", "Collection of Produce", "Seasonal produce", "Innere Stadt", 48.2097, 16.3797),
      ],
    },
    {
      id: "lunch",
      title: "Lunch & quick bites",
      places: [
        va("vie-tatarie-marie", "Tatarie Marie", "Tartare bar", "Innere Stadt", "Freisingergasse 1, 1010 Wien", 48.209, 16.37),
        va("vie-casolaro-bros", "Casolaro Bros", "Italian deli", "Landstraße", "Erdbergstraße 53, 1030 Wien", 48.2025, 16.396),
        va("vie-markterei", "Markterei", "Market hall", "Alsergrund", "Severingasse 7, 1090 Wien", 48.221, 16.3535),
        va("vie-babettes", "Babette's", "Cookbook café", "Freihausviertel", "Schleifmühlgasse 17, 1040 Wien", 48.1962, 16.3645),
        va("vie-mochi-ramen-bar", "Mochi Ramen Bar", "Ramen", "Vorgartenmarkt", "Vorgartenmarkt 12-29, 1020 Wien", 48.222, 16.404),
        va("vie-chicken-karate", "Chicken Karate", "Fried chicken", "Vorgartenmarkt", "Vorgartenmarkt 16, 1020 Wien", 48.222, 16.4035),
        va("vie-xo-grill", "XO-Grill", "Smash burgers", "Innere Stadt", "Riemergasse 1-3, 1010 Wien", 48.2075, 16.3765),
        va("vie-smashbox", "Smashbox", "Smash burgers", "Wieden", "Margaretenstraße 11, 1040 Wien", 48.198, 16.3625),
        v("vie-wurstelstand-leo", "Würstelstand Leo", "Historic sausage stand", "Döbling", 48.231, 16.3555),
        v("vie-alles-wurscht", "Alles Wurscht", "Sausage stand", "Innere Stadt", 48.2149, 16.364),
      ],
    },
    {
      id: "brunch",
      title: "Brunch",
      places: [
        va("vie-ahrnst", "Ährnst", "Bistro", "Neubau", "Burggasse 57, 1070 Wien", 48.204, 16.35),
        va("vie-brosl", "Brösl", "Neighbourhood bistro", "Leopoldstadt", "Wohlmutstraße 23, 1020 Wien", 48.214, 16.401),
        va("vie-alice", "Alice", "Italo-Scandi café", "Landstraße", "Krieglergasse 8, 1030 Wien", 48.2085, 16.3925),
        va("vie-cafe-mausi", "Café Mausi", "Café", "Rudolfsheim-Fünfhaus", "Märzstraße 25, 1150 Wien", 48.199, 16.331),
        va("vie-the-chapel", "The Chapel", "Café", "Rudolfsheim-Fünfhaus", "Haidmannsgasse 8, 1150 Wien", 48.1935, 16.333),
        va("vie-cafe-camelle", "Café Camelle", "Café", "Landstraße", "Salesianergasse 23, 1030 Wien", 48.1985, 16.383),
        va("vie-cafe-schaffin", "Café Schäffin", "Café", "Wieden", "Schäffergasse 22, 1040 Wien", 48.1955, 16.364),
        va("vie-bistro-fantasy", "Bistro Fantasy", "Bistro", "Mariahilf", "Gumpendorfer Straße 22, 1060 Wien", 48.1998, 16.3575),
      ],
    },
    {
      id: "coffeehouses",
      title: "Coffee houses",
      places: [
        v("vie-cafe-central", "Café Central", "Grand café", "Innere Stadt", 48.2104, 16.3655),
        va("vie-cafe-prueckel", "Café Prückel", "1950s coffee house", "Stubenring", "Stubenring 24, 1010 Wien", 48.2075, 16.38),
        va("vie-cafe-schwarzenberg", "Café Schwarzenberg", "Ringstraße café", "Ringstraße", "Kärntner Ring 17, 1010 Wien", 48.201, 16.373),
        va("vie-cafe-diglas", "Café Diglas", "Coffee house", "Innere Stadt", "Wollzeile 10, 1010 Wien", 48.2085, 16.3755),
        va("vie-cafe-eiles", "Café Eiles", "Coffee house", "Josefstadt", "Josefstädter Straße 2, 1080 Wien", 48.2105, 16.3555),
        v("vie-cafe-sacher", "Café Sacher", "Sachertorte", "Innere Stadt", 48.2039, 16.3693),
        v("vie-cafe-khm", "Café im Kunsthistorischen Museum", "Museum café", "Maria-Theresien-Platz", 48.2039, 16.3617),
        va("vie-hildebrandt", "Hildebrandt Café", "Café", "Josefstadt", "Laudongasse 15-19, 1080 Wien", 48.214, 16.35),
      ],
    },
    {
      id: "coffee",
      title: "Coffee",
      places: [
        va("vie-jonas-reindl", "Jonas Reindl", "Specialty coffee", "Schottentor", "Währinger Straße 2-4, 1090 Wien", 48.2155, 16.361),
        va("vie-cafe-exchange", "Café Exchange", "Specialty coffee", "Postsparkasse", "Georg-Coch-Platz 2, 1010 Wien", 48.2105, 16.381),
        va("vie-kaffee-hawelka", "Kaffee Rösterei Hawelka", "Roastery café", "Innere Stadt", "Dorotheergasse 7, 1010 Wien", 48.2075, 16.3693),
        va("vie-the-coffee-neubaugasse", "The Coffee (Neubaugasse)", "Specialty coffee", "Neubau", "Neubaugasse 55, 1070 Wien", 48.2005, 16.3495),
        va("vie-the-coffee-1020", "The Coffee (Praterstraße)", "Specialty coffee", "Leopoldstadt", "Praterstraße, 1020 Wien", 48.215, 16.383),
        va("vie-kaffemik", "Kaffemik", "Specialty coffee", "Neubau", "Zollergasse 5, 1070 Wien", 48.201, 16.352),
        va("vie-wildkaffee", "Wildkaffee", "Specialty coffee", "Margareten", "Pilgramgasse 6, 1050 Wien", 48.192, 16.3555),
        va("vie-no-panic", "No Panic Coffee", "Specialty coffee", "Alsergrund", "Währinger Straße 6-8, 1090 Wien", 48.216, 16.3605),
        va("vie-gota", "Gota", "Coffee roastery", "Rudolfsheim-Fünfhaus", "Mariahilfer Straße 192, 1150 Wien", 48.191, 16.3325),
        va("vie-ca-phe-lalot", "Cà Phê Lalot", "Vietnamese coffee", "Innere Stadt", "Wipplingerstraße 25, 1010 Wien", 48.2128, 16.369),
        va("vie-die-cafetiere", "Die Cafetière", "Café", "Innere Stadt", "Wipplingerstraße 25, 1010 Wien", 48.2127, 16.3693),
        va("vie-fenster-cafe", "Fenster Café", "Window coffee", "Griechenviertel", "Griechengasse 10, 1010 Wien", 48.2115, 16.377),
        va("vie-ausgabe", "Ausgabe", "Coffee kiosk", "Alsergrund", "Porzellangasse 1, 1090 Wien", 48.2165, 16.363),
        va("vie-cafe-vitrine", "Café Vitrine", "Café", "Wieden", "Johann-Strauß-Gasse 10-14, 1040 Wien", 48.192, 16.369),
        v("vie-coffee-pirates-bakery", "Coffee Pirates Bakery", "Specialty bakery", "Alsergrund", 48.2208, 16.3528),
      ],
    },
    {
      id: "bakeries",
      title: "Bakeries & cake",
      places: [
        v("vie-demel", "Demel", "Imperial confectioner", "Innere Stadt", 48.2087, 16.3672),
        v("vie-gerstner", "Gerstner", "K.u.K. pâtisserie", "Innere Stadt", 48.2033, 16.37),
        va("vie-sluka", "Sluka", "Pâtisserie", "Rathaus", "Rathausplatz 8, 1010 Wien", 48.2115, 16.3565),
        va("vie-paremi", "Parémi", "French bakery", "Innere Stadt", "Bäckerstraße 10, 1010 Wien", 48.2088, 16.3772),
        va("vie-creme-de-la-creme", "Crème de la Crème", "Pâtisserie", "Josefstadt", "Lange Gasse 76, 1080 Wien", 48.2125, 16.351),
        va("vie-das-tho", "Das Tho", "Bakery", "Leopoldstadt", "Ferdinandstraße 2, 1020 Wien", 48.214, 16.38),
        va("vie-oefferl", "Öfferl", "Bakery", "Leopoldstadt", "Praterstraße 26, 1020 Wien", 48.2155, 16.3835),
        va("vie-freyja", "Freyja", "Croissants", "Josefstadt", "Alser Straße 19, 1080 Wien", 48.214, 16.352),
        va("vie-schwarzbrot", "Bäckerei Schwarzbrot", "Bakery", "Neubau", "1070 Wien", 48.202, 16.348),
      ],
    },
    {
      id: "drinks",
      title: "Drinks",
      places: [
        v("vie-bar-pigalle", "Bar Pigalle", "French bar", "Leopoldstadt", 48.2128, 16.3802),
        va("vie-calypso", "Calypso", "Speakeasy", "Westbahnhof", "Mariahilfer Straße 127a, 1150 Wien", 48.1962, 16.3382),
        va("vie-krypt", "Krypt", "Cocktail bar", "Alsergrund", "Wasagasse 17, 1090 Wien", 48.2175, 16.358),
        va("vie-campari-bar", "Campari Bar", "Aperitivo bar", "Innere Stadt", "Seitzergasse 6, 1010 Wien", 48.2098, 16.369),
        va("vie-sputnik", "Sputnik Bar", "Bar", "Innere Stadt", "Börsegasse 13, 1010 Wien", 48.215, 16.365),
        va("vie-needle", "Needle Vinyl Bar", "Vinyl bar", "Mariahilf", "Barnabitengasse 8, 1060 Wien", 48.1986, 16.354),
        va("vie-rundbar", "Rundbar", "Bar", "Neubau", "Lindengasse 1, 1070 Wien", 48.2, 16.3555),
        va("vie-kleinlaut", "Kleinlaut", "Cocktail bar", "Neubau", "Gutenberggasse 28, 1070 Wien", 48.2032, 16.354),
        va("vie-omk", "O.M.K.", "Bar & kitchen", "Innere Stadt", "Hoher Markt 2, 1010 Wien", 48.211, 16.3735),
        va("vie-rosebar-centrala", "Rosebar Centrala", "Bar & restaurant", "Brigittenau", "Rauscherstraße 5, 1200 Wien", 48.2265, 16.3765),
        v("vie-das-loft", "Das Loft Sky Bar", "Skyline views", "Leopoldstadt", 48.2125, 16.3797),
        v("vie-ammutson", "Ammutsøn", "Craft beer", "Mariahilf", 48.1983, 16.3537),
        v("vie-wind-mills", "Wind&Mills", "Pub & karaoke", "Mariahilf", 48.1966, 16.3584),
      ],
    },
  ],
};

/** Curated write-ups, price levels (1–4) and social posts. */
const VIENNA_DETAILS: Parameters<typeof withDetails>[1] = {
  "vie-skopik-lohn": { priceLevel: 3, social: [YT_VIENNA_1], description: "A buzzy Leopoldstadt bistro under a ceiling covered in black scribbled murals — Viennese and French classics done properly, and a great room for a long dinner." },
  "vie-glacis-beisl": { priceLevel: 2, social: [YT_VIENNA_1], description: "A proper Viennese Beisl tucked behind the MuseumsQuartier, with a leafy garden in summer. Schnitzel, goulash and Austrian wines after an afternoon at the museums." },
  "vie-figlmuller": { priceLevel: 2, social: [YT_CLASSICS], description: "The schnitzel that hangs over the edge of the plate. Pork, pounded thin and fried golden — touristy, yes, but a Vienna rite of passage. Book ahead." },
  "vie-schwarzen-kameel": { priceLevel: 3, social: [YT_VIENNA_2], description: "A delicatessen and restaurant trading since 1618. Stand at the bar for tiny open sandwiches and a glass of wine, or sit down in the Art Nouveau dining room." },
  "vie-mraz-sohn": { priceLevel: 4, social: [YT_VIENNA_2], description: "Father-and-sons cooking with two Michelin stars in an unassuming corner of Brigittenau. Playful, surprising tasting menus — one of Vienna's great special-occasion meals." },
  "vie-cucina-itameshi": { priceLevel: 3, social: [YT_VIENNA_2], description: "Italian meets Japanese on Praterstraße, from the team behind Mochi — think udon cacio e pepe and hamachi tataki in a stylish, lively room." },
  "vie-chez-bernard": { priceLevel: 3, social: [YT_VIENNA_1, YT_CLASSICS], description: "A Parisian-style brasserie and bar on the roof of Hotel Motto on Mariahilfer Straße, with sweeping views over the city. Come for dinner or just a sunset drink." },
  "vie-palmenhaus": { priceLevel: 3, social: [YT_CAFES, YT_CLASSICS], description: "Dinner, brunch or a drink under the glass roof of an Art Nouveau palm house in the Burggarten. The terrace over the gardens is one of the loveliest in the city." },
  "vie-cop": { social: [YT_VIENNA_1], description: "Seasonal, vegetable-led cooking where the produce takes centre stage. It has had a turbulent time at its first-district address, so check it's open before you go." },
  "vie-wurstelstand-leo": { priceLevel: 1, social: [YT_VIENNA_1], description: "Vienna's oldest sausage stand, serving since 1928. Order a Käsekrainer with mustard and a slice of bread — essential after a night out." },
  "vie-alles-wurscht": { priceLevel: 1, social: [YT_VIENNA_1], description: "A modern take on the Würstelstand by the Börse — cheese Krainer made with ox meat, good bread and even calamari fritti." },
  "vie-xo-grill": { priceLevel: 2, social: [YT_VIENNA_1], description: "Some of Europe's best-ranked smash burgers, a short walk from the Naschmarkt. Crispy edges, messy fingers, no regrets." },
  "vie-cafe-central": { priceLevel: 2, social: [YT_CAFES, YT_CLASSICS], description: "Vaulted ceilings, marble pillars and a century and a half of coffee-house history. Expect a queue — go early, order a Melange and apple strudel, and take your time." },
  "vie-demel": { priceLevel: 2, social: [YT_CAFES, YT_CLASSICS], description: "The former imperial confectioner on the Kohlmarkt. Watch the pastry chefs through the glass, then choose from a counter of tortes — the Annatorte is the house favourite." },
  "vie-cafe-sacher": { priceLevel: 3, social: [YT_CAFES], description: "The home of the original Sachertorte, served with unsweetened whipped cream in a red-velvet room by the Opera. A classic for a reason." },
  "vie-gerstner": { priceLevel: 2, social: [YT_CAFES], description: "A former court confectioner on Kärntner Straße — beautiful cakes and a grand upstairs salon looking out towards the Opera." },
  "vie-cafe-khm": { priceLevel: 2, social: [YT_CAFES], description: "Coffee and cake beneath the dome of the Kunsthistorisches Museum — possibly the most beautiful café in Vienna. Worth the museum ticket on its own." },
  "vie-coffee-pirates-bakery": { priceLevel: 1, social: [YT_VIENNA_1], description: "The bakery offshoot of one of Vienna's best specialty roasters, across the street from the café. Pastries and bread to go with properly good coffee." },
  "vie-bar-pigalle": { priceLevel: 2, social: [YT_VIENNA_1], description: "A small, very French bar on Praterstraße — crémant, croque monsieur and cocktails until late." },
  "vie-das-loft": { priceLevel: 3, social: [YT_CLASSICS], description: "On the 18th floor of the Sofitel, with a glowing art ceiling and floor-to-ceiling views over the old town. Go at sunset." },
  "vie-ammutson": { priceLevel: 2, social: [YT_VIENNA_1], description: "A Nordic-themed craft-beer dive near the Haus des Meeres, with a long, rotating tap list and late hours." },
  "vie-wind-mills": { priceLevel: 2, social: [YT_VIENNA_1], description: "A rustic pub on Gumpendorfer Straße with a karaoke bar — a fun, unpretentious late night." },
};


// ---------------------------------------------------------------------------
// Melbourne
// ---------------------------------------------------------------------------

const IG_MEL_1 = "https://www.instagram.com/p/DYQn5h5mcFR/";
const IG_MEL_2 = "https://www.instagram.com/p/DfWXrTjgVZs/";

/** Melbourne places are looked up on Google by their street address, which is more precise than the area. */
const mp = (id: string, name: string, tagline: string, neighbourhood: string, address: string, lat: number, lng: number) => ({
  ...placeFactory("Melbourne, Australia", "food")(id, name, tagline, neighbourhood, lat, lng),
  mapsQuery: `${name}, ${address}`,
});

const MELBOURNE: CuratedGuide = {
  slug: "melbourne",
  city: "Melbourne",
  country: "Australia",
  aliases: ["melbourne", "melb", "naarm", "fitzroy", "collingwood", "brunswick"],
  intro: "Where we'd eat and drink in Melbourne — serious coffee, laneway bakeries and listening bars.",
  sections: [
    {
      id: "coffee",
      title: "Coffee",
      places: [
        mp("mel-disciple-roasters", "Disciple Roasters", "Specialty roaster", "Brunswick", "16 Black St, Brunswick VIC 3056", -37.7685, 144.96),
        mp("mel-acoffee", "Acoffee (CBD)", "Specialty coffee", "CBD", "Melbourne Place, Russell St, Melbourne VIC 3000", -37.8129, 144.9686),
        mp("mel-terror-twilight", "Terror Twilight", "Health-bowl café", "Collingwood", "11-13 Johnston St, Collingwood VIC 3066", -37.7982, 144.985),
      ],
    },
    {
      id: "bakeries",
      title: "Bakeries",
      places: [
        mp("mel-maison-bake", "Maison Bake", "Laneway pâtisserie", "CBD", "28 Corrs Ln, Melbourne VIC 3000", -37.8116, 144.9685),
        mp("mel-masses-bagels", "Masses Bagels", "Bagels", "Fitzroy", "5 Smith St, Fitzroy VIC 3065", -37.8073, 144.9837),
      ],
    },
    {
      id: "dinner",
      title: "Dinner",
      places: [
        mp("mel-chae", "Chae", "Korean tasting", "Cockatoo", "33 Mountain Rd, Cockatoo VIC 3781", -37.9385, 145.4925),
        mp("mel-disuko", "Disuko", "Japanese disco", "CBD", "Level 3/59-63 Bourke St, Melbourne VIC 3000", -37.8111, 144.9712),
      ],
    },
    {
      id: "drinks",
      title: "Drinks",
      places: [
        mp("mel-waxflower", "Waxflower", "Wine & vinyl", "Brunswick", "153 Weston St, Brunswick VIC 3056", -37.7655, 144.97),
        mp("mel-sabi-sounds", "Sabi Sounds", "Listening café", "Hawthorn", "717 Glenferrie Rd, Hawthorn VIC 3122", -37.8198, 145.036),
        mp("mel-slowpoke", "Slowpoke Lounge & Lookout", "Rooftop lounge", "Collingwood", "Level 4/50 Gipps St, Collingwood VIC 3066", -37.8072, 144.9903),
      ],
    },
  ],
};

const MELBOURNE_DETAILS: Parameters<typeof withDetails>[1] = {
  "mel-disciple-roasters": { social: [IG_MEL_1], description: "A Brunswick roastery and café pouring its own beans — the place to go for a properly dialled-in filter or espresso." },
  "mel-acoffee": { social: [IG_MEL_2], description: "The city outpost of one of Melbourne's most exacting specialty coffee bars, tucked into Melbourne Place on Russell Street." },
  "mel-terror-twilight": { social: [IG_MEL_1], description: "From the Wide Open Road team: great coffee and build-your-own health bowls in a bright Collingwood room. Once named Time Out's best café." },
  "mel-maison-bake": { social: [IG_MEL_2], description: "A tiny pâtisserie hidden down Corrs Lane from a Le Cordon Bleu-trained pastry chef. The pudding sells out daily — go early." },
  "mel-masses-bagels": { social: [IG_MEL_2], description: "Chewy, properly boiled bagels at the bottom of Smith Street — grab one loaded up and eat it on the go." },
  "mel-chae": { priceLevel: 4, social: [IG_MEL_1], description: "Chef Jung Eun Chae's celebrated Korean tasting menu, now served in the Dandenong Ranges. Ferments, seasonal produce and one of the hardest bookings in the country." },
  "mel-disuko": { priceLevel: 3, social: [IG_MEL_2], description: "1980s Tokyo disco on a Bourke Street rooftop — Japanese plates, sake and cocktails under mirror balls, with vinyl DJs late into the night." },
  "mel-waxflower": { priceLevel: 2, social: [IG_MEL_1], description: "A natural-wine and listening bar just off Lygon Street, inspired by Europe's casual wine bars and Japan's listening bars. Bring a record — the DJ booth is open to guests." },
  "mel-sabi-sounds": { priceLevel: 2, social: [IG_MEL_1], description: "Melbourne's vinyl listening café and record lounge, Tokyo-to-Seoul inspired, from morning coffee to late listening sessions — with a 10-seat bar out the back." },
  "mel-slowpoke": { priceLevel: 2, social: [IG_MEL_2], description: "A fourth-floor lounge and lookout in Collingwood — an easy, unhurried drink with the city skyline in view." },
};

/** Places added from the curated Vienna list (price levels, posts, write-ups). */
const VIENNA_ADDED: Parameters<typeof withDetails>[1] = {
  "vie-figlmuller": {"social": ["https://www.instagram.com/p/DaTMoJnDkaA/"]},
  "vie-steirereck": {"priceLevel": 4, "social": ["https://www.instagram.com/p/DFsPstOMwRz/", "https://www.instagram.com/p/DLQO5OQtMm1/"], "description": "Vienna's most celebrated restaurant, in a glass pavilion in the Stadtpark — Heinz Reitbauer's inventive Austrian cooking and a legendary bread trolley. Book well ahead."},
  "vie-mochi": {"priceLevel": 2, "social": ["https://www.instagram.com/p/DFsPstOMwRz/", "https://www.instagram.com/p/DaTMoJnDkaA/"], "description": "The Leopoldstadt original that started Vienna's Mochi family — lively, modern Japanese cooking that's been packed since day one."},
  "vie-kikko-ba": {"priceLevel": 2, "social": ["https://www.instagram.com/p/DFsPstOMwRz/", "https://www.instagram.com/p/DaTMoJnDkaA/"], "description": "A tiny izakaya-style bar from the Mochi group: Japanese-fusion small plates with sake, natural wine and a little garden out back."},
  "vie-nagano": {"priceLevel": 2, "social": ["https://www.instagram.com/p/DfNOAjCjALe/"], "description": "A modern take on Japanese izakaya cooking, a few steps off the Ring — good for lunch or a relaxed dinner."},
  "vie-nikkai": {"social": ["https://www.instagram.com/p/DfNOAjCjALe/"]},
  "vie-bruder": {"priceLevel": 3, "social": ["https://www.instagram.com/p/DFsPstOMwRz/"], "description": "A Mariahilf favourite built around fermenting, pickling and foraging, with natural wines and a buzzing late-night bar."},
  "vie-the-bank": {"priceLevel": 3, "social": ["https://www.instagram.com/p/DFsPstOMwRz/", "https://www.instagram.com/p/DfNOAjCjALe/"], "description": "A brasserie in the marble banking hall of the Park Hyatt — a properly grand room for dinner or a drink."},
  "vie-cantinetta-antinori": {"priceLevel": 3, "social": ["https://www.instagram.com/p/DaTMoJnDkaA/"], "description": "The Antinori wine family's Tuscan trattoria by Stephansplatz — classic Italian cooking and their own wines by the glass."},
  "vie-terrae": {"priceLevel": 3, "social": ["https://www.instagram.com/p/DfNOAjCjALe/"], "description": "Upscale Tuscan cooking off the Graben: homemade pasta (with truffles in season), seasonal dishes and a serious wine list."},
  "vie-pastamara": {"priceLevel": 3, "social": ["https://www.instagram.com/p/DfNOAjCjALe/"], "description": "Sicilian cooking on the Ring — pasta, seafood and island classics in a polished hotel dining room."},
  "vie-poco": {"priceLevel": 2, "social": ["https://www.instagram.com/p/Dd65Y_FDT74/", "https://www.instagram.com/p/DZ27ZAwjIZ-/", "https://www.instagram.com/p/De4zHiHPUKj/"], "description": "An Italian-inspired neighbourhood spot in the Miiro Spittelberg hotel, built around a wood-fired oven. Pizza, small plates and drinks."},
  "vie-plachutta": {"priceLevel": 3, "social": ["https://www.instagram.com/p/DaTMoJnDkaA/"], "description": "Vienna's temple of Tafelspitz — boiled beef served in its broth with apple-horseradish and chive sauce, a few steps from the Opera."},
  "vie-meissl-schadn": {"priceLevel": 3, "social": ["https://www.instagram.com/p/DYSTxU7jVi6/"], "description": "Schnitzel done three ways — fried in butter, lard or oil — in a handsome room on the Ring. Watch them being pounded in the open kitchen."},
  "vie-salzamt": {"priceLevel": 2, "social": ["https://www.instagram.com/p/DZ27ZAwjIZ-/"], "description": "A long-standing Viennese restaurant by Ruprechtskirche, with a Hermann Czech-designed room and a lovely terrace in summer."},
  "vie-rosi": {"priceLevel": 2, "social": ["https://www.instagram.com/p/DUL0jKMiLc5/", "https://www.instagram.com/p/DZ27ZAwjIZ-/"], "description": "A Michelin-listed bistro in an old Viennese inn — vegetable-leaning sharing plates in the evenings and a much-loved weekend breakfast."},
  "vie-boca": {"priceLevel": 2, "social": ["https://www.instagram.com/p/DfNOAjCjALe/", "https://www.instagram.com/p/DZ27ZAwjIZ-/", "https://www.instagram.com/p/De4zHiHPUKj/"], "description": "The restaurant at The Companion hotel by Westbahnhof — modern Mediterranean cooking from a former Ottolenghi chef."},
  "vie-seven-north": {"priceLevel": 2, "social": ["https://www.instagram.com/p/DZ27ZAwjIZ-/"], "description": "Haya Molcho's Israeli-Mediterranean restaurant at Max Brown — colourful sharing plates and a lively room."},
  "vie-kubey": {"priceLevel": 2, "social": ["https://www.instagram.com/p/DaTMoJnDkaA/"], "description": "Modern Turkish small plates with natural wines and rakı cocktails, a garden and the occasional DJ. The name means roughly “Mother Earth”."},
  "vie-el-gaucho": {"priceLevel": 3, "social": ["https://www.instagram.com/p/DaTMoJnDkaA/"], "description": "A steakhouse in the Design Tower on Praterstraße — dry-aged cuts and Argentinian-style grilling."},
  "vie-lao-lao": {"priceLevel": 2, "social": ["https://www.instagram.com/p/DaTMoJnDkaA/"], "description": "Laotian cooking on Mariahilfer Straße — fresh, herby and spicy."},
  "vie-sura": {"social": ["https://www.instagram.com/p/DaTMoJnDkaA/"]},
  "vie-asia-pavillon": {"social": ["https://www.instagram.com/p/DaTMoJnDkaA/"]},
  "vie-arici": {"social": ["https://www.instagram.com/p/DaTMoJnDkaA/"]},
  "vie-le-petit-jeudi": {"priceLevel": 2, "social": ["https://www.instagram.com/p/DRmlPsHjJH8/"], "description": "A small French bistro with an open kitchen and a garden — breakfast at the weekend, dinner on Thursdays and Fridays."},
  "vie-meinklang": {"priceLevel": 2, "social": ["https://www.instagram.com/p/DLQO5OQtMm1/", "https://www.instagram.com/p/DYSTxU7jVi6/"], "description": "The city outpost of the Burgenland biodynamic farm and winery — their wines and produce, simply cooked."},
  "vie-zoku": {"priceLevel": 2, "social": ["https://www.instagram.com/p/DfNOAjCjALe/"]},
  "vie-tatarie-marie": {"priceLevel": 2, "social": ["https://www.instagram.com/p/DFsPstOMwRz/"], "description": "A tiny bar devoted to steak tartare in inventive variations — the “tartare pralines” are the thing to order. Seats are few."},
  "vie-casolaro-bros": {"social": ["https://www.instagram.com/p/DFsPstOMwRz/"]},
  "vie-markterei": {"social": ["https://www.instagram.com/p/DY4FpFmjeDI/"]},
  "vie-babettes": {"priceLevel": 2, "social": ["https://www.instagram.com/p/DVtlm7QiNUg/"], "description": "A spice shop and cookbook store with a small kitchen — lunch dishes inspired by the books on the shelves."},
  "vie-mochi-ramen-bar": {"priceLevel": 1, "social": ["https://www.instagram.com/p/DWzf_WFiIue/"], "description": "The Mochi group's ramen counter at Vorgartenmarkt — rich broths and noodles, quick and good."},
  "vie-chicken-karate": {"priceLevel": 1, "social": ["https://www.instagram.com/p/DaTMoJnDkaA/"], "description": "Korean-style fried chicken at the Vorgartenmarkt."},
  "vie-xo-grill": {"social": ["https://www.instagram.com/p/DaTMoJnDkaA/"]},
  "vie-smashbox": {"priceLevel": 1, "social": ["https://www.instagram.com/p/DaTMoJnDkaA/"]},
  "vie-ahrnst": {"social": ["https://www.instagram.com/p/DRmlPsHjJH8/", "https://www.instagram.com/p/DUL0jKMiLc5/", "https://www.instagram.com/p/DLQO5OQtMm1/", "https://www.instagram.com/p/DYSTxU7jVi6/"]},
  "vie-brosl": {"social": ["https://www.instagram.com/p/DFsPstOMwRz/", "https://www.instagram.com/p/DYSTxU7jVi6/"]},
  "vie-alice": {"priceLevel": 2, "social": ["https://www.instagram.com/p/DUL0jKMiLc5/", "https://www.instagram.com/p/DYSTxU7jVi6/"], "description": "An Italian-Scandinavian café and enoteca in a former dairy shop — pastries and coffee by day, small plates and wine by night."},
  "vie-cafe-mausi": {"social": ["https://www.instagram.com/p/DeZSEpqjcHV/"]},
  "vie-the-chapel": {"social": ["https://www.instagram.com/p/DeZSEpqjcHV/"]},
  "vie-cafe-camelle": {"social": ["https://www.instagram.com/p/Dd65Y_FDT74/"]},
  "vie-cafe-schaffin": {"social": ["https://www.instagram.com/p/DfbpQwCjkly/"]},
  "vie-bistro-fantasy": {"social": ["https://www.instagram.com/p/DYSTxU7jVi6/"]},
  "vie-cafe-prueckel": {"priceLevel": 2, "social": ["https://www.instagram.com/p/DY4FpFmjeDI/"], "description": "A classic coffee house with a perfectly preserved 1950s interior opposite the MAK — newspapers, Melange and apple strudel."},
  "vie-cafe-schwarzenberg": {"priceLevel": 2, "social": ["https://www.instagram.com/p/DY4FpFmjeDI/"], "description": "One of the oldest coffee houses on the Ring, with wood panelling, mirrors and a terrace onto Schwarzenbergplatz."},
  "vie-cafe-diglas": {"priceLevel": 2, "social": ["https://www.instagram.com/p/DVtlm7QiNUg/"], "description": "A traditional Viennese café near Stephansdom, famous for its enormous homemade cakes and strudels."},
  "vie-cafe-eiles": {"priceLevel": 2, "social": ["https://www.instagram.com/p/DUL0jKMiLc5/"], "description": "A Josefstadt institution behind the parliament — red banquettes, waiters in black and a proper Viennese breakfast."},
  "vie-hildebrandt": {"social": ["https://www.instagram.com/p/DFsPstOMwRz/"]},
  "vie-jonas-reindl": {"priceLevel": 1, "social": ["https://www.instagram.com/p/DYSTxU7jVi6/"], "description": "One of the pioneers of Vienna's third-wave coffee scene, by Schottentor — a sleek bar with beans from top European roasters."},
  "vie-cafe-exchange": {"priceLevel": 1, "social": ["https://www.instagram.com/p/De4zHiHPUKj/"], "description": "Specialty coffee and lunch in the cash hall of Otto Wagner's Postsparkasse — worth the visit for the building alone."},
  "vie-kaffee-hawelka": {"priceLevel": 1, "social": ["https://www.instagram.com/p/DUL0jKMiLc5/"]},
  "vie-the-coffee-neubaugasse": {"priceLevel": 1, "social": ["https://www.instagram.com/p/DUL0jKMiLc5/", "https://www.instagram.com/p/Dd65Y_FDT74/"]},
  "vie-the-coffee-1020": {"priceLevel": 1, "social": ["https://www.instagram.com/p/De4zHiHPUKj/"]},
  "vie-kaffemik": {"priceLevel": 1, "social": ["https://www.instagram.com/p/DfxZVvbo5C8/"]},
  "vie-wildkaffee": {"priceLevel": 1, "social": ["https://www.instagram.com/p/DfxZVvbo5C8/"]},
  "vie-no-panic": {"priceLevel": 1, "social": ["https://www.instagram.com/p/DfxZVvbo5C8/", "https://www.instagram.com/p/DLQO5OQtMm1/"]},
  "vie-gota": {"priceLevel": 1, "social": ["https://www.instagram.com/p/DfxZVvbo5C8/"]},
  "vie-ca-phe-lalot": {"priceLevel": 1, "social": ["https://www.instagram.com/p/DRmlPsHjJH8/"]},
  "vie-die-cafetiere": {"priceLevel": 1, "social": ["https://www.instagram.com/p/DUL0jKMiLc5/"]},
  "vie-fenster-cafe": {"priceLevel": 1, "social": ["https://www.instagram.com/p/DWzf_WFiIue/"], "description": "Coffee served through a window — famous for espresso in an edible waffle cone."},
  "vie-ausgabe": {"priceLevel": 1, "social": ["https://www.instagram.com/p/De4zHiHPUKj/"]},
  "vie-cafe-vitrine": {"social": ["https://www.instagram.com/p/DVtlm7QiNUg/"]},
  "vie-sluka": {"priceLevel": 2, "social": ["https://www.instagram.com/p/DVtlm7QiNUg/"], "description": "A former court confectioner by the Rathaus — elegant cakes and petits fours."},
  "vie-paremi": {"priceLevel": 1, "social": ["https://www.instagram.com/p/DFsPstOMwRz/", "https://www.instagram.com/p/DLQO5OQtMm1/"]},
  "vie-creme-de-la-creme": {"priceLevel": 1, "social": ["https://www.instagram.com/p/DFsPstOMwRz/"]},
  "vie-das-tho": {"priceLevel": 1, "social": ["https://www.instagram.com/p/DUL0jKMiLc5/", "https://www.instagram.com/p/DYSTxU7jVi6/", "https://www.instagram.com/p/De4zHiHPUKj/"]},
  "vie-oefferl": {"priceLevel": 1, "social": ["https://www.instagram.com/p/DVtlm7QiNUg/", "https://www.instagram.com/p/DLQO5OQtMm1/"]},
  "vie-freyja": {"priceLevel": 1, "social": ["https://www.instagram.com/p/DLQO5OQtMm1/"], "description": "Scandinavian-style croissant bakery from Budapest — the pistachio croissant is the one everyone orders."},
  "vie-schwarzbrot": {"priceLevel": 1, "social": ["https://www.instagram.com/p/DYSTxU7jVi6/"]},
  "vie-calypso": {"priceLevel": 3, "social": ["https://www.instagram.com/p/DeZSEpqjcHV/"], "description": "A dim, red-marble speakeasy in The Companion hotel with a drinks list built on the myth of Calypso — Falstaff's Speakeasy Bar of the Year."},
  "vie-krypt": {"priceLevel": 3, "social": ["https://www.instagram.com/p/DeZSEpqjcHV/"], "description": "Cocktails in a vaulted basement — one of Vienna's best bars, and a favourite late-night hideaway."},
  "vie-campari-bar": {"priceLevel": 3, "social": ["https://www.instagram.com/p/DeZSEpqjcHV/"]},
  "vie-sputnik": {"social": ["https://www.instagram.com/p/DeZSEpqjcHV/"]},
  "vie-needle": {"priceLevel": 2, "social": ["https://www.instagram.com/p/DeZSEpqjcHV/"], "description": "Records on the turntable, a good sound system and a short cocktail list, just off Mariahilfer Straße."},
  "vie-rundbar": {"social": ["https://www.instagram.com/p/DY4FpFmjeDI/", "https://www.instagram.com/p/Dd65Y_FDT74/"]},
  "vie-kleinlaut": {"priceLevel": 2, "social": ["https://www.instagram.com/p/De4zHiHPUKj/"], "description": "A small, cosy Neubau bar with a short list of highballs and cocktails, house lemonades and a few seats outside."},
  "vie-omk": {"social": ["https://www.instagram.com/p/DZ27ZAwjIZ-/"]},
  "vie-rosebar-centrala": {"social": ["https://www.instagram.com/p/DFsPstOMwRz/", "https://www.instagram.com/p/DY4FpFmjeDI/"]},
};

/** More posts for places that were already in the guide. */
const VIENNA_MORE_SOCIAL: Record<string, string[]> = {
  "vie-skopik-lohn": ["https://www.instagram.com/p/DWzf_WFiIue/"],
  "vie-glacis-beisl": ["https://www.instagram.com/p/DVtlm7QiNUg/"],
  "vie-schwarzen-kameel": ["https://www.instagram.com/p/DaTMoJnDkaA/"],
  "vie-mraz-sohn": ["https://www.instagram.com/p/DFsPstOMwRz/"],
  "vie-cucina-itameshi": ["https://www.instagram.com/p/DRmlPsHjJH8/", "https://www.instagram.com/p/DaTMoJnDkaA/", "https://www.instagram.com/p/DY4FpFmjeDI/", "https://www.instagram.com/p/DYSTxU7jVi6/", "https://www.instagram.com/p/DP85nqPiDo_/", "https://www.instagram.com/p/DclbB6bDN4G/"],
  "vie-chez-bernard": ["https://www.instagram.com/p/DFsPstOMwRz/"],
  "vie-demel": ["https://www.instagram.com/p/DY4FpFmjeDI/"],
};

export const FOOD_GUIDES: CuratedGuide[] = [withDetails(NEW_YORK, NEW_YORK_DETAILS), withDetails(VIENNA, mergeDetails(VIENNA_DETAILS, VIENNA_ADDED, VIENNA_MORE_SOCIAL)), withDetails(MELBOURNE, MELBOURNE_DETAILS)];

export const guideBySlug = (slug: string | null | undefined) => findGuide(FOOD_GUIDES, slug);
export const matchGuides = (q: string) => match(FOOD_GUIDES, q);
