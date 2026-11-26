import { copyFile, mkdir } from 'node:fs/promises';

// MapLibre 6's module worker needs an explicit same-origin URL under static bundlers.
// Keep its upstream license header intact and generate it from the locked dependency.
await mkdir(new URL('../public/vendor/', import.meta.url), { recursive: true });
await copyFile(
  new URL('../node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs', import.meta.url),
  new URL('../public/vendor/maplibre-worker.mjs', import.meta.url),
);
// Preserve the worker's existing sourceMappingURL filename.
await copyFile(
  new URL('../node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs.map', import.meta.url),
  new URL('../public/vendor/maplibre-gl-worker.mjs.map', import.meta.url),
);
