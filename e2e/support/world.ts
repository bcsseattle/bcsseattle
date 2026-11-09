import { setDefaultTimeout, setWorldConstructor, World, type IWorldOptions } from '@cucumber/cucumber';
import type { BrowserContext, Page } from '@playwright/test';
import type { TestUser } from './db';

setDefaultTimeout(60_000);

export class E2EWorld extends World {
  context!: BrowserContext;
  page!: Page;
  /** Personas created in this scenario, by name used in the feature ("the member", "Alice"). */
  users: Record<string, TestUser> = {};
  /** Who the browser is currently signed in as. */
  me?: TestUser;
  /** Records created for this scenario that later steps refer to. */
  election?: { id: string; candidates: { id: string; full_name: string; position: string }[]; initiatives: { id: string; title: string }[] };
  fundraiser?: { id: string; title: string; goal_amount: number; current_amount: number };
  donation?: { id: string; donor_email: string };
  checkoutSessionId?: string;
  response?: { status: number; body: string };
  /** Result of the last direct (public API) query, and the last API error message. */
  rows?: { data: unknown[] | null; error: { message: string } | null };
  apiError?: string;
  /** Free-form values passed between steps of one scenario. */
  data: Record<string, string> = {};
  /** Cleanup callbacks, run last-in-first-out after the scenario. */
  cleanup: Array<() => Promise<unknown>> = [];
  consoleErrors: string[] = [];
  failedRequests: string[] = [];
  /** Requests sent but not finished, with their start time; reported on failure. */
  pendingRequests = new Map<import('@playwright/test').Request, number>();

  constructor(options: IWorldOptions) {
    super(options);
  }

  user(name: string): TestUser {
    const u = this.users[name];
    if (!u) throw new Error(`No persona "${name}" was created in this scenario`);
    return u;
  }
}

setWorldConstructor(E2EWorld);
