// Cucumber profiles. Run with: pnpm e2e [--profile <name>] [cucumber args]
// Known-bug scenarios carry @known-bug plus their @BUG-0xx id; they assert the
// *intended* behaviour, so they fail until the bug is fixed and are kept out of
// the gating runs. `pnpm e2e:bugs` runs only them (the live bug ledger).
// `not @known-bug` also keeps @poisons-server scenarios (all bug-tagged) out of the gating runs.
// Feature paths given on the CLI replace the default set (cucumber would merge them).
const cliPaths = process.argv.slice(2).some((a) => /\.feature(:\d+)*$|^e2e\/features/.test(a));

const common = {
  paths: cliPaths ? [] : ['e2e/features/**/*.feature'],
  requireModule: ['tsx/cjs'],
  require: ['e2e/support/**/*.ts', 'e2e/steps/**/*.ts'],
  format: [
    'progress-bar',
    'html:e2e/reports/cucumber.html',
    'json:e2e/reports/cucumber.json',
    'junit:e2e/reports/junit.xml',
  ],
  formatOptions: { snippetInterface: 'async-await' },
  parallel: Number(process.env.E2E_PARALLEL ?? 4),
  strict: true,
};

export default { ...common, tags: 'not @known-bug' };
export const smoke = { ...common, tags: '@smoke and not @known-bug' };
export const critical = { ...common, tags: '@critical and not @known-bug' };
export const bugs = { ...common, tags: '@known-bug and not @poisons-server' };
/**
 * Scenarios that leave the app server broken for every later request (BUG-073).
 * Run these alone, last, and restart the server afterwards.
 */
export const last = {
  ...common,
  parallel: 0,
  tags: '@poisons-server',
  // Own report files, so running it after `bugs` doesn't overwrite that report.
  format: ['progress-bar', 'html:e2e/reports/last.html', 'json:e2e/reports/last.json', 'junit:e2e/reports/last-junit.xml'],
};
/** Every scenario, bugs included: for local triage. */
export const all = { ...common };
