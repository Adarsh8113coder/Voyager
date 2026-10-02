export interface Country { code: string; name: string; continent: string; capital: string }
export interface City {
  id: string; name: string; countryCode: string
  lat: number; lng: number; population: number; isCapital: boolean; iata: string | null
}
/** Compact row format used in world-data.json: [id, name, countryCode, lat, lng, population, isCapital(0|1), iata] */
export type CityRow = [string, string, string, number, number, number, number, string]
