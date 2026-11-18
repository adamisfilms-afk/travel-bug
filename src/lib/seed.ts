import { findAirport } from "./airports";
import type { FlightLeg, TripData } from "./types";

const LHR = findAirport("LHR")!;
const JFK = findAirport("JFK")!;

function leg(from: typeof LHR, to: typeof LHR, carrier: string, flightNumber: string, depart: string, arrive: string, durationMins: number): FlightLeg {
  return { from, to, carrier, carrierCode: flightNumber.split(" ")[0], flightNumber, depart, arrive, stops: 0, durationMins };
}

const now = "2026-11-01T10:00:00.000Z";
const nyc = "seed-trip-nyc";
const bud = "seed-trip-budapest";

/** Demo data shown on first launch in local mode. IDs prefixed "seed-" keep their demo prices. */
export const SEED: TripData = {
  trips: [
    { id: nyc, name: "New York City", destination: "New York City", startDate: "2026-12-23", endDate: "2027-01-01", travellers: 5, createdAt: now },
    { id: bud, name: "Budapest", destination: "Budapest", startDate: "2027-02-12", endDate: "2027-02-16", travellers: 2, createdAt: now },
  ],
  flights: [
    {
      id: "seed-flight-1", tripId: nyc, cabin: "economy", passengers: 5, currency: "USD",
      legs: [leg(LHR, JFK, "Air Canada", "AC 855", "2026-12-23T07:30", "2026-12-23T13:35", 485)],
      priceSaved: 645, priceCurrent: 645, priceCheckedAt: now, bookingUrl: "https://www.skyscanner.net/transport/flights/lhr/jfk/261223/", savedAt: now,
    },
    {
      id: "seed-flight-2", tripId: nyc, cabin: "economy", passengers: 5, currency: "USD",
      legs: [leg(LHR, JFK, "British Airways", "BA 117", "2026-12-23T08:20", "2026-12-23T11:25", 485)],
      priceSaved: 690, priceCurrent: 725, priceCheckedAt: now, bookingUrl: "https://www.skyscanner.net/transport/flights/lhr/jfk/261223/", savedAt: now,
    },
    {
      id: "seed-flight-3", tripId: nyc, cabin: "economy", passengers: 5, currency: "USD",
      legs: [
        leg(LHR, JFK, "Air Canada", "AC 855", "2026-12-23T07:30", "2026-12-23T13:35", 485),
        leg(JFK, LHR, "American Airlines", "AA 22", "2027-01-01T19:15", "2027-01-02T05:50", 395),
      ],
      priceSaved: 1260, priceCurrent: 1211, priceCheckedAt: now, bookingUrl: "https://www.skyscanner.net/transport/flights/lhr/jfk/261223/270101/", savedAt: now,
    },
    {
      id: "seed-flight-4", tripId: nyc, cabin: "economy", passengers: 5, currency: "USD",
      legs: [leg(LHR, JFK, "American Airlines", "AA 12", "2026-12-31T07:30", "2026-12-31T13:35", 485)],
      priceSaved: 450, priceCurrent: 476, priceCheckedAt: now, bookingUrl: "https://www.skyscanner.net/transport/flights/lhr/jfk/261231/", savedAt: now,
    },
  ],
  stays: [
    {
      id: "seed-stay-1", tripId: nyc, hotelId: "new-york-city-park-hyatt-chelsea", name: "Park Hyatt Chelsea",
      area: "Chelsea, New York", city: "New York City", lat: 40.7465, lng: -73.9967,
      checkIn: "2026-12-23", checkOut: "2026-12-25", currency: "USD", priceSaved: 645, priceCurrent: 645,
      bookingUrl: "https://www.skyscanner.net/hotels/search?q=Park%20Hyatt%20Chelsea", savedAt: now,
    },
  ],
  activities: [
    { id: "seed-act-moma", tripId: nyc, name: "Museum of Modern Art", category: "sight", lat: 40.7614, lng: -73.9776, notes: "", savedAt: now },
    { id: "seed-act-zabars", tripId: nyc, name: "Zabars", category: "food", lat: 40.7849, lng: -73.9796, notes: "", savedAt: now },
    { id: "seed-act-hamilton", tripId: nyc, name: "Hamilton Musical", category: "show", lat: 40.759, lng: -73.9866, notes: "", savedAt: now },
    { id: "seed-act-highline", tripId: nyc, name: "The High Line", category: "outdoors", lat: 40.748, lng: -74.0048, notes: "", savedAt: now },
    { id: "seed-act-bath", tripId: bud, name: "Széchenyi Thermal Bath", category: "outdoors", lat: 47.5186, lng: 19.0819, notes: "", savedAt: now },
  ],
  itinerary: [
    { id: "seed-it-1", tripId: nyc, day: "2026-12-23", position: 0, time: "07:30", kind: "flight", refId: "seed-flight-1" },
    { id: "seed-it-2", tripId: nyc, day: "2026-12-23", position: 1, time: "15:00", kind: "stay", refId: "seed-stay-1" },
    { id: "seed-it-3", tripId: nyc, day: "2026-12-24", position: 0, time: "10:00", kind: "activity", refId: "seed-act-moma" },
    { id: "seed-it-4", tripId: nyc, day: "2026-12-24", position: 1, time: null, kind: "activity", refId: "seed-act-zabars" },
    { id: "seed-it-5", tripId: nyc, day: "2026-12-24", position: 2, time: "19:00", kind: "activity", refId: "seed-act-hamilton" },
  ],
};
