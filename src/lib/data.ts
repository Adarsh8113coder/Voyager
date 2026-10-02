import type { City, CityRow, Country } from '../types'
import { apiGet, apiPost, isApiReady } from './api'
import worldData from '../data/world-data.json'
import landmarksById from '../data/landmarks.json'
import { hotelPackagesFor as generateHotels, tourPackagesFor as generateTours } from '../utils/packages'
import type { HotelPackage, TourPackage } from '../utils/packages'

const LANDMARKS = landmarksById as Record<string, string[]>

function bundledCities(): City[] {
  return (worldData.cities as CityRow[]).map((r) => ({
    id: r[0], name: r[1], countryCode: r[2], lat: r[3], lng: r[4],
    population: r[5], isCapital: r[6] === 1, iata: r[7] || null,
  }))
}
function bundledCountries(): Country[] {
  return worldData.countries as Country[]
}

/** Loads countries + cities: from the MongoDB API once configured & seeded, else the bundled dataset. */
export async function loadWorld(): Promise<{ countries: Country[]; cities: City[] }> {
  const ready = await isApiReady()
  if (!ready) return { countries: bundledCountries(), cities: bundledCities() }
  const { data } = await apiGet<{ countries: Country[]; cities: City[] }>('world')
  if (!data || !data.cities?.length) return { countries: bundledCountries(), cities: bundledCities() }
  return data
}

/** Real landmarks for a city, if any exist in the database or the curated bundled list. */
export function landmarksFor(city: City): string[] {
  return LANDMARKS[city.id] || []
}

/** Hotel packages: your custom entries from the API (if any) first, generated ones fill the rest. */
export async function hotelPackagesForCity(city: City): Promise<HotelPackage[]> {
  const generated = generateHotels(city)
  const ready = await isApiReady()
  if (!ready) return generated
  const { data } = await apiGet<any[]>(`hotel-packages?cityId=${encodeURIComponent(city.id)}`)
  const custom: HotelPackage[] = (data || []).map((r) => ({
    id: r.id, name: r.name, stars: r.stars, nights: r.nights,
    pricePerNightUsd: Number(r.pricePerNight), totalUsd: Number(r.pricePerNight) * r.nights,
    perks: r.perks || [],
  }))
  return [...custom, ...generated]
}

/** Tour packages: your custom entries from the API (if any) first, generated ones fill the rest. */
export async function tourPackagesForCity(city: City, country: Country): Promise<TourPackage[]> {
  const generated = generateTours(city, country)
  const ready = await isApiReady()
  if (!ready) return generated
  const { data } = await apiGet<any[]>(`tour-packages?cityId=${encodeURIComponent(city.id)}`)
  const custom: TourPackage[] = (data || []).map((r) => ({
    id: r.id, name: r.name, days: r.days, priceUsd: Number(r.priceUsd),
    highlights: r.highlights || [], groupSize: r.groupSize,
  }))
  return [...custom, ...generated]
}

export interface Booking {
  id: string; type: 'flight' | 'hotel' | 'tour'; title: string; priceUsd: number
  cityId: string | null; details: Record<string, unknown>; createdAt: string
}

/** Saves a booking for the signed-in user (token sent automatically). Returns an error message, or null on success. */
export async function createBooking(
  _userId: string,
  booking: { type: Booking['type']; title: string; priceUsd: number; cityId?: string; details?: Record<string, unknown> }
): Promise<string | null> {
  const { error } = await apiPost('bookings', {
    type: booking.type, title: booking.title, priceUsd: booking.priceUsd,
    cityId: booking.cityId ?? null, details: booking.details ?? {},
  })
  return error
}

/** This user's own bookings (or all, if admin), most recent first. */
export async function myBookings(): Promise<Booking[]> {
  const { data } = await apiGet<any[]>('bookings')
  return (data || []).map((r) => ({
    id: r.id, type: r.type, title: r.title, priceUsd: Number(r.priceUsd),
    cityId: r.cityId, details: r.details || {}, createdAt: r.createdAt,
  }))
}
