export type Cabin = "economy" | "premium_economy" | "business" | "first";

export interface Place {
  code: string; // IATA
  name: string; // "London Heathrow"
  city: string; // "London"
  country?: string;
  lat: number;
  lng: number;
  /** Set on "All airports" city entries: the airports searched together. */
  airports?: string[];
}

/** One actual flight within a leg (a leg with a stopover has two or more). */
export interface FlightSegment {
  from: Place;
  to: Place;
  depart: string; // local time at `from`
  arrive: string; // local time at `to`
  carrier: string;
  carrierCode?: string;
  flightNumber: string;
  durationMins: number;
}

export interface FlightLeg {
  from: Place;
  to: Place;
  carrier: string; // "Air Canada"
  carrierCode?: string; // IATA airline code, "AC"
  carrierLogo?: string; // logo URL from the provider, when it gives one
  flightNumber: string; // "AC 855"
  depart: string; // ISO local datetime "2026-12-23T07:30"
  arrive: string;
  stops: number;
  durationMins: number;
  /** The individual flights making up this leg, when the provider supplies them. */
  segments?: FlightSegment[];
}

/** One place the flight can be bought (airline or travel agent) with its own price and link. */
export interface BookingOption {
  name: string;
  price: number | null;
  url: string;
  /** Seller rating out of 5 and number of reviews, when the provider gives them. */
  rating?: number;
  reviews?: number;
  /** Whole-stay price for hotel offers (`price` is per night). */
  total?: number | null;
  /** Room description for hotel offers ("Double room"). */
  room?: string;
  /** Short terms for hotel offers, e.g. "Room only · Pay now". */
  terms?: string;
  logo?: string;
}

/** A flight option returned by search (one-way or return). */
export interface FlightOffer {
  id: string;
  legs: FlightLeg[];
  price: number;
  currency: string;
  cabin: Cabin;
  passengers: number;
  bookingUrl: string;
  /** Direct booking links per seller, cheapest first (when the provider supplies them). */
  bookingOptions?: BookingOption[];
  provider: string;
  /** Round trip still waiting for a return flight to be chosen (Google Flights two-step search). */
  departureToken?: string;
  returnDate?: string;
}

export interface Trip {
  id: string;
  name: string;
  destination: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;
  travellers: number;
  createdAt: string;
}

export interface SavedFlight {
  id: string;
  tripId: string;
  legs: FlightLeg[];
  cabin: Cabin;
  passengers: number;
  currency: string;
  priceSaved: number;
  priceCurrent: number;
  priceCheckedAt: string | null;
  bookingUrl: string;
  bookingOptions?: BookingOption[];
  savedAt: string;
}

export interface Hotel {
  id: string;
  name: string;
  stars: number;
  area: string;
  city: string;
  lat: number;
  lng: number;
  rating: number;
  reviews: number;
  tags: string[];
  amenities: string[];
  pricePerNight: number;
  currency: string;
  provider: string;
  roomType: string;
  bookingUrl: string;
  imageColor: string;
  /** Photos (first is the card image), when the provider supplies them. */
  images?: string[];
  /** Stay total for the searched dates, when the provider gives it (else nightly × nights). */
  totalPrice?: number;
  /** Every partner's offer (price per night), cheapest first. */
  bookingOptions?: BookingOption[];
  /** Pre-discount nightly price, when the provider shows a deal. */
  originalPricePerNight?: number;
  /** Rating label, e.g. "Very Good". */
  ratingWord?: string;
}

export interface SavedStay {
  id: string;
  tripId: string;
  hotelId: string;
  name: string;
  area: string;
  city: string;
  lat: number;
  lng: number;
  checkIn: string; // YYYY-MM-DD
  checkOut: string;
  currency: string;
  priceSaved: number; // total
  priceCurrent: number;
  bookingUrl: string;
  bookingOptions?: BookingOption[];
  imageUrl?: string;
  guests?: number;
  priceCheckedAt?: string | null;
  savedAt: string;
}

export type ActivityCategory = "sight" | "food" | "show" | "outdoors" | "shopping" | "travel" | "other";

export interface SavedActivity {
  id: string;
  tripId: string;
  name: string;
  category: ActivityCategory;
  lat: number | null;
  lng: number | null;
  /** Name/address of the location picked for this event, when it has one. */
  place?: string | null;
  notes: string;
  savedAt: string;
}

export type ItemKind = "flight" | "stay" | "activity";

export interface ItineraryItem {
  id: string;
  tripId: string;
  day: string; // YYYY-MM-DD
  position: number;
  time: string | null; // HH:mm
  kind: ItemKind;
  refId: string;
}

export interface TripData {
  trips: Trip[];
  flights: SavedFlight[];
  stays: SavedStay[];
  activities: SavedActivity[];
  itinerary: ItineraryItem[];
}
