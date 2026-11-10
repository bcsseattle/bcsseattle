import { formatDate, formatDeadline, formatMoney } from '@/utils/format';

const nb = (s: string) => s.replace(/ /g, ' ');

describe('formatMoney', () => {
  it('shows cents by default, with a non-breaking space after USD', () => {
    expect(formatMoney(100000)).toBe(nb('USD 1,000.00'));
    expect(formatMoney(1999)).toBe(nb('USD 19.99'));
  });

  it('never signs zero', () => {
    expect(formatMoney(-0)).toBe(nb('USD 0.00'));
  });

  it('drops cents for whole amounts', () => {
    expect(formatMoney(645000, { whole: true })).toBe(nb('USD 6,450'));
  });

  it('uses a true minus sign for negatives', () => {
    expect(formatMoney(-72000)).toBe(nb('−USD 720.00'));
  });
});

describe('formatDate', () => {
  it('reads a moment in Seattle time', () => {
    expect(formatDate('2026-11-14T20:00:00Z')).toBe('14 Nov 2026');
    // 02:00 UTC on the 15th is still the 14th in Seattle.
    expect(formatDate('2026-11-15T02:00:00Z')).toBe('14 Nov 2026');
  });

  it('keeps a bare date on its calendar day', () => {
    expect(formatDate('2026-11-14')).toBe('14 Nov 2026');
  });

  it('abbreviates September as Sep', () => {
    expect(formatDate('2026-09-14T20:00:00Z')).toBe('14 Sep 2026');
  });
});

describe('formatDeadline', () => {
  it('shows 24-hour time with PST or PDT', () => {
    expect(formatDeadline('2026-12-02T07:59:00Z')).toBe('1 Dec 2026, 23:59 PST');
    expect(formatDeadline('2026-07-01T06:59:00Z')).toBe('30 Jun 2026, 23:59 PDT');
  });
});
