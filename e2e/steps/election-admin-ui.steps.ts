import AxeBuilder from '@axe-core/playwright';
import { Given, Then, When } from '@cucumber/cucumber';
import type { Page } from '@playwright/test';
import { admin } from '../support/db';
import { expect } from '../support/expect';
import type { E2EWorld } from '../support/world';

const TYPE_OPTION: Record<string, RegExp> = {
  leadership: /^Leadership/,
  board: /^Board/,
  initiative: /^Initiatives only/
};

const dialog = (page: Page) => page.getByRole('alertdialog');

async function onStep(page: Page, step: string) {
  await expect(page).toHaveURL(new RegExp(`step=${step}`));
}

When(
  /^I start a new (leadership|board|initiative) election called "([^"]+)"$/,
  async function (this: E2EWorld, type: string, title: string) {
    await this.page.goto('/admin/elections/new');
    await this.page.getByLabel('Title').fill(title);
    await this.page.getByRole('radio', { name: TYPE_OPTION[type] }).click();
    await this.page.getByRole('button', { name: 'Create draft' }).click();
    await onStep(this.page, 'ballot');
    const id = /\/admin\/elections\/([0-9a-f-]{36})\//.exec(this.page.url())![1];
    this.cleanup.push(async () => admin.from('elections').delete().eq('id', id));
    this.election = { id, title, candidates: [], initiatives: [] };
  }
);

Then('I should be on the {string} step', async function (this: E2EWorld, label: string) {
  await expect(this.page.locator('[aria-current="step"]')).toHaveText(label);
});

When('I go to the {string} step', async function (this: E2EWorld, label: string) {
  await this.page.getByRole('navigation', { name: 'Election setup steps' }).getByRole('link', { name: label }).click();
  await expect(this.page.locator('[aria-current="step"]')).toHaveText(label);
});

When('I add the position {string} with {int} seats', async function (this: E2EWorld, title: string, seats: number) {
  await this.page.getByRole('button', { name: 'Add position' }).click();
  await this.page.locator('input[id^="position-"][id$="-title"]').last().fill(title);
  await this.page.locator('input[id^="position-"][id$="-seats"]').last().fill(String(seats));
  await this.page.getByRole('button', { name: 'Save and continue' }).click();
  await onStep(this.page, 'timeline');
});

When('I save the timeline and settings as they are', async function (this: E2EWorld) {
  await this.page.getByRole('button', { name: 'Save and continue' }).click();
  await onStep(this.page, 'settings');
  await this.page.getByRole('button', { name: 'Save and continue' }).click();
  await onStep(this.page, 'review');
});

When('I set nominations to close after voting opens', async function (this: E2EWorld) {
  const opens = await this.page.locator('#start_date').inputValue();
  const [date, time] = opens.split('T');
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  this.data.typed = `${next.toISOString().slice(0, 10)}T${time}`;
  await this.page.locator('#nomination_end').fill(this.data.typed);
  await this.page.getByRole('button', { name: 'Save and continue' }).click();
});

Then('the {string} field should still show what I typed', async function (this: E2EWorld, label: string) {
  await expect(this.page.getByLabel(label, { exact: true })).toHaveValue(this.data.typed);
});

When("I open the election's admin page", async function (this: E2EWorld) {
  await this.page.goto(`/admin/elections/${this.election!.id}`);
});

When('I publish the election', async function (this: E2EWorld) {
  await this.page.getByRole('button', { name: 'Publish', exact: true }).click();
  await dialog(this.page).getByRole('button', { name: 'Publish election' }).click();
});

When('I delete the draft', async function (this: E2EWorld) {
  await this.page.goto(`/admin/elections/${this.election!.id}?tab=settings`);
  await this.page.getByRole('button', { name: 'Delete draft' }).click();
  await dialog(this.page).getByRole('button', { name: 'Delete draft' }).click();
});

When('I cancel the election because {string}', async function (this: E2EWorld, reason: string) {
  await this.page.goto(`/admin/elections/${this.election!.id}?tab=settings`);
  await this.page.getByRole('button', { name: 'Cancel election' }).click();
  await dialog(this.page).getByLabel('Reason').fill(reason);
  await dialog(this.page).getByRole('button', { name: 'Cancel election' }).click();
});

When('I try to cancel the election without a reason', async function (this: E2EWorld) {
  await this.page.goto(`/admin/elections/${this.election!.id}?tab=settings`);
  await this.page.getByRole('button', { name: 'Cancel election' }).click();
  await dialog(this.page).getByRole('button', { name: 'Cancel election' }).click();
});

Then("the election's status should be {string}", async function (this: E2EWorld, status: string) {
  await expect
    .poll(async () => (await admin.from('elections').select('status').eq('id', this.election!.id).single()).data?.status)
    .toBe(status);
});

Then('the election should no longer exist', async function (this: E2EWorld) {
  await expect
    .poll(async () => (await admin.from('elections').select('id', { count: 'exact', head: true }).eq('id', this.election!.id)).count)
    .toBe(0);
});

Then(
  'the election should be listed under {string} with the action {string}',
  async function (this: E2EWorld, tab: string, action: string) {
    await this.page.goto('/admin/elections');
    await this.page.getByRole('tab', { name: new RegExp(`^${tab}`) }).click();
    const row = this.page.getByRole('listitem').filter({ has: this.page.getByRole('link', { name: this.election!.title, exact: true }) });
    await expect(row.getByRole('link', { name: new RegExp(`^${action}`) })).toBeVisible();
  }
);

Then("the election's activity should show {string}", async function (this: E2EWorld, what: string) {
  await this.page.goto(`/admin/elections/${this.election!.id}?tab=activity`);
  await expect(this.page.getByText(what, { exact: true }).first()).toBeVisible();
});

Then(
  "the election's activity should show {string} with the reason {string}",
  async function (this: E2EWorld, what: string, reason: string) {
    await this.page.goto(`/admin/elections/${this.election!.id}?tab=activity`);
    const entry = this.page.getByRole('listitem').filter({ hasText: what });
    await expect(entry.getByText(`Reason: ${reason}`)).toBeVisible();
  }
);

export async function seriousProblems(page: Page) {
  await page.waitForLoadState('networkidle');
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  return violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.id}: ${v.help} (${v.nodes.length} element(s))`);
}

Then('an accessibility scan should find no serious problems', async function (this: E2EWorld) {
  expect(await seriousProblems(this.page)).toEqual([]);
});

Given(
  "each of the election's admin pages should have no serious accessibility problems and fit the screen",
  async function (this: E2EWorld) {
    const base = `/admin/elections/${this.election!.id}`;
    const paths = [
      base,
      `${base}?tab=nominations`,
      `${base}?tab=activity`,
      `${base}?tab=settings`,
      ...['basics', 'ballot', 'timeline', 'settings', 'review'].map((s) => `${base}/edit?step=${s}`)
    ];
    for (const path of paths) {
      await this.page.goto(path);
      expect(await seriousProblems(this.page), path).toEqual([]);
      const { scrollWidth, innerWidth } = await this.page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth
      }));
      expect(scrollWidth, `${path} is wider than the screen`).toBeLessThanOrEqual(innerWidth);
    }
  }
);

/** An instant as a datetime-local value in Seattle time, as the admin forms take it. */
function seattleLocal(at: number) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23'
    })
      .formatToParts(at)
      .map((x) => [x.type, x.value])
  );
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

const FIELD_ID: Record<string, string> = {
  'nominations close': 'nomination_end',
  'voting opens': 'start_date',
  'voting closes': 'end_date'
};

When(
  /^I edit the election so (nominations close|voting opens|voting closes) in (\d+) hours?(?: and (nominations close|voting opens|voting closes) in (\d+) hours?)?$/,
  async function (this: E2EWorld, f1: string, h1: string, f2?: string, h2?: string) {
    await this.page.goto(`/admin/elections/${this.election!.id}/edit?step=timeline`);
    this.data.expected = JSON.stringify({});
    const expected: Record<string, string> = {};
    for (const [field, hours] of [[f1, h1], [f2, h2]].filter(([f]) => f) as [string, string][]) {
      // Whole minutes, as the form takes them.
      const at = Math.floor((Date.now() + Number(hours) * 3600_000) / 60_000) * 60_000;
      await this.page.locator(`#${FIELD_ID[field]}`).fill(seattleLocal(at));
      expected[FIELD_ID[field]] = new Date(at).toISOString();
    }
    this.data.expected = JSON.stringify(expected);
    await this.page.getByRole('button', { name: 'Save and continue' }).click();
    await expect(this.page).not.toHaveURL(/step=timeline/);
  }
);

Then('the election should have the new times', async function (this: E2EWorld) {
  const expected = JSON.parse(this.data.expected) as Record<string, string>;
  const { data } = await admin.from('elections').select(Object.keys(expected).join(', ')).eq('id', this.election!.id).single();
  for (const [field, iso] of Object.entries(expected)) {
    expect(Date.parse((data as unknown as Record<string, string>)[field]), field).toBe(Date.parse(iso));
  }
});

When('I rename the position {string} to {string}', async function (this: E2EWorld, from: string, to: string) {
  await this.page.goto(`/admin/elections/${this.election!.id}/edit?step=ballot`);
  const inputs = this.page.locator('input[id^="position-"][id$="-title"]');
  const titles = await inputs.evaluateAll((els) => els.map((e) => (e as HTMLInputElement).value));
  await inputs.nth(titles.indexOf(from)).fill(to);
  await this.page.getByRole('button', { name: 'Save and continue' }).click();
  await expect(this.page).toHaveURL(/step=timeline/);
});

When('I remove the position {string}', async function (this: E2EWorld, title: string) {
  await this.page.goto(`/admin/elections/${this.election!.id}/edit?step=ballot`);
  const titles = await this.page.locator('input[id^="position-"][id$="-title"]').evaluateAll((els) => els.map((e) => (e as HTMLInputElement).value));
  await this.page.getByRole('button', { name: `Remove position ${titles.indexOf(title) + 1}` }).click();
  await this.page.getByRole('button', { name: 'Save and continue' }).click();
});

Then('the candidates should stand for {string}', async function (this: E2EWorld, position: string) {
  const { data } = await admin.from('candidates').select('position').eq('election_id', this.election!.id);
  expect(new Set((data ?? []).map((c) => c.position))).toEqual(new Set([position]));
});

When("I try to edit the election's dates", async function (this: E2EWorld) {
  await this.page.goto(`/admin/elections/${this.election!.id}/edit?step=timeline`);
});

Then("I should be on the election's admin page", async function (this: E2EWorld) {
  await expect(this.page).toHaveURL(new RegExp(`/admin/elections/${this.election!.id}$`));
});
