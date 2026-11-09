import type { Page } from '@playwright/test';
import { expect } from './expect';
import type { TestUser } from './db';

/** Signs in through the real password form, as a person would. */
export async function signInViaUi(page: Page, user: Pick<TestUser, 'email' | 'password'>, redirectTo?: string) {
  await page.goto(`/signin/password_signin${redirectTo ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ''}`);
  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Password').fill(user.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).not.toHaveURL(/\/signin/);
  await messageSettled(page);
}

/**
 * Server actions redirect with ?status=/?error=; the toaster then router.replace()s
 * those params away. Wait for that, or a following page.goto() can be interrupted
 * by the replace (WebKit does this reliably).
 */
export async function messageSettled(page: Page) {
  await expect(page).not.toHaveURL(/[?&](status|error)=/);
}

/** The Radix toaster renders `?status=` / `?error=` redirects as a toast. */
export function toast(page: Page, title: string) {
  return page.getByRole('status').filter({ hasText: title });
}
