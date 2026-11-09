// Writes e2e/.env.e2e: the env for the app server under test AND the suite.
// Supabase values come from the running e2e stack; Stripe *test* keys come from
// STRIPE_TEST_SECRET_KEY / STRIPE_TEST_PUBLISHABLE_KEY (CI) or, locally, from
// .env.local when they are test-mode keys. Mail/SMS/Notion are blanked on purpose.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const status = execFileSync('node_modules/.bin/supabase', ['status', '-o', 'env', '--workdir', 'e2e'], {
  encoding: 'utf8',
});
const sb = Object.fromEntries(
  [...status.matchAll(/^([A-Z_]+)="?(.*?)"?$/gm)].map((m) => [m[1], m[2]])
);

function fromEnvLocal(name) {
  if (!existsSync('.env.local')) return undefined;
  // Regex instead of a dotenv parser: .env.local may contain lines a parser rejects.
  const m = readFileSync('.env.local', 'utf8').match(new RegExp(`^${name}="?([^"\\n]+)"?`, 'm'));
  return m?.[1];
}

const stripeSecret = process.env.STRIPE_TEST_SECRET_KEY ?? fromEnvLocal('STRIPE_SECRET_KEY');
const stripePublishable =
  process.env.STRIPE_TEST_PUBLISHABLE_KEY ?? fromEnvLocal('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY');

if (!stripeSecret?.startsWith('sk_test_') || !stripePublishable?.startsWith('pk_test_')) {
  console.error('Need Stripe TEST keys: set STRIPE_TEST_SECRET_KEY and STRIPE_TEST_PUBLISHABLE_KEY.');
  process.exit(1);
}

const env = {
  E2E_BASE_URL: 'http://localhost:3100',
  NEXT_PUBLIC_SITE_URL: 'http://localhost:3100',
  NEXT_PUBLIC_SUPABASE_URL: sb.API_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: sb.ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: sb.SERVICE_ROLE_KEY,
  E2E_MAILPIT_URL: sb.INBUCKET_URL ?? 'http://127.0.0.1:57324',
  STRIPE_SECRET_KEY: stripeSecret,
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: stripePublishable,
  // We sign webhook events ourselves, so any fixed value works.
  STRIPE_WEBHOOK_SECRET: 'whsec_e2e_local_signing_secret',
  SUPABASE_DEFAULT_PASSWORD: 'e2e-default-password',
  CRON_SECRET: 'e2e-cron-secret',
  // Resend's client throws at import without a key; this one can never send.
  RESEND_API_KEY: 're_e2e_dummy_never_sends',
  // STRIPE_*_LIVE must stay *unset*, not blank: the app reads `LIVE ?? TEST`, so
  // an empty LIVE value would win. e2e/scripts/next.mjs refuses to run if one is set.
  // Blank = these integrations are off. Empty values also stop Next from
  // loading the real ones from .env / .env.local (it only fills undefined vars).
  MY_EMAIL: '',
  MY_PASSWORD: '',
  // Contact-form mail is delivered to the stack's Mailpit, never Gmail.
  SMTP_URL: 'smtp://127.0.0.1:57325',
  SEND_TO_EMAIL: 'contact@bcsseattle.test',
  TWILIO_ACCOUNT_SID: '',
  TWILIO_AUTH_TOKEN: '',
  TWILIO_PHONE_NUMBER: '',
  NOTION_TOKEN: '',
  NOTION_DATABASE_ID: '',
  STRIPE_BANK_ACCOUNT_ID: '',
  OLD_STRIPE_SECRET_KEY: '',
  PLAID_SECRET: '',
  PLAID_CLIENT_ID: '',
  NEXT_PUBLIC_MEASUREMENT_ID: '',
  NEXT_TELEMETRY_DISABLED: '1',
};

writeFileSync(
  'e2e/.env.e2e',
  Object.entries(env)
    .map(([k, v]) => `${k}=${v}`)
    .join('\n') + '\n'
);
console.log('Wrote e2e/.env.e2e');
