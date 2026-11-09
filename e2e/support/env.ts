import { existsSync } from 'node:fs';

// Loaded by every worker. CI exports the same variables instead of the file.
if (existsSync('e2e/.env.e2e')) process.loadEnvFile('e2e/.env.e2e');

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set. Run \`pnpm e2e:env\` first.`);
  return value;
}

export const env = {
  baseUrl: process.env.E2E_BASE_URL ?? 'http://localhost:3100',
  supabaseUrl: required('NEXT_PUBLIC_SUPABASE_URL'),
  anonKey: required('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  serviceRoleKey: required('SUPABASE_SERVICE_ROLE_KEY'),
  stripeSecretKey: required('STRIPE_SECRET_KEY'),
  stripeWebhookSecret: required('STRIPE_WEBHOOK_SECRET'),
  mailpitUrl: process.env.E2E_MAILPIT_URL ?? 'http://127.0.0.1:57324',
  browser: (process.env.BROWSER ?? 'chromium') as 'chromium' | 'firefox' | 'webkit',
  headed: Boolean(process.env.HEADED),
};

// Same guard as e2e/scripts/next.mjs, for the suite's own direct DB/Stripe calls.
if (!/^http:\/\/(127\.0\.0\.1|localhost)/.test(env.supabaseUrl)) {
  throw new Error('E2E suite refuses to run against a non-local Supabase.');
}
if (!env.stripeSecretKey.startsWith('sk_test_')) {
  throw new Error('E2E suite refuses to run with a non-test Stripe key.');
}
