import { expenseItems, formatExpenseItems, groupExpenseItems, parseExpenseItems } from '@/utils/expense-items';

describe('parseExpenseItems', () => {
  it('reads rows pasted from the event spreadsheet, in cents', () => {
    const { items, bad } = parseExpenseItems(
      ['Venue Rental Room 1\t$575.00', 'Venue Rental Room 2\t$488.75', '', 'Kabob Korner  $1,500.00', 'Forks/Spoons, 11.19'].join('\n')
    );
    expect(bad).toEqual([]);
    expect(items).toEqual([
      { label: 'Venue Rental Room 1', amount: 57500 },
      { label: 'Venue Rental Room 2', amount: 48875 },
      { label: 'Kabob Korner', amount: 150000 },
      { label: 'Forks/Spoons', amount: 1119 }
    ]);
  });

  it('takes a minus as a credit', () => {
    expect(parseExpenseItems('Venue deposit refund: -$200').items).toEqual([{ label: 'Venue deposit refund', amount: -20000 }]);
  });

  it('reports lines without an amount', () => {
    expect(parseExpenseItems('Tablecloths\nCups 26.42')).toEqual({
      items: [{ label: 'Cups', amount: 2642 }],
      bad: ['Tablecloths']
    });
  });
});

describe('groups', () => {
  const text = 'Tablecloths  33.61\nVenue:\nRoom 1  575.00\nDeposit refund  -200.00\nCatering:\nKabob Korner  1500.00';
  const { items, bad } = parseExpenseItems(text);

  it('puts items under the heading above them', () => {
    expect(bad).toEqual([]);
    expect(items.map((i) => i.group)).toEqual([undefined, 'Venue', 'Venue', 'Catering']);
  });

  it('subtotals each group, ungrouped items first', () => {
    expect(groupExpenseItems(items).map((g) => [g.group, g.subtotal])).toEqual([['', 3361], ['Venue', 37500], ['Catering', 150000]]);
  });

  it('formats back to the text it was read from, for editing', () => {
    expect(formatExpenseItems(items)).toBe(text);
  });
});

describe('expenseItems', () => {
  it('keeps well-formed items and ignores anything else', () => {
    expect(expenseItems(null)).toEqual([]);
    expect(expenseItems([{ label: 'A', amount: 1 }, { label: 'B' }, 'x'])).toEqual([{ label: 'A', amount: 1 }]);
  });
});
