# Airspace · Urban Air Quality Assistant

A responsive, accessible dashboard for understanding published city air-quality observations.

**[Live website](https://ayushpandey003.github.io/urban-air-quality-assistant/)** · **[Source code](https://github.com/AyushPandey003/urban-air-quality-assistant)**

## Features and honest boundaries

- Eight supported cities: Bengaluru, Delhi, Mumbai, Chennai, Hyderabad, Kolkata, Pune, Ahmedabad.
- Interactive station map, decluttered touch targets, optional station halos, searchable station list, and pollutant cards.
- **2024 US EPA PM2.5 breakpoints** and a particle **NowCast calculated as of the latest hourly observation** where history permits. Insufficient-history stations are explicitly labeled indicative PM2.5 indices.
- Station observation times and snapshot fetch times are shown separately. Snapshots are scheduled every six hours, **not real-time**; GitHub can delay scheduled jobs.
- An experimental 24-hour statistical outlook with a history view and accessible data table. Accuracy has **not** been independently validated; variability shading is **not** a calibrated confidence interval.
- Native keyboard-operable health-profile controls and non-medical, indicative guidance. Stale observations do not produce actionable advice.
- Text questions use a deterministic, rule-based helper—not a runtime generative AI service. Optional browser voice recognition may send audio to the browser provider; text stays on-device.
- GPS matches a supported city within 50 km. Coordinates are not sent to our servers; arbitrary-location querying requires a separate backend. Third-party map providers receive requests for the viewed map area.

This is a PM2.5-focused educational tool, **not an official multi-pollutant or city-wide AQI service**. It uses the US EPA scale, not India's CPCB National AQI. Station measurements, monitor placement and reporting cadence vary.

## Architecture

| Layer                                        | Responsibility                                                            |
| -------------------------------------------- | ------------------------------------------------------------------------- |
| `src/components/Dashboard.tsx`               | Compose focused presentation components                                   |
| `src/hooks/useAirQuality.ts`                 | Async state, cancellation, station selection, refresh                     |
| `src/hooks/useCityLocation.ts`               | Explicit opt-in geolocation and manual-choice race protection             |
| `src/lib/snapshot-schema.ts`                 | Shared build-time and browser data validation                             |
| `src/lib/openaq.ts`                          | Credential-free snapshots, shared request cache, station index derivation |
| `src/lib/data-policy.ts`                     | Consistent freshness, normalization and outlook eligibility               |
| `src/lib/aqi.ts`, `nowcast.ts`, `outlook.ts` | Pure, independently tested calculations                                   |
| `src/lib/assistant.ts`                       | Answers grounded in the selected station's data                           |
| `scripts/refresh-data.mjs`                   | Rate-limited upstream collection and atomic snapshot publication          |
| `.github/workflows/`                         | Quality gates, six-hour refresh, static export and Pages deployment       |

There is no server API in the deployed site. One validated snapshot request is shared across city and station views; selecting another station does not re-download the data. Expiry and explicit Refresh invalidate the cache.

## Local development

Node **22.12+** is required. Existing public snapshots work without credentials.

```sh
npm ci
npm run dev
```

To refresh actual observations locally, copy `.env.example` to `.env`, add your OpenAQ key, and run:

```sh
node --env-file=.env --experimental-strip-types scripts/refresh-data.mjs
```

Never put the key in a `NEXT_PUBLIC_` variable. `.env` files are ignored by Git.

## Verification

```sh
npm run format:check
npm run lint
npm run typecheck
npm run validate:data
npm run test:coverage
npm audit --audit-level=high
```

For browser testing of the actual Pages subpath:

```sh
GH_PAGES_BASE=urban-air-quality-assistant NEXT_DIST_DIR=.next-pages npm run export
npx playwright install chromium
npm run test:e2e
```

The browser suite covers desktop/mobile interactions, failure recovery, denied GPS, station synchronization, accessible chart data, automated WCAG A/AA checks, and subpath asset loading. Core-library coverage thresholds are enforced separately from UI tests; they do not imply whole-application coverage. Automated accessibility checks do not establish complete WCAG conformance. See [quality and accessibility notes](docs/QUALITY.md).

## GitHub Pages deployment

Set the repository Actions secret **`OPENAQ_API_KEY`** and Pages source to **GitHub Actions**. Push to `main` or run the deployment workflow manually. It also runs at `17 */6 * * *` UTC.

The deployment first runs the reusable quality workflow: audit, formatting, lint, types, snapshot validation, coverage and desktop/mobile browser tests. Only passing code proceeds to data refresh and publication. Partial upstream failures retain previous city data; total failure does not replace the published site. Snapshots are validated with the same schema used by the client before an atomic write.

`npm run export` produces `out/` (or `NEXT_DIST_DIR`). It checks exported files for configured credentials and common GitHub-token patterns, adds a hashed-inline-script Content Security Policy, and creates `.nojekyll`. No API key is published. See [security policy](SECURITY.md).

## Data and calculation references

- [EPA PM2.5 breakpoint table](https://aqs.epa.gov/aqsweb/documents/codetables/aqi_breakpoints.html)
- [AirNow AQI and NowCast explanation](https://www.airnow.gov/aqi/aqi-basics/using-air-quality-index/)
- [OpenAQ API](https://docs.openaq.org/)

Map data: CARTO / OpenStreetMap / MapLibre. Observations: OpenAQ and contributing providers. Provider and licensing metadata is retained in published snapshots where supplied upstream. Respect the applicable observation and map-provider licenses when reusing data.
