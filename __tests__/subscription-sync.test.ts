import { manageSubscriptionStatusChange } from '@/utils/supabase/admin';

const mockRetrieve = jest.fn();
const mockUpsert = jest.fn();

jest.mock('@/utils/stripe/config', () => ({
  stripe: {
    subscriptions: { retrieve: (...args: unknown[]) => mockRetrieve(...args) }
  }
}));
jest.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (table: string) => {
      const response = {
        data: table === 'customers' ? { id: 'user1' } : [],
        error: null
      };
      const query = {
        select: () => query,
        eq: () => query,
        single: async () => response,
        update: () => query,
        upsert: (rows: unknown) => mockUpsert(table, rows),
        then: (resolve: (value: typeof response) => unknown) =>
          Promise.resolve(resolve(response))
      };
      return query;
    }
  })
}));

beforeEach(() => {
  mockUpsert.mockReset().mockResolvedValue({ error: null });
  mockRetrieve.mockReset();
});

test.each([4, undefined])(
  'subscription sync reads the family quantity from the Stripe item (%s)',
  async (quantity) => {
    mockRetrieve.mockResolvedValue({
      id: 'sub1',
      metadata: {},
      status: 'active',
      items: { data: [{ price: { id: 'price1' }, quantity }] },
      cancel_at_period_end: false,
      current_period_start: 1_783_456_789,
      current_period_end: 1_786_135_189,
      created: 1_783_456_789
    });
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await manageSubscriptionStatusChange('sub1', 'cus1');
      expect(mockUpsert).toHaveBeenCalledWith('subscriptions', [
        expect.objectContaining({
          user_id: 'user1',
          price_id: 'price1',
          quantity: quantity ?? 1
        })
      ]);
    } finally {
      log.mockRestore();
    }
  }
);
