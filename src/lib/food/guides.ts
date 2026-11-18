/**
 * Curated food guides. Each city has sections (Dinner, Brunch, Sweet, Drinks…) of
 * hand-picked places. This file is sample content until guides move into the database.
 */

export interface FoodPlace {
  id: string;
  name: string;
  /** Two words max, e.g. "Fine dining", "Italian". */
  tagline: string;
  neighbourhood: string;
  /** Used to find the official Google Maps listing (photo, rating) — name + area is enough. */
  mapsQuery: string;
  lat: number;
  lng: number;
}

export interface FoodSection {
  id: string;
  title: string;
  places: FoodPlace[];
}

export interface FoodGuide {
  slug: string;
  city: string;
  country: string;
  /** Other names people search by. */
  aliases: string[];
  intro: string;
  sections: FoodSection[];
}

const place = (id: string, name: string, tagline: string, neighbourhood: string, lat: number, lng: number): FoodPlace => ({
  id,
  name,
  tagline,
  neighbourhood,
  mapsQuery: `${name}, ${neighbourhood}, New York, NY`,
  lat,
  lng,
});

const NEW_YORK: FoodGuide = {
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
        place("ny-carbone", "Carbone", "Italian-American", "Greenwich Village", 40.7279, -74.0003),
        place("ny-le-bernardin", "Le Bernardin", "Fine dining", "Midtown", 40.7615, -73.9818),
        place("ny-via-carota", "Via Carota", "Italian", "West Village", 40.7334, -74.0035),
        place("ny-lilia", "Lilia", "Pasta", "Williamsburg", 40.7176, -73.9524),
        place("ny-atomix", "Atomix", "Korean tasting", "NoMad", 40.7442, -73.9837),
        place("ny-peter-luger", "Peter Luger", "Steakhouse", "Williamsburg", 40.7099, -73.9623),
        place("ny-don-angie", "Don Angie", "Italian-American", "West Village", 40.7376, -74.0029),
      ],
    },
    {
      id: "brunch",
      title: "Brunch",
      places: [
        place("ny-balthazar", "Balthazar", "French brasserie", "SoHo", 40.7226, -73.998),
        place("ny-clinton-st", "Clinton St. Baking Company", "Pancakes", "Lower East Side", 40.7212, -73.9839),
        place("ny-russ-daughters-cafe", "Russ & Daughters Cafe", "Jewish appetizing", "Lower East Side", 40.7196, -73.9898),
        place("ny-sadelles", "Sadelle's", "Bagel brunch", "SoHo", 40.7244, -74.0024),
        place("ny-buvette", "Buvette", "French café", "West Village", 40.7326, -74.0048),
        place("ny-jacks-wife-freda", "Jack's Wife Freda", "Mediterranean", "SoHo", 40.7254, -73.9984),
      ],
    },
    {
      id: "lunch",
      title: "Lunch on the go",
      places: [
        place("ny-katzs", "Katz's Delicatessen", "Classic deli", "Lower East Side", 40.7223, -73.9874),
        place("ny-joes-pizza", "Joe's Pizza", "NY slice", "Greenwich Village", 40.7305, -74.0021),
        place("ny-xian", "Xi'an Famous Foods", "Hand-pulled noodles", "Chinatown", 40.7155, -73.9973),
        place("ny-los-tacos", "Los Tacos No. 1", "Tacos", "Chelsea Market", 40.7424, -74.0061),
        place("ny-prince-st", "Prince Street Pizza", "Square slice", "Nolita", 40.7231, -73.9945),
        place("ny-superiority", "Superiority Burger", "Vegetarian diner", "East Village", 40.7262, -73.9844),
      ],
    },
    {
      id: "sweet",
      title: "Sweet",
      places: [
        place("ny-levain", "Levain Bakery", "Giant cookies", "Upper West Side", 40.7799, -73.9802),
        place("ny-dominique-ansel", "Dominique Ansel Bakery", "French pastry", "SoHo", 40.7252, -74.0029),
        place("ny-morgensterns", "Morgenstern's Finest Ice Cream", "Ice cream", "Lower East Side", 40.7212, -73.9883),
        place("ny-lady-m", "Lady M", "Crêpe cakes", "Upper East Side", 40.7718, -73.9629),
        place("ny-venieros", "Veniero's", "Italian pastry", "East Village", 40.7296, -73.9848),
        place("ny-magnolia", "Magnolia Bakery", "Banana pudding", "West Village", 40.7358, -74.005),
      ],
    },
    {
      id: "coffee",
      title: "Coffee",
      places: [
        place("ny-la-cabra", "La Cabra", "Specialty coffee", "East Village", 40.7262, -73.9876),
        place("ny-devocion", "Devoción", "Colombian roaster", "Williamsburg", 40.7162, -73.9643),
        place("ny-abraco", "Abraço", "Espresso bar", "East Village", 40.7268, -73.9866),
        place("ny-sey", "Sey Coffee", "Light roast", "Bushwick", 40.7066, -73.9223),
      ],
    },
    {
      id: "drinks",
      title: "Drinks",
      places: [
        place("ny-double-chicken", "Double Chicken Please", "Cocktail bar", "Lower East Side", 40.7196, -73.9909),
        place("ny-attaboy", "Attaboy", "No-menu cocktails", "Lower East Side", 40.7189, -73.9918),
        place("ny-death-co", "Death & Co", "Cocktail bar", "East Village", 40.7258, -73.9845),
        place("ny-pdt", "Please Don't Tell", "Hidden speakeasy", "East Village", 40.7271, -73.9837),
        place("ny-dead-rabbit", "The Dead Rabbit", "Irish pub", "Financial District", 40.7034, -74.0111),
        place("ny-bemelmans", "Bemelmans Bar", "Piano bar", "Upper East Side", 40.7743, -73.9637),
      ],
    },
  ],
};

export const FOOD_GUIDES: FoodGuide[] = [NEW_YORK];

export function guideBySlug(slug: string | null | undefined) {
  return FOOD_GUIDES.find((g) => g.slug === slug);
}

/** Guides whose city, country or aliases match what's being typed. */
export function matchGuides(q: string): FoodGuide[] {
  const s = q.trim().toLowerCase();
  if (!s) return [];
  return FOOD_GUIDES.filter(
    (g) =>
      g.city.toLowerCase().includes(s) ||
      g.country.toLowerCase().includes(s) ||
      g.aliases.some((a) => a.startsWith(s) || s.startsWith(a)),
  );
}
