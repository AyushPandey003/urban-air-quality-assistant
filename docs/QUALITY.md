# Quality and evaluation evidence

The project optimizes for maintainability, trustworthy calculations, testable behavior and inclusive interaction—not a promised external evaluator score.

## Code quality

- Dashboard composition is separated from async data and geolocation lifecycle hooks.
- Pure calculation, snapshot validation, freshness and assistant modules have direct unit tests.
- Common data and forecasting policies are centralized; the chart and assistant use the same eligibility checks.
- Formatting, linting with zero warnings and strict TypeScript checks are CI gates.
- Obsolete forecasting scripts, undeployed API handlers and unused graphics/animation dependencies were removed.

## Test layers

1. **Core unit tests:** updated EPA boundaries, decimal truncation, monotonicity, invalid inputs, weighted NowCast, missing hours, outlook gating, freshness, spatial distance and marker decluttering.
2. **Snapshot contract tests:** schema failures, missing cities, caching, invalidation, cancelled consumers, retry after failure, Pages base path and credential-free requests.
3. **Component/hook tests:** native radio keyboard behavior, searching/selecting stations, request races, GPS consent/failure, manual selection winning over late GPS callbacks.
4. **Browser tests:** actual static export under the repository subpath, desktop and mobile, synchronized views, accessible table, text answers, refresh, recovery and denied geolocation.
5. **Accessibility automation:** axe WCAG 2 A/AA, 2.1 AA and applicable 2.2 AA checks, plus horizontal-overflow assertions.

`npm run test:coverage` measures **core-library coverage**, with minimum 90% lines/statements/functions and 85% branches. It does not report full-app coverage. Reports are generated in `coverage/`; Playwright traces/screenshots are retained locally on failure. Results can change as code or dependencies change.

Browser tests use deterministic observation fixtures and a blank map style to avoid upstream outages and tile traffic. Those tests do not validate OpenAQ availability, forecast skill or real-world map accuracy. The deployed site should also be smoke-tested with actual observations and tiles.

## Accessibility design

- Semantic headings/landmarks, a skip link and visible keyboard focus.
- Native health-profile radios, labeled select/search/question inputs and live status/error messages.
- Readable secondary text, 44px primary controls and non-overlapping map-marker targets at rest.
- All stations are available through an ordinary button list; the map is not the sole route to data.
- Charts have textual summaries and a date/time/index table; color is not the only indicator.
- Reduced-motion support, forced-colors borders and optional text instead of voice.

Automated checks are not complete WCAG certification. Manual keyboard, zoom, screen-reader, high-contrast and speech-provider testing remains necessary across supported browsers. A map may still require panning/zooming; the station list provides equivalent selection without spatial gestures.

## Scientific limitations

- The 2024 EPA PM2.5 scale is not the Indian CPCB AQI and is not a complete multi-pollutant index.
- NowCast is calculated as of the latest supplied hourly observation, not the snapshot fetch time. When its data requirements are not met, values are labeled indicative.
- Hourly history/forecast concentrations converted onto the EPA scale are comparative indices, not official daily AQIs.
- The outlook is an experimental damped-trend/previous-day estimate. No MAE, RMSE, confidence level or prediction accuracy is claimed without chronological backtesting against persistence and seasonal baselines.
- Six-hour GitHub Actions refreshes can be delayed. Snapshot and observation timestamps—not a live badge—are the source of truth.
- The helper is rule-based, and its health guidance is not a medical assessment or a generative AI service.
