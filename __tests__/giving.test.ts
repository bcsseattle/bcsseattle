import { categoryLabel, dollars, isOpen, paidWith, percentRaised, viaStripe } from '@/utils/giving';

const nb = (s: string) => s.replace(/ /g, '\u00a0');

describe('fundraisers', () => {
  it('is open while active and before its end date; no end date is open-ended', () => {
    const past = new Date(Date.now() - 864e5).toISOString();
    const future = new Date(Date.now() + 864e5).toISOString();
    expect(isOpen({ status: 'active', ends_at: null })).toBe(true);
    expect(isOpen({ status: 'active', ends_at: future })).toBe(true);
    expect(isOpen({ status: 'active', ends_at: past })).toBe(false);
    expect(isOpen({ status: 'completed', ends_at: future })).toBe(false);
  });

  it('caps the share raised at 100', () => {
    expect(percentRaised({ current_amount: 2500, goal_amount: 10000 })).toBe(25);
    expect(percentRaised({ current_amount: 2100, goal_amount: 2000 })).toBe(100);
    expect(percentRaised({ current_amount: null, goal_amount: 2000 })).toBe(0);
  });

  it('capitalises the category', () => {
    expect(categoryLabel('emergency')).toBe('Emergency');
    expect(categoryLabel(null)).toBeNull();
  });
});

describe('gifts', () => {
  it('names the payment method as the receipt does', () => {
    expect(paidWith('us_bank_account')).toBe('Bank transfer');
    expect(paidWith('external')).toBe('Other');
    expect(paidWith(null)).toBe('Other');
  });

  it('pays card and bank transfer in Stripe only', () => {
    expect(['card', 'us_bank_account', 'zelle', 'check', 'cash'].filter(viaStripe)).toEqual(['card', 'us_bank_account']);
  });

  it('shows a typed amount, or a dash until it is one', () => {
    expect(dollars('250')).toBe(nb('USD 250.00'));
    expect(dollars('19.999')).toBe(nb('USD 20.00'));
    expect(dollars('')).toBe('—');
    expect(dollars('abc')).toBe('—');
  });
});
