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
  "ny-carbone": { priceLevel: 4, description: "Red-sauce theatre at its most polished — tuxedoed captains, tableside Caesar and the spicy rigatoni everyone posts about. Booking is a sport, but the night lives up to it." },
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

export const FOOD_GUIDES: CuratedGuide[] = [withDetails(NEW_YORK, NEW_YORK_DETAILS)];

export const guideBySlug = (slug: string | null | undefined) => findGuide(FOOD_GUIDES, slug);
export const matchGuides = (q: string) => match(FOOD_GUIDES, q);
