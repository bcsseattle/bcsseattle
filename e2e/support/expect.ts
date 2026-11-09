import { expect as base } from '@playwright/test';

/** Web-first assertions with the suite's default timeout. Import this, not @playwright/test's. */
export const expect = base.configure({ timeout: 10_000 });
