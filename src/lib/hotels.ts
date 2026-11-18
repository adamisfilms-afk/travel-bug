import type { Hotel } from "./types";

const COLORS = ["#C9B8A4", "#B9C4CC", "#C7CBB5", "#D3C2B0", "#B7C7BD", "#CDBFCB"];

type Seed = Omit<Hotel, "id" | "currency" | "provider" | "bookingUrl" | "imageColor" | "city">;

const CITY_HOTELS: Record<string, Seed[]> = {
  "New York City": [
    { name: "Park Hyatt Chelsea", stars: 5, area: "Chelsea, New York", lat: 40.7465, lng: -73.9967, rating: 4.7, reviews: 2311, tags: ["Near landmarks", "Local dining", "Quiet neighbourhood"], amenities: ["Wi-Fi", "Gym", "Spa", "Restaurant"], pricePerNight: 322, roomType: "King room" },
    { name: "The Bowery Hotel", stars: 4, area: "East Village, New York", lat: 40.7259, lng: -73.9915, rating: 4.6, reviews: 1890, tags: ["Local dining", "Nightlife", "Good transport links"], amenities: ["Wi-Fi", "Restaurant", "Bar"], pricePerNight: 289, roomType: "Double room" },
    { name: "Arlo Midtown", stars: 4, area: "Midtown, New York", lat: 40.7553, lng: -73.9935, rating: 4.4, reviews: 5012, tags: ["Good transport links", "Near landmarks", "Rooftop bar"], amenities: ["Wi-Fi", "Gym", "Bar"], pricePerNight: 214, roomType: "Queen room" },
    { name: "The Hoxton Williamsburg", stars: 4, area: "Williamsburg, Brooklyn", lat: 40.7219, lng: -73.9573, rating: 4.5, reviews: 2470, tags: ["Local dining", "Waterfront property", "Shopping hotspot"], amenities: ["Wi-Fi", "Restaurant", "Pet friendly"], pricePerNight: 248, roomType: "Roomy room" },
    { name: "Pod Times Square", stars: 3, area: "Hell's Kitchen, New York", lat: 40.7597, lng: -73.9937, rating: 4.1, reviews: 8120, tags: ["Good transport links", "Near city centre"], amenities: ["Wi-Fi", "Bar"], pricePerNight: 139, roomType: "Pod queen" },
    { name: "The Plaza", stars: 5, area: "Central Park South, New York", lat: 40.7646, lng: -73.9743, rating: 4.7, reviews: 3998, tags: ["Near landmarks", "Park views", "Luxury"], amenities: ["Wi-Fi", "Spa", "Gym", "Restaurant", "Bar"], pricePerNight: 845, roomType: "Deluxe king" },
  ],
  Budapest: [
    { name: "Bohem Art Hotel", stars: 4, area: "Belváros, Budapest", lat: 47.4913, lng: 19.0565, rating: 4.6, reviews: 1004, tags: ["Near city centre", "Near landmarks", "Good transport links", "Local dining"], amenities: ["Wi-Fi", "Breakfast", "Bar"], pricePerNight: 57, roomType: "Double room" },
    { name: "Benczur Hotel", stars: 3, area: "Terézváros, Budapest", lat: 47.5072, lng: 19.0748, rating: 4.2, reviews: 3801, tags: ["Good transport links", "Near landmarks", "Quiet neighbourhood"], amenities: ["Wi-Fi", "Breakfast", "Parking"], pricePerNight: 39, roomType: "Twin room" },
    { name: "Carlton Hotel Buda Castle", stars: 4, area: "District I, Budapest", lat: 47.5004, lng: 19.0385, rating: 4.5, reviews: 884, tags: ["Near landmarks", "Waterfront property", "Local dining"], amenities: ["Wi-Fi", "Breakfast", "Parking"], pricePerNight: 60, roomType: "Double room" },
    { name: "Aria Hotel Budapest", stars: 5, area: "Lipótváros, Budapest", lat: 47.5005, lng: 19.0521, rating: 4.9, reviews: 2650, tags: ["Near landmarks", "Rooftop bar", "Luxury"], amenities: ["Wi-Fi", "Spa", "Gym", "Bar", "Pool"], pricePerNight: 310, roomType: "Deluxe king" },
    { name: "Hotel Moments", stars: 4, area: "Terézváros, Budapest", lat: 47.5023, lng: 19.0604, rating: 4.7, reviews: 1980, tags: ["Shopping hotspot", "Local dining", "Near city centre"], amenities: ["Wi-Fi", "Gym", "Breakfast"], pricePerNight: 118, roomType: "Superior double" },
  ],
  London: [
    { name: "The Hoxton Holborn", stars: 4, area: "Holborn, London", lat: 51.5177, lng: -0.1203, rating: 4.5, reviews: 4520, tags: ["Good transport links", "Local dining"], amenities: ["Wi-Fi", "Restaurant", "Bar"], pricePerNight: 199, roomType: "Cosy room" },
    { name: "Ham Yard Hotel", stars: 5, area: "Soho, London", lat: 51.5113, lng: -0.1352, rating: 4.8, reviews: 1870, tags: ["Nightlife", "Near landmarks", "Rooftop bar"], amenities: ["Wi-Fi", "Gym", "Bar", "Restaurant"], pricePerNight: 520, roomType: "Superior queen" },
    { name: "citizenM Tower of London", stars: 4, area: "Tower Hill, London", lat: 51.5103, lng: -0.0775, rating: 4.5, reviews: 6310, tags: ["Near landmarks", "Waterfront property"], amenities: ["Wi-Fi", "Bar", "Gym"], pricePerNight: 165, roomType: "King room" },
  ],
  Paris: [
    { name: "Hôtel Henriette", stars: 3, area: "13th arr., Paris", lat: 48.8358, lng: 2.3487, rating: 4.4, reviews: 980, tags: ["Quiet neighbourhood", "Local dining"], amenities: ["Wi-Fi", "Breakfast"], pricePerNight: 145, roomType: "Double room" },
    { name: "Le Pavillon de la Reine", stars: 5, area: "Le Marais, Paris", lat: 48.8559, lng: 2.3655, rating: 4.8, reviews: 1220, tags: ["Near landmarks", "Shopping hotspot"], amenities: ["Wi-Fi", "Spa", "Bar"], pricePerNight: 480, roomType: "Superior room" },
    { name: "Hôtel des Grands Boulevards", stars: 4, area: "2nd arr., Paris", lat: 48.8706, lng: 2.3459, rating: 4.6, reviews: 1415, tags: ["Nightlife", "Local dining", "Near city centre"], amenities: ["Wi-Fi", "Restaurant", "Bar"], pricePerNight: 260, roomType: "Classic double" },
  ],
};

export const HOTEL_CITIES = Object.keys(CITY_HOTELS);

function slug(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function allHotels(): Hotel[] {
  return Object.entries(CITY_HOTELS).flatMap(([city, hotels]) =>
    hotels.map((h, i) => ({
      ...h,
      id: slug(`${city}-${h.name}`),
      city,
      currency: "USD",
      provider: i % 3 === 2 ? "Agoda" : "Booking.com",
      bookingUrl: `https://www.skyscanner.net/hotels/search?q=${encodeURIComponent(`${h.name} ${city}`)}`,
      imageColor: COLORS[i % COLORS.length],
    })),
  );
}

export function searchHotels(q: string): Hotel[] {
  const s = q.trim().toLowerCase();
  const hotels = allHotels();
  if (!s) return hotels;
  return hotels.filter(
    (h) =>
      h.city.toLowerCase().includes(s) ||
      h.name.toLowerCase().includes(s) ||
      h.area.toLowerCase().includes(s) ||
      (s.includes("new york") && h.city === "New York City") ||
      (s === "nyc" && h.city === "New York City"),
  );
}

export function findHotel(id: string) {
  return allHotels().find((h) => h.id === id);
}
