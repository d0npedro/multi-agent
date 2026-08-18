/**
 * Capture documentation screenshots from a running app.
 * Usage: npm run screenshots
 *        node scripts/capture-screenshots.mjs [baseUrl]
 */
import { chromium } from 'playwright';
import { mkdir, readdir, unlink } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'docs', 'screenshots');
const baseUrl = process.argv[2] ?? 'http://localhost:5173/';

const KEEP = new Set([
  'hero.png',
  'graph-live.png',
  'controls.png',
  'agents.png',
  'metrics.png',
  'resources.png',
  'events.png',
  'tasks.png',
]);

async function shot(locator, name) {
  await locator.screenshot({
    path: join(outDir, name),
    animations: 'disabled',
  });
}

await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
});

await page.goto(baseUrl, { waitUntil: 'networkidle' });
await page.getByTestId('app-shell').waitFor();
await page.getByRole('heading', { name: 'Agent Collective' }).waitFor();
await page.waitForTimeout(800);

await page.getByTestId('speed-4').click();
await page.getByTestId('btn-play').click();
await page.getByText('LIVE', { exact: true }).waitFor();
await page.waitForTimeout(5000);

await page.getByRole('button', { name: 'Coder-01 Coder' }).click();
await page.getByTestId('agent-config').waitFor();
await page.waitForTimeout(250);

await shot(page.getByTestId('controls-bar'), 'controls.png');
await shot(page.getByTestId('agent-panel'), 'agents.png');
await shot(page.getByTestId('metrics-panel'), 'metrics.png');
await shot(page.getByTestId('resource-panel'), 'resources.png');
await shot(page.getByTestId('task-panel'), 'tasks.png');
await shot(page.getByTestId('agent-graph'), 'graph-live.png');

await page.getByTestId('evt-shortage').click();
await page.getByTestId('evt-market').click();
await page.getByTestId('evt-failure').click();
await page.waitForTimeout(2000);

await shot(page.getByTestId('event-panel'), 'events.png');
await shot(page.getByTestId('resource-panel'), 'resources.png');
await page.screenshot({
  path: join(outDir, 'hero.png'),
  animations: 'disabled',
});

await browser.close();

for (const name of await readdir(outDir)) {
  if (!KEEP.has(name)) {
    await unlink(join(outDir, name));
  }
}

console.log(`Wrote screenshots to ${outDir}`);
