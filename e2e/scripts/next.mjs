// `node e2e/scripts/next.mjs build|start`: runs Next against the e2e stack.
// It computes the env exactly as Next will (e2e/.env.e2e first, then Next's own
// .env* loading for anything still undefined) and refuses to run if that env
// could touch production data, live Stripe, or send real mail/SMS.
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const cmd = process.argv[2];
if (!['build', 'start'].includes(cmd)) {
  console.error('usage: node e2e/scripts/next.mjs build|start');
  process.exit(2);
}

process.loadEnvFile('e2e/.env.e2e');
// @next/env is a dependency of next, not of this repo, so resolve it from next.
const fromNext = createRequire(createRequire(import.meta.url).resolve('next/package.json'));
fromNext('@next/env').loadEnvConfig(process.cwd(), false, { info() {}, error: console.error });

const e = process.env;
const problems = [];
const isLocal = (url) => /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?(\/|$)/.test(url ?? '');
if (!isLocal(e.NEXT_PUBLIC_SUPABASE_URL)) problems.push('NEXT_PUBLIC_SUPABASE_URL is not local');
if (!isLocal(e.NEXT_PUBLIC_SITE_URL)) problems.push('NEXT_PUBLIC_SITE_URL is not local');
if (!e.STRIPE_SECRET_KEY?.startsWith('sk_test_')) problems.push('STRIPE_SECRET_KEY is not a test key');
if (!e.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.startsWith('pk_test_')) problems.push('Stripe publishable key is not a test key');
for (const k of Object.keys(e)) {
  if (/live/i.test(k) && e[k]) problems.push(`${k} is set`);
  if (/^(sk|rk)_live_/.test(e[k] ?? '')) problems.push(`${k} holds a live Stripe key`);
}
for (const k of ['MY_EMAIL', 'MY_PASSWORD', 'SEND_TO_EMAIL', 'TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'NOTION_TOKEN']) {
  if (e[k]) problems.push(`${k} must be empty`);
}
if (e.RESEND_API_KEY !== 're_e2e_dummy_never_sends') problems.push('RESEND_API_KEY must be the e2e dummy');

if (problems.length) {
  console.error('Refusing to run Next for e2e:\n  - ' + problems.join('\n  - '));
  console.error('Regenerate the env with `pnpm e2e:env`.');
  process.exit(1);
}

const args = cmd === 'start' ? ['start', '-p', '3100'] : ['build'];
const child = spawn('node_modules/.bin/next', args, { stdio: 'inherit', env: e });
child.on('exit', (code) => process.exit(code ?? 1));
