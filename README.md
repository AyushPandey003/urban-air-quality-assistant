# Airspace · Urban Air Quality Assistant

A responsive air-quality dashboard with city selection, interactive station maps, PM2.5/AQI cards, station history, a statistical 24-hour outlook, health profiles, and text/voice questions.

- **Website:** https://ayushpandey003.github.io/urban-air-quality-assistant/
- **Source:** https://github.com/AyushPandey003/urban-air-quality-assistant

## GitHub Pages architecture

The deployed site is a Next.js **static export**. It has no API server and contains no OpenAQ credentials. GitHub Actions fetches station readings and hourly history for eight supported cities, builds the site, and deploys Pages. The workflow runs on pushes, manual dispatch, and every six hours (`17 */6 * * *`, UTC). Scheduled runs can be delayed by GitHub.

Set the repository Actions secret **`OPENAQ_API_KEY`**. Set Pages source to **GitHub Actions**. The workflow automatically sets the repository base path. On partial upstream failure it retains the last available city snapshot; on total failure it does not replace the published site. Station observation times and city snapshot fetch times are displayed separately.

Cities: Bengaluru, Delhi, Mumbai, Chennai, Hyderabad, Kolkata, Pune, Ahmedabad. GPS selects a supported city within approximately 50 km; this static deployment cannot query arbitrary locations. Refresh reloads the latest published snapshot rather than contacting OpenAQ.

The forecast uses the selected station's hourly PM2.5 history, a damped trend and previous-day seasonal observations when available. It is a statistical estimate, **not an official forecast**. Model variability shading is not a calibrated confidence interval. Stale/insufficient data is clearly indicated. Health guidance is not medical advice; readings are indicative, not a regulatory city-wide AQI.

## Local development

```sh
npm ci
cp .env.example .env
# Add your key to .env (ignored by Git).
node --env-file=.env scripts/refresh-data.mjs
npm run dev
```

The refresh script uses Node 22 and rate-limits requests. Committed snapshots allow local development without a key. Only public environmental observations are published.

```sh
npm run lint
npm run typecheck
npm test
GH_PAGES_BASE=urban-air-quality-assistant npm run export
```

The `out/` directory is the complete static site. `src/server/` preserves reference OpenAQ proxy handlers and tests, but they are **not** routes in this static deployment. The retired Python forecast updater is not used by the deployment workflow.

Map tiles: CARTO / OpenStreetMap / MapLibre. Observations: OpenAQ and its contributing providers. Provider metadata is included in the published data snapshot.
