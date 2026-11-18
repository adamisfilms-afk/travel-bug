import type { Place } from "./types";

/** Static airport list used for autocomplete and map coordinates. */
export const AIRPORTS: Place[] = [
  { code: "LHR", name: "London Heathrow", city: "London", country: "United Kingdom", lat: 51.47, lng: -0.4543 },
  { code: "LGW", name: "London Gatwick", city: "London", country: "United Kingdom", lat: 51.1537, lng: -0.1821 },
  { code: "STN", name: "London Stansted", city: "London", country: "United Kingdom", lat: 51.886, lng: 0.2389 },
  { code: "MAN", name: "Manchester", city: "Manchester", country: "United Kingdom", lat: 53.365, lng: -2.2727 },
  { code: "EDI", name: "Edinburgh", city: "Edinburgh", country: "United Kingdom", lat: 55.95, lng: -3.3725 },
  { code: "DUB", name: "Dublin", city: "Dublin", country: "Ireland", lat: 53.4213, lng: -6.2701 },
  { code: "JFK", name: "John F Kennedy Intl", city: "New York City", country: "United States", lat: 40.6413, lng: -73.7781 },
  { code: "EWR", name: "Newark Liberty Intl", city: "New York City", country: "United States", lat: 40.6895, lng: -74.1745 },
  { code: "LGA", name: "LaGuardia", city: "New York City", country: "United States", lat: 40.7769, lng: -73.874 },
  { code: "BOS", name: "Boston Logan Intl", city: "Boston", country: "United States", lat: 42.3656, lng: -71.0096 },
  { code: "LAX", name: "Los Angeles Intl", city: "Los Angeles", country: "United States", lat: 33.9416, lng: -118.4085 },
  { code: "SFO", name: "San Francisco Intl", city: "San Francisco", country: "United States", lat: 37.6213, lng: -122.379 },
  { code: "ORD", name: "Chicago O'Hare", city: "Chicago", country: "United States", lat: 41.9742, lng: -87.9073 },
  { code: "MIA", name: "Miami Intl", city: "Miami", country: "United States", lat: 25.7959, lng: -80.287 },
  { code: "YYZ", name: "Toronto Pearson", city: "Toronto", country: "Canada", lat: 43.6777, lng: -79.6248 },
  { code: "BUD", name: "Budapest Ferenc Liszt Intl", city: "Budapest", country: "Hungary", lat: 47.4369, lng: 19.2556 },
  { code: "CDG", name: "Paris Charles de Gaulle", city: "Paris", country: "France", lat: 49.0097, lng: 2.5479 },
  { code: "ORY", name: "Paris Orly", city: "Paris", country: "France", lat: 48.7262, lng: 2.3652 },
  { code: "AMS", name: "Amsterdam Schiphol", city: "Amsterdam", country: "Netherlands", lat: 52.3105, lng: 4.7683 },
  { code: "FRA", name: "Frankfurt", city: "Frankfurt", country: "Germany", lat: 50.0379, lng: 8.5622 },
  { code: "BER", name: "Berlin Brandenburg", city: "Berlin", country: "Germany", lat: 52.3667, lng: 13.5033 },
  { code: "MUC", name: "Munich", city: "Munich", country: "Germany", lat: 48.3537, lng: 11.775 },
  { code: "MAD", name: "Madrid Barajas", city: "Madrid", country: "Spain", lat: 40.4983, lng: -3.5676 },
  { code: "BCN", name: "Barcelona El Prat", city: "Barcelona", country: "Spain", lat: 41.2974, lng: 2.0833 },
  { code: "LIS", name: "Lisbon Humberto Delgado", city: "Lisbon", country: "Portugal", lat: 38.7742, lng: -9.1342 },
  { code: "FCO", name: "Rome Fiumicino", city: "Rome", country: "Italy", lat: 41.8003, lng: 12.2389 },
  { code: "MXP", name: "Milan Malpensa", city: "Milan", country: "Italy", lat: 45.6306, lng: 8.7281 },
  { code: "VIE", name: "Vienna Intl", city: "Vienna", country: "Austria", lat: 48.1103, lng: 16.5697 },
  { code: "PRG", name: "Prague Václav Havel", city: "Prague", country: "Czechia", lat: 50.1008, lng: 14.26 },
  { code: "CPH", name: "Copenhagen Kastrup", city: "Copenhagen", country: "Denmark", lat: 55.618, lng: 12.656 },
  { code: "ATH", name: "Athens Intl", city: "Athens", country: "Greece", lat: 37.9364, lng: 23.9445 },
  { code: "IST", name: "Istanbul", city: "Istanbul", country: "Türkiye", lat: 41.2753, lng: 28.7519 },
  { code: "DXB", name: "Dubai Intl", city: "Dubai", country: "UAE", lat: 25.2532, lng: 55.3657 },
  { code: "DOH", name: "Hamad Intl", city: "Doha", country: "Qatar", lat: 25.2731, lng: 51.6081 },
  { code: "SIN", name: "Singapore Changi", city: "Singapore", country: "Singapore", lat: 1.3644, lng: 103.9915 },
  { code: "HND", name: "Tokyo Haneda", city: "Tokyo", country: "Japan", lat: 35.5494, lng: 139.7798 },
  { code: "NRT", name: "Tokyo Narita", city: "Tokyo", country: "Japan", lat: 35.772, lng: 140.3929 },
  { code: "HKG", name: "Hong Kong Intl", city: "Hong Kong", country: "Hong Kong", lat: 22.308, lng: 113.9185 },
  { code: "BKK", name: "Bangkok Suvarnabhumi", city: "Bangkok", country: "Thailand", lat: 13.69, lng: 100.7501 },
  { code: "SYD", name: "Sydney Kingsford Smith", city: "Sydney", country: "Australia", lat: -33.9399, lng: 151.1753 },
  { code: "MEL", name: "Melbourne Tullamarine", city: "Melbourne", country: "Australia", lat: -37.669, lng: 144.841 },
  { code: "CPT", name: "Cape Town Intl", city: "Cape Town", country: "South Africa", lat: -33.9715, lng: 18.6021 },
  { code: "MEX", name: "Mexico City Intl", city: "Mexico City", country: "Mexico", lat: 19.4361, lng: -99.0719 },
  { code: "GRU", name: "São Paulo Guarulhos", city: "São Paulo", country: "Brazil", lat: -23.4356, lng: -46.4731 },
];

export function findAirport(code: string): Place | undefined {
  return AIRPORTS.find((a) => a.code === code.toUpperCase());
}

export function searchAirports(q: string, limit = 8): Place[] {
  const s = q.trim().toLowerCase();
  if (!s) return [];
  return AIRPORTS.filter(
    (a) =>
      a.code.toLowerCase().startsWith(s) ||
      a.city.toLowerCase().includes(s) ||
      a.name.toLowerCase().includes(s) ||
      (a.country ?? "").toLowerCase().includes(s),
  ).slice(0, limit);
}

export function placeLabel(p: Place) {
  return `${p.name} (${p.code})`;
}
