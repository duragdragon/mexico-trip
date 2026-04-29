export type ItemKind = 'flight' | 'lodging' | 'activity' | 'food';

export type FlightDetails = {
  airline?: string;
  number?: string;
  from_airport?: string;
  to_airport?: string;
  departure_dt?: string;
  arrival_dt?: string;
  confirmation?: string;
  price?: number;
};

export type LodgingDetails = {
  check_in_date?: string;
  check_out_date?: string;
  confirmation?: string;
  price?: number;
  room_name?: string;
};

export type ActivityDetails = {
  category?: string;
  booked?: boolean;
  price?: number;
  link?: string;
};

export type FoodDetails = {
  meal_type?: 'breakfast' | 'lunch' | 'dinner' | 'drinks' | string;
  reservation_at?: string;
  link?: string;
  cuisine?: string;
};

export type Item = {
  id: string;
  trip_id: string;
  kind: ItemKind;
  title: string;
  scheduled_date: string | null;
  start_time: string | null;
  end_time: string | null;
  sort_order: number;
  address: string | null;
  lat: number | null;
  lng: number | null;
  mapbox_place_id: string | null;
  photo_url: string | null;
  opening_hours: OpeningHours | null;
  details: FlightDetails | LodgingDetails | ActivityDetails | FoodDetails;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
};

export type OpeningHours = {
  // OSM-style: array of 7 day specs (0 = Mon)
  weekly: Array<null | { open: string; close: string }>;
  exceptions?: Record<string, null | { open: string; close: string }>;
};
