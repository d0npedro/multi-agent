/**
 * Capture README screenshots of the local simulator.
 * Usage: node scripts/capture-readme-screenshots.mjs [baseUrl]
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'docs', 'screenshots');
const baseUrl = process.argv[2] ?? 'http://localhost:5173/';

await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
});

await page.goto(baseUrl, { waitUntil: 'networkidle' });
await page.getByTestId('app-shell').waitFor();
await page.getByRole('heading', { name: 'Agent Collective' }).waitFor();
// Let React Flow finish first layout / fitView
await page.waitForTimeout(800);

await page.screenshot({
  path: join(outDir, '01-dashboard-overview.png'),
  animations: 'disabled',
});

await page.getByTestId('speed-4').click();
await page.getByTestId('btn-play').click();
await page.getByText('LIVE', { exact: true }).waitFor();
// Let agents claim tasks and logs fill
await page.waitForTimeout(4500);

await page.screenshot({
  path: join(outDir, '02-simulation-running.png'),
  animations: 'disabled',
});

await page.getByRole('button', { name: 'Coder-01 Coder' }).click();
await page.getByTestId('agent-config').waitFor();
await page.waitForTimeout(300);

await page.screenshot({
  path: join(outDir, '03-agent-config.png'),
  animations: 'disabled',
});

await page.getByTestId('evt-shortage').click();
await page.getByTestId('evt-market').click();
await page.getByTestId('evt-failure').click();
await page.waitForTimeout(1800);

await page.screenshot({
  path: join(outDir, '04-external-events.png'),
  animations: 'disabled',
});

await browser.close();
console.log(`Wrote screenshots to ${outDir}`);
