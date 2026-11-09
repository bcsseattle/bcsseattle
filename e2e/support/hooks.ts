import { mkdirSync } from 'node:fs';
import {
  After,
  AfterAll,
  Before,
  BeforeAll,
  Status,
  setParallelCanAssign,
  type ITestCaseHookParameter,
} from '@cucumber/cucumber';
import { chromium, firefox, webkit, type Browser } from '@playwright/test';
import { env } from './env';
import { ensureDonationProduct } from './stripe';
import type { E2EWorld } from './world';


let browser: Browser;

// @serial scenarios assert on global state (e.g. "no elections at all"), so they
// run alone: nothing else is assigned while one runs, and one waits for an idle worker.
setParallelCanAssign((pickle, inProgress) => {
  const serial = (p: typeof pickle) => p.tags.some((t) => t.name === '@serial');
  if (serial(pickle)) return inProgress.length === 0;
  return !inProgress.some(serial);
});

BeforeAll(async function () {
  browser = await { chromium, firefox, webkit }[env.browser].launch({ headless: !env.headed });
  await ensureDonationProduct();
  mkdirSync('e2e/reports/traces', { recursive: true });
  mkdirSync('e2e/reports/screenshots', { recursive: true });
});

AfterAll(async function () {
  await browser?.close();
});

const tagged = (h: ITestCaseHookParameter, tag: string) => h.pickle.tags.some((t) => t.name === tag);

Before(async function (this: E2EWorld, hook) {
  const mobile = tagged(hook, '@mobile');
  this.context = await browser.newContext({
    baseURL: env.baseUrl,
    // Phone width only: isMobile/touch emulation isn't supported by every engine.
    viewport: mobile ? { width: 375, height: 812 } : { width: 1280, height: 800 },
  });
  // Analytics adds noise and outbound traffic; nothing in the suite depends on it.
  await this.context.route(/googletagmanager\.com|google-analytics\.com|vercel-insights|_vercel\/insights/, (r) =>
    r.abort()
  );
  if (!tagged(hook, '@api')) {
    await this.context.tracing.start({ screenshots: true, snapshots: true, sources: false });
  }
  this.page = await this.context.newPage();
  this.page.on('console', (msg) => {
    if (msg.type() === 'error') this.consoleErrors.push(msg.text());
  });
  this.page.on('pageerror', (err) => this.consoleErrors.push(`pageerror: ${err.message}`));
  this.page.on('requestfailed', (req) => {
    if (!/googletagmanager|google-analytics|insights/.test(req.url())) {
      this.failedRequests.push(`${req.method()} ${req.url()} — ${req.failure()?.errorText}`);
    }
  });
  this.page.on('response', (res) => {
    if (res.status() >= 500) this.failedRequests.push(`${res.status()} ${res.request().method()} ${res.url()}`);
  });
});

After(async function (this: E2EWorld, hook) {
  const failed = hook.result?.status === Status.FAILED;
  const slug = `${hook.pickle.name}-${hook.pickle.id}`.replace(/[^a-z0-9]+/gi, '-').slice(0, 120);
  try {
    if (failed && !tagged(hook, '@api')) {
      const png = await this.page.screenshot({ fullPage: true }).catch(() => undefined);
      if (png) this.attach(png, 'image/png');
      const tracePath = `e2e/reports/traces/${slug}.zip`;
      await this.context.tracing.stop({ path: tracePath });
      this.attach(`Trace: ${tracePath}\nOpen with: pnpm exec playwright show-trace ${tracePath}`, 'text/plain');
      this.attach(`URL at failure: ${this.page.url()}`, 'text/plain');
    } else if (!tagged(hook, '@api')) {
      await this.context.tracing.stop();
    }
    if (failed && this.consoleErrors.length) this.attach(`Browser console errors:\n${this.consoleErrors.join('\n')}`, 'text/plain');
    if (failed && this.failedRequests.length) this.attach(`Failed requests:\n${this.failedRequests.join('\n')}`, 'text/plain');
  } finally {
    await this.context?.close();
    for (const undo of this.cleanup.reverse()) {
      await undo().catch((err) => console.warn(`cleanup failed: ${(err as Error).message}`));
    }
  }
});
