import type { City, Country } from '../types'
import landmarksById from '../data/landmarks.json'

const LANDMARKS = landmarksById as Record<string, string[]>
/** True for the ~150 major cities with hand-picked real landmark names. */
export function hasCuratedLandmarks(cityId: string): boolean {
  return cityId in LANDMARKS
}

/** Deterministic string hash → seeded RNG, so each city always gets the same packages. */
function seedFrom(str: string): number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}
function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
function pick<T>(rng: () => number, arr: readonly T[]): T { return arr[Math.floor(rng() * arr.length)] }
function range(rng: () => number, min: number, max: number) { return Math.round(min + rng() * (max - min)) }

export interface HotelPackage {
  id: string; name: string; stars: number; nights: number
  pricePerNightUsd: number; totalUsd: number; perks: string[]
}
export interface TourPackage {
  id: string; name: string; days: number; priceUsd: number
  highlights: string[]; groupSize: string
}

const HOTEL_TIERS = [
  { stars: 3, band: [45, 90], tag: 'Budget' },
  { stars: 4, band: [90, 180], tag: 'Comfort' },
  { stars: 5, band: [180, 420], tag: 'Luxury' },
] as const
const HOTEL_NAME_A = ['Grand', 'Royal', 'Central', 'Plaza', 'Garden', 'Harbor', 'Skyline', 'Heritage', 'Palm', 'Azure']
const HOTEL_NAME_B = ['Hotel', 'Suites', 'Resort', 'Inn', 'Residence', 'Palace']
/** Real international chains, roughly grouped by the tier they usually operate at. */
const CHAINS_BY_TIER = [
  ['Ibis', 'Holiday Inn Express', 'Campanile'],
  ['Novotel', 'Hilton Garden Inn', 'Courtyard by Marriott', 'Radisson'],
  ['Hilton', 'Marriott', 'Sheraton', 'InterContinental', 'Four Seasons', 'Ritz-Carlton'],
] as const
const PERKS = ['Free breakfast', 'Airport pickup', 'Pool access', 'Free WiFi', 'City-view room', 'Spa credit', 'Late checkout', 'Welcome drink']

const TOUR_THEMES = [
  { name: 'Highlights City Tour', days: 1, base: 35 },
  { name: 'Old Town Walking Tour', days: 1, base: 25 },
  { name: 'Food & Markets Experience', days: 1, base: 45 },
  { name: 'Weekend Explorer Package', days: 3, base: 220 },
  { name: 'Complete City & Culture Tour', days: 5, base: 480 },
  { name: 'Day Trip: Nearby Landmarks', days: 1, base: 60 },
]
const HIGHLIGHT_POOL = [
  'Guided visit to the top landmark', 'Local guide included', 'Museum entry included',
  'Traditional lunch included', 'Photo stops at scenic viewpoints', 'Small-group experience',
  'Historic old quarter walk', 'Sunset viewpoint stop', 'Local market visit', 'Hotel pickup included',
]

export function hotelPackagesFor(city: City): HotelPackage[] {
  const rng = mulberry32(seedFrom('hotel:' + city.id))
  const curated = hasCuratedLandmarks(city.id)
  return HOTEL_TIERS.map((tier, i) => {
    const nights = pick(rng, [2, 3, 4, 5])
    const pricePerNight = range(rng, tier.band[0], tier.band[1])
    const perks = [...PERKS].sort(() => rng() - 0.5).slice(0, 3)
    const name = curated
      ? `${pick(rng, CHAINS_BY_TIER[i])} ${city.name}`
      : `${pick(rng, HOTEL_NAME_A)} ${city.name} ${pick(rng, HOTEL_NAME_B)}`
    return {
      id: `${city.id}-hotel-${i}`,
      name,
      stars: tier.stars,
      nights,
      pricePerNightUsd: pricePerNight,
      totalUsd: pricePerNight * nights,
      perks,
    }
  })
}

export function tourPackagesFor(city: City, country: Country): TourPackage[] {
  const rng = mulberry32(seedFrom('tour:' + city.id))
  const themes = [...TOUR_THEMES].sort(() => rng() - 0.5).slice(0, 3)
  const real = LANDMARKS[city.id]
  return themes.map((theme, i) => {
    const priceUsd = Math.round(theme.base * (0.85 + rng() * 0.4))
    let highlights: string[]
    if (real && real.length) {
      // Rotate through the real landmark list so each of the 3 packages leads with a different one.
      const ordered = [...real.slice(i % real.length), ...real.slice(0, i % real.length)]
      highlights = ordered.slice(0, Math.min(3, ordered.length)).map((l) => `Visit ${l}`)
    } else {
      highlights = [...HIGHLIGHT_POOL].sort(() => rng() - 0.5).slice(0, 3)
    }
    return {
      id: `${city.id}-tour-${i}`,
      name: `${city.name} — ${theme.name}`,
      days: theme.days,
      priceUsd,
      highlights: [...highlights, `Explore ${city.name}, ${country.name}`],
      groupSize: pick(rng, ['Small group (max 8)', 'Private tour', 'Small group (max 12)']),
    }
  })
}
