import type { ActivityCategory } from "./types";

export interface ActivitySuggestion {
  name: string;
  category: ActivityCategory;
  lat: number;
  lng: number;
}

/** Small curated set used by the planner's "suggestions" until Explore is built. */
export const ACTIVITY_SUGGESTIONS: Record<string, ActivitySuggestion[]> = {
  "New York City": [
    { name: "Museum of Modern Art", category: "sight", lat: 40.7614, lng: -73.9776 },
    { name: "Zabars", category: "food", lat: 40.7849, lng: -73.9796 },
    { name: "Hamilton Musical", category: "show", lat: 40.759, lng: -73.9866 },
    { name: "The High Line", category: "outdoors", lat: 40.748, lng: -74.0048 },
    { name: "Metropolitan Museum of Art", category: "sight", lat: 40.7794, lng: -73.9632 },
    { name: "Katz's Delicatessen", category: "food", lat: 40.7223, lng: -73.9874 },
    { name: "Top of the Rock", category: "sight", lat: 40.7593, lng: -73.9794 },
    { name: "Central Park ice skating", category: "outdoors", lat: 40.768, lng: -73.9742 },
  ],
  Budapest: [
    { name: "Széchenyi Thermal Bath", category: "outdoors", lat: 47.5186, lng: 19.0819 },
    { name: "Buda Castle", category: "sight", lat: 47.4962, lng: 19.0398 },
    { name: "Hungarian Parliament tour", category: "sight", lat: 47.5071, lng: 19.0457 },
    { name: "Great Market Hall", category: "food", lat: 47.4869, lng: 19.0585 },
    { name: "Szimpla Kert", category: "food", lat: 47.4971, lng: 19.0632 },
    { name: "Hungarian State Opera", category: "show", lat: 47.5025, lng: 19.0587 },
  ],
  London: [
    { name: "British Museum", category: "sight", lat: 51.5194, lng: -0.127 },
    { name: "Borough Market", category: "food", lat: 51.5055, lng: -0.091 },
    { name: "Hyde Park", category: "outdoors", lat: 51.5073, lng: -0.1657 },
  ],
  Paris: [
    { name: "Musée d'Orsay", category: "sight", lat: 48.86, lng: 2.3266 },
    { name: "Eiffel Tower", category: "sight", lat: 48.8584, lng: 2.2945 },
    { name: "Marché des Enfants Rouges", category: "food", lat: 48.8629, lng: 2.3619 },
  ],
};

export function suggestionsFor(destination: string): ActivitySuggestion[] {
  const d = destination.toLowerCase();
  const key = Object.keys(ACTIVITY_SUGGESTIONS).find(
    (k) => d.includes(k.toLowerCase()) || k.toLowerCase().includes(d) || (d === "nyc" && k === "New York City"),
  );
  return key ? ACTIVITY_SUGGESTIONS[key] : [];
}

export const CATEGORY_LABEL: Record<ActivityCategory, string> = {
  sight: "Sight",
  food: "Food & drink",
  show: "Show",
  outdoors: "Outdoors",
  shopping: "Shopping",
  travel: "Travel",
  other: "Other",
};
