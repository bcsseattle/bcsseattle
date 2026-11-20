import * as React from 'react';

import { cn } from '@/utils/cn';
import { type ExpenseItem, groupExpenseItems, sumExpenseItems } from '@/utils/expense-items';
import { formatMoney } from '@/utils/format';

const money = 'whitespace-nowrap py-1.5 text-right tabular-nums';

function ItemTable({ title, items }: { title: string; items: ExpenseItem[] }) {
  const groups = groupExpenseItems(items);
  const grouped = groups.some((g) => g.group);
  return (
    <table className="w-full self-start text-table">
      <caption className="pb-1 text-left text-overline uppercase text-muted-foreground">{title}</caption>
      <thead className="sr-only">
        <tr>
          <th scope="col">Item</th>
          <th scope="col">Amount</th>
        </tr>
      </thead>
      <tbody>
        {groups.map((g) => (
          <React.Fragment key={g.group}>
            {grouped && (
              <tr className="border-b font-medium">
                <th scope="row" className="py-1.5 pr-4 text-left font-medium">
                  {g.group || 'Other'}
                </th>
                <td className={money}>{formatMoney(g.subtotal)}</td>
              </tr>
            )}
            {g.items.map((item, i) => (
              <tr key={i} className={cn('border-b border-dashed', grouped && 'text-muted-foreground')}>
                <td className={cn('py-1.5 pr-4', grouped && 'pl-4')}>{item.label}</td>
                <td className={money}>{formatMoney(item.amount)}</td>
              </tr>
            ))}
          </React.Fragment>
        ))}
      </tbody>
      <tfoot>
        <tr className="font-medium">
          <th scope="row" className="py-1.5 pr-4 text-left font-medium">
            Total
          </th>
          <td className={money}>{formatMoney(sumExpenseItems(items))}</td>
        </tr>
      </tfoot>
    </table>
  );
}

/**
 * What opens under an expense row: the event's costs (with a subtotal per
 * group), what it brought in, and the difference. `cost` is the expense's
 * amount, used for the net when the costs weren't itemised.
 */
export function ExpenseBreakdown({ items, income, cost }: { items: ExpenseItem[]; income: ExpenseItem[]; cost: number }) {
  const both = items.length > 0 && income.length > 0;
  return (
    <div data-breakdown className={cn('ml-auto grid w-full gap-x-10 gap-y-4', both ? 'max-w-4xl md:grid-cols-2' : 'max-w-xl')}>
      {items.length > 0 && <ItemTable title="Costs" items={items} />}
      {income.length > 0 && (
        <>
          <ItemTable title="Income" items={income} />
          <p className={cn('mt-0 flex justify-between gap-4 border-t pt-2 text-table font-medium', both && 'md:col-span-2')}>
            <span>Net (income − costs)</span>
            <span className="whitespace-nowrap tabular-nums">{formatMoney(sumExpenseItems(income) - cost)}</span>
          </p>
        </>
      )}
    </div>
  );
}
