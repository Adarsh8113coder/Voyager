# Voyager

An interactive 3D globe (React + TypeScript + React Three Fiber) that shows the cities
you've visited, lets you pick an origin and destination, and shows estimated flight
info between them, with a curved animated flight route on the globe.

## Quick start

```bash
npm install
npm run dev
```

Then open the URL Vite prints (usually `http://localhost:5173`).

To type-check / build for production:

```bash
npm run build
npm run preview
```

## What's real vs. sample data

- **Geography** (countries, cities, coordinates, capitals, IATA airport codes) is a
  curated static dataset in `src/data/`, bundled with the app — no external
  geocoding calls at runtime.
- **Flight info** (duration, price, airline, schedule) is **not** pulled from a real
  airline API by default. `src/services/flightService.ts` generates a deterministic
  distance-based estimate and labels every result `source: 'estimated'` or
  `'demo'`. The UI always shows a "Sample / estimated data" / "Demo flight data"
  badge for this. **No fabricated data is ever presented as live.**
- **Currency conversion** uses a small static FX table (also clearly not "live").

## Connecting a real flight API

1. Copy `.env.example` to `.env` and fill in your provider's key/base URL:
   ```
   VITE_FLIGHT_API_KEY=your-key-here
   VITE_FLIGHT_API_BASE_URL=https://api.your-flight-provider.com
   ```
   Never commit `.env` or put a key directly in source — it's already gitignored.
2. Implement the two stub functions at the bottom of `src/services/flightService.ts`:
   - `fetchLiveFlightInfo` — single route lookup, used by the flight info card.
   - `fetchLiveFlightResults` — multi-result search, used by the trip planner.
   They already have a working `fetch(...)` skeleton pointed at your base URL; map
   your provider's response shape onto `FlightInfo` / `FlightResult` from
   `src/types/flight.ts`.
3. That's it — once both env vars are set, `isLiveApiConnected` flips to `true` and
   every consumer of the service (flight card, trip planner) automatically switches
   from estimated/demo data to your live API, including the "Live data" badge.

The same pattern applies if you want to swap in a real geocoding/city dataset or a
live FX-rate API — the `services/` and `data/` folders are the only places that
need to change; the UI just consumes typed data.

## Project structure

```
src/
  components/
    Globe/
      TravelGlobe.tsx    Canvas, camera, orchestrates markers + route
      Earth.tsx           Sphere + grid + atmosphere glow
      CityMarker.tsx       Single city marker (visited/origin/destination/default)
      FlightRoute.tsx      Curved arc + animated aircraft dot
    Search/
      LocationSearch.tsx  Reusable searchable city/country selector
    Flight/
      FlightCard.tsx       Route flight-info summary card
      FlightSearch.tsx     Trip planner form + results list
    Travel/
      TravelHistory.tsx    Add/remove visited cities, grouped by country
      TravelStats.tsx       Stats dashboard
    Country/
      CountryPanel.tsx     Country detail panel on marker click
  services/
    flightService.ts      Flight data abstraction (estimate now, real API later)
    locationService.ts    Distance math + geography lookups
    statsService.ts        Derives travel stats from visited history
  data/
    countries.ts / cities.ts   Curated geography dataset
    visitedSeed.ts               Demo initial travel history
  hooks/
    useTravelHistory.ts    In-memory visited-cities state (add/remove)
  types/
    travel.ts / flight.ts  Shared TypeScript types
  utils/
    geo.ts                  lat/lng ↔ 3D vector + great-circle arc math
  App.tsx                  Layout, state wiring, panel/tab UI
```

## Features implemented

- Drag to rotate, scroll/pinch to zoom the globe (OrbitControls)
- Click a city marker or search to focus the globe and open its country panel
- Visited cities render differently (glowing cyan) from unvisited ones
- Origin/destination pickers with a searchable dropdown
- Animated curved flight route + moving aircraft dot between origin and destination
- Flight info card: duration, distance, stops, estimated price, currency selector,
  clearly labeled as sample/estimated data
- Trip planner with date/passengers/cabin and a demo results list
- Travel history: add/remove visited cities, grouped by country
- Travel stats: countries/cities/continents visited, total distance, most-visited
  country, longest trip, latest destination — all computed from real state, not
  hardcoded
- Country detail panel: capital, continent, visited status, "Plan trip" CTA for
  unvisited countries
- `prefers-reduced-motion` respected (stars and marker/aircraft animation pause)
- Responsive layout: floating glass panel on desktop, bottom sheet on mobile

## Known simplifications

- Country click selection is driven by the nearest city marker rather than full
  country polygon hit-testing (rendering real country border geometry on a sphere
  is a much larger undertaking); this is a deliberate scope cut, not a missing
  feature.
- The Earth surface is a procedurally generated placeholder texture (no external
  image dependency), not a satellite photo — swap in a real texture in
  `Earth.tsx` if you want a photographic look.

---

## Update: worldwide city dataset

`src/data/world-data.json` now holds **192 countries and 33,586 cities** (every city with
population ≥ ~15,000 from GeoNames, plus all 192 capitals). Rows are compact arrays:
`[id, name, countryCode, lat, lng, population, isCapital, iata]`. IATA codes exist for
capitals only. Cities are drawn as a single WebGL `Points` object for performance.
Data © GeoNames (CC BY 4.0) — keep this attribution if you publish the app.

---

## Update: hotel & tourist packages

Selecting any of the 33,586 cities now shows a **Hotel packages** and **Tourist packages**
tab (`src/components/PackagesPanel.tsx`) with 3 options each. Prices, hotel names, perks
and tour highlights are generated deterministically per city
(`src/utils/packages.ts` — seeded so the same city always shows the same packages), since
there's no live inventory or booking API connected. They're clearly labeled as sample data.
To wire in real prices later, replace `hotelPackagesFor` / `tourPackagesFor` with calls to
a hotel/tours API, keeping the same return shape.

---

## Update: real landmark names for 147 major cities

`src/data/landmarks.json` hand-lists 2–4 real, well-known landmarks for 147 major
world cities (capitals + top tourist destinations — Paris, Tokyo, Cairo, Rio, etc.).
For these cities:
- **Tourist packages** show actual landmark names as highlights (e.g. "Visit Eiffel Tower"),
  not generic text.
- **Hotel packages** use real international hotel chain names (Ibis, Hilton, Four Seasons,
  etc.) paired with the city name, instead of made-up hotel names.
A "Real landmarks for this city" badge appears in the panel for these cities.

All other cities (~33,400 of them) keep the generic generated names as before, since
real landmark data for every single city worldwide isn't available in any free dataset —
adding it would require a paid places API. See `hasCuratedLandmarks()` in
`src/utils/packages.ts` to extend the curated list yourself.

---

## Backend / Admin panel / accounts / Book Now (MongoDB)

The app works out of the box with no setup, using the bundled `world-data.json`.
Connecting a free **MongoDB Atlas** database adds:
- Real user accounts (**Sign in / Sign up** button on the main page)
- **Book now** on every flight, hotel package, and tour package
- `/admin` — an admin-only panel to insert/update/delete countries, cities, hotel
  packages, and tour packages, plus two read/manage tabs: **Users** and **Bookings**

### How it's built
A small serverless API lives in `api/[...path].js` (one Vercel Function, deployed
automatically — no separate server to run). It talks to MongoDB with the official driver
and issues its own login tokens (JWT + bcrypt password hashing) — there's no third-party
auth provider. The React app calls this API from `src/lib/api.ts`; if the API isn't
configured, everything falls back to the bundled static data automatically.

### 1. Create a free MongoDB Atlas cluster
1. Go to **mongodb.com/cloud/atlas** → sign up (free) → create a free **M0** cluster.
2. Under **Database Access**, add a database user with a password.
3. Under **Network Access**, add `0.0.0.0/0` (allow from anywhere) — simplest for a
   serverless app, since Vercel's functions don't have a fixed IP.
4. Click **Connect → Drivers**, copy the connection string
   (`mongodb+srv://user:password@cluster.mongodb.net/`).

### 2. Set environment variables
These are **server-only secrets** — never prefix them with `VITE_`, or they'd be exposed
to the browser.

Locally, copy `.env.example` to `.env` and fill in:
```
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/
MONGODB_DB=travel_globe
JWT_SECRET=any_long_random_string
```
**On Vercel:** add the same three under **Project → Settings → Environment Variables**,
then redeploy.

> Plain `npm run dev` (Vite) does **not** run the `/api` functions — Vite only serves the
> frontend. To test the API locally, run `vercel dev` instead (`npm i -g vercel`, then
> `vercel dev` in the project folder, after `vercel login`). Without that, the app still
> runs fine locally; it just uses the bundled data and shows "Connect a database" in the
> relevant spots, same as before you set anything up.

### 3. Load your existing data (one-time)
This loads all 33,586 bundled cities/countries into your new database:
```
MONGODB_URI="mongodb+srv://user:password@cluster.mongodb.net/" node scripts/seed.mjs
```

### 4. Create your admin account
1. Deploy (or run `vercel dev`), then use the **Sign Up** button on the main page with
   the email you want as admin.
2. In MongoDB Atlas, open **Browse Collections → travel_globe → users**, find your user
   document, and edit it: change `isAdmin` from `false` to `true`.
3. Go to `/admin` and sign in with that account.

### How data is merged
Hotel/tour packages you add in Admin for a city show up first in the app, with the
generated sample packages filling in after them. Cities you add or edit in Admin fully
replace the bundled entry with that ID. A **booking** is just a saved record (who, what,
price) — there's no payment processing; it's a lead-capture record visible in the admin
**Bookings** tab, clearly labeled as sample data throughout the app. Regular users only
see their own bookings; only admins see everyone's.

### Security notes
- Passwords are hashed with bcrypt — never stored in plain text.
- Login tokens (JWTs) are stored in the browser's `localStorage` and sent as a Bearer
  token; they expire after 30 days.
- Only admins can write to countries/cities/packages or see other users' data — enforced
  server-side in `api/[...path].js`, not just hidden in the UI.
- There's no email verification step (unlike the earlier Supabase version) — anyone can
  sign up with any email instantly. Fine for a personal/demo project; add email
  verification yourself before a public launch if that matters to you.


### Troubleshooting: 404 on sign up / API calls
- The API (`api/[...path].js`) now reads the route from the request URL, so `/api/auth/signup` etc. resolve on Vercel.
- In Vercel, set **Framework Preset = Vite**, Build Command `npm run build`, Output Directory `dist`.
- `MONGODB_URI`, `MONGODB_DB`, `JWT_SECRET` must be set under Settings → Environment Variables, then **redeploy**.
- Quick check: open `https://YOUR-SITE.vercel.app/api/world` — it should return JSON (503 means env vars are missing; 404 means the function wasn't deployed).
- `npm run dev` never serves `/api`; use `vercel dev` locally.
