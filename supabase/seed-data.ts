export type SeedItem = {
  kind: 'flight' | 'lodging' | 'activity' | 'food';
  title: string;
  scheduled_date?: string;
  start_time?: string;
  end_time?: string;
  sort_order: number;
  address?: string;
  lat?: number;
  lng?: number;
  details: Record<string, unknown>;
};

export const SEED_ITEMS: SeedItem[] = [
  // International flights
  {
    kind: 'flight',
    title: 'BA 243 — London to Mexico City',
    scheduled_date: '2026-05-01',
    start_time: '15:10',
    end_time: '19:45',
    sort_order: 0,
    details: { airline: 'British Airways', number: 'BA 243', from_airport: 'LHR', to_airport: 'MEX', departure_dt: '2026-05-01T15:10:00+01:00', arrival_dt: '2026-05-01T19:45:00-06:00', confirmation: '' },
  },
  {
    kind: 'flight',
    title: 'BA 242 — Mexico City to London',
    scheduled_date: '2026-05-10',
    start_time: '22:00',
    sort_order: 99,
    details: { airline: 'British Airways', number: 'BA 242', from_airport: 'MEX', to_airport: 'LHR', departure_dt: '2026-05-10T22:00:00-06:00', arrival_dt: '2026-05-11T15:30:00+01:00', confirmation: '' },
  },
  // Domestic flights
  {
    kind: 'flight',
    title: 'AM 592 — Mexico City to Tulum',
    scheduled_date: '2026-05-04',
    start_time: '08:40',
    end_time: '11:40',
    sort_order: 0,
    details: { airline: 'Aeroméxico', number: 'AM 592', from_airport: 'MEX', to_airport: 'TQO', departure_dt: '2026-05-04T08:40:00-06:00', arrival_dt: '2026-05-04T11:40:00-05:00', confirmation: 'WVPGOR', price: 225.80 },
  },
  {
    kind: 'flight',
    title: 'VB 7447 — Tulum to Mexico City',
    scheduled_date: '2026-05-06',
    start_time: '16:30',
    end_time: '17:45',
    sort_order: 0,
    details: { airline: 'Vivaaerobus', number: 'VB 7447', from_airport: 'TQO', to_airport: 'MEX', departure_dt: '2026-05-06T16:30:00-05:00', arrival_dt: '2026-05-06T17:45:00-06:00', confirmation: 'SCH4TP' },
  },
  // Lodging
  {
    kind: 'lodging',
    title: 'Tonalá 127 (Mexico City, leg 1)',
    scheduled_date: '2026-05-01',
    sort_order: 50,
    address: 'Tonalá 127, Roma Nte., Cuauhtémoc, 06700 Ciudad de México',
    lat: 19.4178,
    lng: -99.1635,
    details: { check_in_date: '2026-05-01', check_out_date: '2026-05-04', confirmation: '5264985189', price: 529.59, room_name: 'TONALÁ By Mr W' },
  },
  {
    kind: 'lodging',
    title: 'Tago Tulum by G Hotels',
    scheduled_date: '2026-05-04',
    sort_order: 50,
    address: 'Carr. Tulum-Boca Paila km 6.5, Tulum Beach',
    lat: 20.1668,
    lng: -87.4423,
    details: { check_in_date: '2026-05-04', check_out_date: '2026-05-06', confirmation: '5502450241', price: 476.96 },
  },
  {
    kind: 'lodging',
    title: 'Tonalá 127 (Mexico City, leg 2)',
    scheduled_date: '2026-05-06',
    sort_order: 50,
    address: 'Tonalá 127, Roma Nte., Cuauhtémoc, 06700 Ciudad de México',
    lat: 19.4178,
    lng: -99.1635,
    details: { check_in_date: '2026-05-06', check_out_date: '2026-05-09', confirmation: '6053617120' },
  },
  // Activities (wishlist)
  {
    kind: 'activity',
    title: 'Frida Kahlo Museum',
    sort_order: 0,
    address: 'Londres 247, Coyoacán, 04100 CDMX',
    lat: 19.3551,
    lng: -99.1622,
    details: { category: 'Museum', booked: false },
  },
  {
    kind: 'activity',
    title: 'Soho House Mexico City',
    sort_order: 0,
    address: 'Calle Manuel Cervantes 5, Roma Nte., 06700 CDMX',
    lat: 19.4188,
    lng: -99.1620,
    details: { category: 'Social club', booked: false },
  },
  {
    kind: 'activity',
    title: 'Grutas Tolantongo',
    sort_order: 0,
    address: 'Cardonal, Hidalgo',
    lat: 20.6447,
    lng: -98.9963,
    details: { category: 'Outdoor', booked: false },
  },
  // Food (wishlist)
  {
    kind: 'food',
    title: 'Salón Palomilla',
    sort_order: 0,
    address: 'Roma Norte, CDMX',
    lat: 19.4180,
    lng: -99.1610,
    details: { meal_type: 'drinks', cuisine: 'Cocktail bar' },
  },
  {
    kind: 'food',
    title: 'Panadería Rosetta',
    sort_order: 0,
    address: 'Colima 179, Roma Nte., CDMX',
    lat: 19.4196,
    lng: -99.1626,
    details: { meal_type: 'breakfast', cuisine: 'Bakery' },
  },
];

export const TRIP_META = {
  name: 'Mexico May 2026',
  start_date: '2026-05-01',
  end_date: '2026-05-10',
  home_timezone: 'Europe/London',
  destinations: [
    { name: 'Mexico City', tz: 'America/Mexico_City', start_date: '2026-05-01', end_date: '2026-05-04' },
    { name: 'Tulum', tz: 'America/Cancun', start_date: '2026-05-04', end_date: '2026-05-06' },
    { name: 'Mexico City', tz: 'America/Mexico_City', start_date: '2026-05-06', end_date: '2026-05-10' },
  ],
};
