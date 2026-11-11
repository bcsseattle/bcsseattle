import {
  safeRedirectPath,
  getPriceString,
  formatPhoneNumber,
  getSubscriptionInterval,
  getStatusRedirect
} from '@/utils/helpers';

describe('safeRedirectPath (BUG-032)', () => {
  it.each([
    ['/account', '/account'],
    ['account', '/account'],
    ['/elections/abc?tab=1', '/elections/abc?tab=1'],
    ['  /members  ', '/members']
  ])('keeps on-site path %p', (input, expected) => {
    expect(safeRedirectPath(input)).toBe(expected);
  });

  it.each(['//evil.example', '/\\evil.example', '', '   ', null, undefined])(
    'falls back for %p',
    (input) => {
      expect(safeRedirectPath(input as string | null | undefined, '/home')).toBe('/home');
    }
  );
});

describe('getPriceString (amounts in cents)', () => {
  it.each([
    [6000, '$60'],
    [4250, '$42.50'],
    [1999, '$19.99'],
    [50, '$0.50'],
    [0, '$0'],
    [100000000, '$1,000,000']
  ])('%p cents → %p', (cents, expected) => {
    expect(getPriceString(cents)).toBe(expected);
  });
});

describe('formatPhoneNumber', () => {
  it('formats a US number as E.164', () => {
    expect(formatPhoneNumber('(206) 555-0100')).toBe('+12065550100');
  });

  it('rejects an invalid number', () => {
    expect(() => formatPhoneNumber('123')).toThrow('Invalid phone number');
  });
});

describe('getSubscriptionInterval', () => {
  const price = (interval: string, interval_count: number) =>
    ({ interval, interval_count }) as Parameters<typeof getSubscriptionInterval>[0];

  it.each([
    [price('month', 1), 'Monthly'],
    [price('month', 6), 'Six Months'],
    [price('year', 1), 'Annual'],
    [price('week', 1), 'Unknown']
  ])('%o → %p', (p, expected) => {
    expect(getSubscriptionInterval(p)).toBe(expected);
  });
});

describe('getStatusRedirect', () => {
  it('adds the message to a path with or without a query', () => {
    expect(getStatusRedirect('/admin/elections', 'Done.')).toBe('/admin/elections?status=Done.');
    expect(getStatusRedirect('/admin/elections/e1?tab=nominations', 'Nomination approved.', 'On the ballot.')).toBe(
      '/admin/elections/e1?tab=nominations&status=Nomination%20approved.&status_description=On%20the%20ballot.'
    );
  });
});
