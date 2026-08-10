import { chromium } from 'playwright';
import { writeFileSync } from 'fs';
import path from 'path';

const scratch = process.env.SCRATCH || path.resolve('scratch-ui');
const url = process.env.APP_URL || 'http://127.0.0.1:4173';

const errors = [];
const log = [];

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console: ${msg.text()}`);
  });

  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

  const shell = await page.locator('[data-testid="app-shell"]').count();
  const graph = await page.locator('[data-testid="agent-graph"]').count();
  const metrics = await page.locator('[data-testid="metrics-panel"]').count();
  const logs = await page.locator('[data-testid="log-panel"]').count();
  const events = await page.locator('[data-testid="event-panel"]').count();
  const agentPanel = await page.locator('[data-testid="agent-panel"]').count();

  const tickBefore = await page.locator('[data-testid="tick-display"]').innerText();

  await page.locator('[data-testid="create-agent-name"]').fill('SmokeBot');
  await page.locator('[data-testid="btn-create-agent"]').click();
  await page.waitForTimeout(200);

  const rosterText = await page.locator('[data-testid="agent-roster"]').innerText();
  const created = rosterText.includes('SmokeBot');

  await page.locator('[data-testid="btn-play"]').click();
  await page.waitForTimeout(1200);
  const tickAfter = await page.locator('[data-testid="tick-display"]').innerText();
  const advanced = tickAfter !== tickBefore || tickAfter.includes('LIVE');

  await page.locator('[data-testid="btn-pause"]').click().catch(() => {});

  await page.screenshot({ path: path.join(scratch, 'ui-launch.png'), fullPage: true });

  const report = {
    url,
    shell: shell > 0,
    graph: graph > 0,
    metrics: metrics > 0,
    logs: logs > 0,
    events: events > 0,
    agentPanel: agentPanel > 0,
    createdAgent: created,
    tickBefore,
    tickAfter,
    simAdvanced: advanced,
    pageErrors: errors,
    ok:
      shell > 0 &&
      graph > 0 &&
      metrics > 0 &&
      logs > 0 &&
      events > 0 &&
      agentPanel > 0 &&
      created &&
      advanced &&
      errors.length === 0,
  };

  writeFileSync(path.join(scratch, 'ui-launch.json'), JSON.stringify(report, null, 2));
  writeFileSync(
    path.join(scratch, 'ui-launch.log'),
    [
      `UI smoke @ ${url}`,
      `shell=${report.shell} graph=${report.graph} metrics=${report.metrics} logs=${report.logs} events=${report.events}`,
      `createdAgent=${created}`,
      `tickBefore=${tickBefore}`,
      `tickAfter=${tickAfter}`,
      `simAdvanced=${advanced}`,
      `pageErrors=${errors.length ? errors.join(' | ') : 'none'}`,
      `ok=${report.ok}`,
    ].join('\n') + '\n',
  );

  console.log(JSON.stringify(report, null, 2));
  await browser.close();
  if (!report.ok) process.exit(1);
}

main().catch((e) => {
  writeFileSync(path.join(scratch, 'ui-launch-unavailable.log'), String(e.stack || e));
  console.error(e);
  process.exit(1);
});
