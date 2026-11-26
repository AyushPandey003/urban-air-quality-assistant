import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { makeSnapshot } from '../src/test/fixtures';

test.beforeEach(async ({ page }) => {
  await page.route('**/data/air-quality.json', (route) =>
    route.fulfill({ json: makeSnapshot(Date.now()) }),
  );
  await page.route('https://basemaps.cartocdn.com/**', (route) =>
    route.fulfill({
      json: {
        version: 8,
        sources: {},
        layers: [
          { id: 'background', type: 'background', paint: { 'background-color': '#0a1219' } },
        ],
      },
    }),
  );
  await page.goto('./');
  await expect(page.getByRole('region', { name: 'Air quality summary' })).toContainText(
    'Alpha station',
  );
});

test('city and station selections synchronize metrics, chart and map', async ({ page }) => {
  const summary = page.getByRole('region', { name: 'Air quality summary' });
  await page
    .getByRole('region', { name: 'Nearby stations' })
    .getByRole('button', { name: /Beta station/ })
    .click();
  await expect(summary).toContainText('Beta station');
  await expect(page.getByRole('region', { name: '24 hour AQI forecast' })).toContainText(
    'Beta station',
  );
  await page.getByLabel('Exploring').selectOption('Delhi');
  await expect(summary).toContainText('Delhi station');
  await expect(page.getByRole('region', { name: 'Nearby stations' })).not.toContainText(
    'Beta station',
  );
});
test('station search, accessible chart table and history work', async ({ page }) => {
  await page.getByRole('searchbox', { name: 'Search stations' }).fill('missing');
  await expect(page.getByText('No stations match your search.')).toBeVisible();
  await page.getByText('View hourly data table').click();
  await expect(page.getByRole('table')).toBeVisible();
  await expect(page.getByRole('table').getByRole('row')).toHaveCount(25);
  await page.getByRole('button', { name: 'History', exact: true }).click();
  await expect(page.getByRole('table')).toContainText('Historical hourly index');
});
test('rule-based answers use the selected station', async ({ page }) => {
  await page.getByLabel('Your question').fill('What is the air quality?');
  await page.getByRole('button', { name: 'Ask ↗', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Air assistant' })).toContainText(
    'At Alpha station',
  );
});
test('refresh reuses published snapshots without making API requests', async ({ page }) => {
  const apiRequests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/api/')) apiRequests.push(request.url());
  });
  await page.getByRole('button', { name: 'Refresh air quality' }).click();
  await expect(page.getByRole('region', { name: 'Air quality summary' })).toContainText(
    'Alpha station',
  );
  expect(apiRequests).toEqual([]);
});
test('snapshot failure has an actionable recovery path', async ({ page }) => {
  await page.route('**/data/air-quality.json', (route) =>
    route.fulfill({ status: 503, body: 'unavailable' }),
  );
  await page.getByRole('button', { name: 'Refresh air quality' }).click();
  await expect(
    page.getByRole('alert').filter({ hasText: 'Choose another city or use Refresh' }),
  ).toBeVisible();
  await page.route('**/data/air-quality.json', (route) =>
    route.fulfill({ json: makeSnapshot(Date.now()) }),
  );
  await page.getByRole('button', { name: 'Refresh air quality' }).click();
  await expect(page.getByRole('region', { name: 'Air quality summary' })).toContainText(
    'Alpha station',
  );
});
test('denied geolocation preserves manual city selection', async ({ page }) => {
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'geolocation', {
      value: {
        getCurrentPosition: (_success: unknown, failure: (error: unknown) => void) =>
          failure({ code: 1 }),
      },
      configurable: true,
    });
  });
  await page.getByRole('button', { name: /Use my location/ }).click();
  await expect(page.getByText(/Location access was unavailable or denied/)).toBeVisible();
  await page.getByLabel('Exploring').selectOption('Delhi');
  await expect(page.getByRole('region', { name: 'Air quality summary' })).toContainText(
    'Delhi station',
  );
});
test('has no automated WCAG A/AA violations and no horizontal overflow', async ({ page }) => {
  const audit = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(audit.violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});
test('stale data remains inspectable but does not generate fresh advice or a forecast', async ({
  page,
}) => {
  await page.route('**/data/air-quality.json', (route) =>
    route.fulfill({ json: makeSnapshot(Date.now() - 25 * 3_600_000) }),
  );
  await page.getByRole('button', { name: 'Refresh air quality' }).click();
  await expect(page.getByRole('region', { name: 'Air quality summary' })).toContainText(
    'Stale observation',
  );
  await expect(page.getByRole('region', { name: 'Personalized health advisory' })).toContainText(
    'non-stale observations',
  );
  await expect(page.getByRole('region', { name: '24 hour AQI forecast' })).toContainText(
    'over 12 hours old',
  );
  await page.getByRole('button', { name: 'History', exact: true }).click();
  await page.getByText('View hourly data table').click();
  await expect(page.getByRole('table')).toBeVisible();
});

test('hazardous readings retain accessible contrast and explicit severity labels', async ({
  page,
}) => {
  const snapshot = makeSnapshot(Date.now());
  snapshot.cities[0]!.readings[0]!.pm25 = 280;
  snapshot.cities[0]!.history['1']!.forEach((point) => {
    point.value = 280;
  });
  await page.route('**/data/air-quality.json', (route) => route.fulfill({ json: snapshot }));
  await page.getByRole('button', { name: 'Refresh air quality' }).click();
  await expect(page.getByRole('region', { name: 'Air quality summary' })).toContainText(
    'Hazardous',
  );
  const audit = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(audit.violations).toEqual([]);
});

test('serves a same-origin module worker and renders the heatmap without worker errors', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.locator('#map-viewport').scrollIntoViewIfNeeded();
  const worker =
    page.workers().find((candidate) => candidate.url().includes('/vendor/maplibre-worker.mjs')) ??
    (await page.waitForEvent('worker', {
      predicate: (candidate) => candidate.url().includes('/vendor/maplibre-worker.mjs'),
    }));
  expect(worker.url()).toContain('/urban-air-quality-assistant/vendor/maplibre-worker.mjs');
  await expect.poll(() => worker.evaluate(() => typeof self.postMessage)).toBe('function');
  const response = await page.request.get('vendor/maplibre-worker.mjs');
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('javascript');
  await page.getByRole('button', { name: 'Heatmap', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Heatmap', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  expect(
    errors.filter((message) => /worker failed|content security policy/i.test(message)),
  ).toEqual([]);
});

test('loads static assets under the GitHub Pages subpath without runtime errors', async ({
  page,
}) => {
  const failures: string[] = [];
  page.on('pageerror', (error) => failures.push(error.message));
  await page.addInitScript(() => {
    const violations: string[] = [];
    Object.assign(window, { airspaceCspViolations: violations });
    document.addEventListener('securitypolicyviolation', (event) => {
      violations.push(`${event.effectiveDirective}: ${event.blockedURI}`);
    });
  });
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Air quality summary' })).toContainText(
    'Alpha station',
  );
  expect(failures).toEqual([]);
  expect(
    await page.evaluate(
      () => (window as Window & { airspaceCspViolations?: string[] }).airspaceCspViolations,
    ),
  ).toEqual([]);
});
