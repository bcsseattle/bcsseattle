// Prints one line per scenario from the last run's JSON report: status, tags, name, first error line.
import { readFileSync } from 'node:fs';
const report = JSON.parse(readFileSync('e2e/reports/cucumber.json', 'utf8'));
for (const feature of report) {
  for (const s of feature.elements ?? []) {
    const steps = s.steps.filter((st) => !st.hidden);
    const failed = steps.find((st) => st.result.status === 'failed');
    const status = failed ? 'FAIL' : steps.every((st) => st.result.status === 'passed') ? 'pass' : 'skip';
    const tags = s.tags.map((t) => t.name).filter((t) => /BUG|known/.test(t)).join(' ');
    const why = failed ? ` — ${failed.result.error_message.split('\n').find((l) => l.trim()).trim().slice(0, 140)}` : '';
    console.log(`${status}  ${tags.padEnd(22)} ${s.name}${why}`);
  }
}
