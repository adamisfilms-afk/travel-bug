/**
 * Curated food guides (sample content until guides move into the database).
 * Photo picks (`photo`) come from the ?curate=1 mode on the Food page.
 */
import { findGuide, matchGuides as match, placeFactory, withDetails, type CuratedGuide } from "../curated/types";

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
        v("vie-figlmuller", "Figlmüller", "Schnitzel institution", "Innere Stadt", 48.209, 16.3742),
        v("vie-schwarzen-kameel", "Zum Schwarzen Kameel", "Viennese classic", "Innere Stadt", 48.2104, 16.3687),
        v("vie-mraz-sohn", "Mraz & Sohn", "Tasting menu", "Brigittenau", 48.2297, 16.3707),
        v("vie-cucina-itameshi", "Cucina Itameshi", "Italian-Japanese", "Leopoldstadt", 48.216, 16.388),
        v("vie-chez-bernard", "Chez Bernard", "Rooftop brasserie", "Mariahilf", 48.1982, 16.3485),
        v("vie-palmenhaus", "Brasserie Palmenhaus", "Glasshouse brasserie", "Burggarten", 48.2052, 16.3664),
        v("vie-cop", "Collection of Produce", "Seasonal produce", "Innere Stadt", 48.2097, 16.3797),
      ],
    },
    {
      id: "lunch",
      title: "Quick bites",
      places: [
        v("vie-wurstelstand-leo", "Würstelstand Leo", "Historic sausage stand", "Döbling", 48.231, 16.3555),
        v("vie-alles-wurscht", "Alles Wurscht", "Sausage stand", "Innere Stadt", 48.2149, 16.364),
        v("vie-xo-grill", "XO-Grill", "Smash burgers", "Margareten", 48.1963, 16.3606),
      ],
    },
    {
      id: "coffee",
      title: "Coffee & cake",
      places: [
        v("vie-cafe-central", "Café Central", "Grand café", "Innere Stadt", 48.2104, 16.3655),
        v("vie-demel", "Demel", "Imperial confectioner", "Innere Stadt", 48.2087, 16.3672),
        v("vie-cafe-sacher", "Café Sacher", "Sachertorte", "Innere Stadt", 48.2039, 16.3693),
        v("vie-gerstner", "Gerstner", "K.u.K. pâtisserie", "Innere Stadt", 48.2033, 16.37),
        v("vie-cafe-khm", "Café im Kunsthistorischen Museum", "Museum café", "Maria-Theresien-Platz", 48.2039, 16.3617),
        v("vie-coffee-pirates-bakery", "Coffee Pirates Bakery", "Specialty bakery", "Alsergrund", 48.2208, 16.3528),
      ],
    },
    {
      id: "drinks",
      title: "Drinks",
      places: [
        v("vie-bar-pigalle", "Bar Pigalle", "French bar", "Leopoldstadt", 48.2128, 16.3802),
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

export const FOOD_GUIDES: CuratedGuide[] = [withDetails(NEW_YORK, NEW_YORK_DETAILS), withDetails(VIENNA, VIENNA_DETAILS)];

export const guideBySlug = (slug: string | null | undefined) => findGuide(FOOD_GUIDES, slug);
export const matchGuides = (q: string) => match(FOOD_GUIDES, q);
