/** @jest-environment jsdom */

import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Expenses } from '@/components/expenses';
import DonationTable from '@/components/donations/donation-table';
import { DataTable } from '@/components/funeral-burial/data-table';
import { columns as burialColumns } from '@/components/funeral-burial/columns';
import { LegacyElectionsTable } from '@/components/admin/elections/legacy-elections-table';
import MemberList from '@/components/member-list';
import type { Donation, Member } from '@/types';

const bodyRows = () => screen.getAllByRole('row').slice(1);
const names = (column = 0) =>
  bodyRows().map((row) => within(row).getAllByRole('cell')[column].textContent);

test('expense amounts sort numerically in both directions, then restore the original order', async () => {
  const user = userEvent.setup();
  const expenses = [
    { id: '1', payee: 'Middle', amount: 900, date: '2026-02-01' },
    { id: '2', payee: 'Largest', amount: 100000, date: '2025-12-01' },
    { id: '3', payee: 'Smallest', amount: 50, date: '2026-01-01' }
  ].map((expense) => ({
    category: 'General',
    created_at: null,
    currency: 'usd',
    description: null,
    is_private: false,
    payment_method: null,
    ...expense
  }));
  render(<Expenses expenses={expenses} />);
  await user.click(screen.getByRole('button', { name: /^Amount/ }));
  expect(names(2)).toEqual(['Smallest', 'Middle', 'Largest']);
  expect(screen.getByRole('columnheader', { name: /^Amount/ })).toHaveAttribute(
    'aria-sort',
    'ascending'
  );
  await user.click(screen.getByRole('button', { name: /^Amount/ }));
  expect(names(2)).toEqual(['Largest', 'Middle', 'Smallest']);
  await user.click(screen.getByRole('button', { name: /^Amount/ }));
  expect(names(2)).toEqual(['Middle', 'Largest', 'Smallest']);
  await user.click(screen.getByRole('button', { name: /^Date/ }));
  expect(names(2)).toEqual(['Largest', 'Smallest', 'Middle']);
  expect(expenses.map((e) => e.id)).toEqual(['1', '2', '3']);
});

test('donation sorting applies to all pages and headers work from the keyboard', async () => {
  const user = userEvent.setup();
  const data = [900, 100000, 20, 400, 50, 10].map((amount, i) => ({
    id: String(i),
    donorName: `Donor ${amount}`,
    amount,
    date: '2026-01-01',
    donation_status: 'completed'
  })) as unknown as Donation[];
  render(<DonationTable data={data} />);
  expect(
    within(screen.getAllByRole('row')[0]).getAllByRole('button')
  ).toHaveLength(7);
  screen.getByRole('button', { name: /^Amount/ }).focus();
  await user.keyboard('{Enter}');
  expect(names()).toEqual([
    'Donor 10',
    'Donor 20',
    'Donor 50',
    'Donor 400',
    'Donor 900'
  ]);
  await user.click(screen.getByRole('button', { name: 'Next page' }));
  expect(names()).toEqual(['Donor 100000']);
  await user.click(screen.getByRole('button', { name: /^Amount/ }));
  expect(await screen.findByText('Donor 100000')).toBeInTheDocument();
  expect(names()[0]).toBe('Donor 100000');
});

test('burial payment columns sort raw currency amounts', async () => {
  const user = userEvent.setup();
  render(
    <DataTable
      columns={burialColumns}
      data={[
        { id: '1', full_name: 'Large', initial_payment: 100000 },
        { id: '2', full_name: 'Small', initial_payment: 900 }
      ]}
    />
  );
  expect(
    within(screen.getAllByRole('row')[0]).getAllByRole('button')
  ).toHaveLength(8);
  await user.click(screen.getByRole('button', { name: /^Initial payment/ }));
  expect(names()).toEqual(['Small', 'Large']);
});

test('election data columns sort while action links remain usable', async () => {
  const user = userEvent.setup();
  render(
    <LegacyElectionsTable
      elections={[
        {
          id: '1',
          title: 'Zulu',
          start_date: '2026-01-01',
          end_date: '2026-02-01',
          status: 'Closed'
        },
        {
          id: '2',
          title: 'Alpha',
          start_date: '2026-02-01',
          end_date: '2026-03-01',
          status: 'Open'
        }
      ]}
    />
  );
  expect(
    within(screen.getByRole('columnheader', { name: 'Links' })).queryByRole(
      'button'
    )
  ).toBeNull();
  await user.click(screen.getByRole('button', { name: /^Election/ }));
  expect(names()).toEqual(['Alpha', 'Zulu']);
  expect(
    within(bodyRows()[0]).getByRole('link', { name: 'View' })
  ).toHaveAttribute('href', '/elections/2');
});

test('member family sizes sort numerically and missing cities stay last', async () => {
  const user = userEvent.setup();
  render(
    <MemberList
      subscriptions={[]}
      members={
        [
          { id: '1', fullName: 'Large', city: null, totalMembersInFamily: 10 },
          {
            id: '2',
            fullName: 'Small',
            city: 'Seattle',
            totalMembersInFamily: 2
          },
          {
            id: '3',
            fullName: 'Middle',
            city: 'Bellevue',
            totalMembersInFamily: 3
          }
        ] as Member[]
      }
    />
  );
  expect(
    within(screen.getAllByRole('row')[0]).getAllByRole('button')
  ).toHaveLength(7);
  await user.click(screen.getByRole('button', { name: /^Members in Family/ }));
  expect(names(1)).toEqual(['Small', 'Middle', 'Large']);
  await user.click(screen.getByRole('button', { name: /^City/ }));
  expect(names(1)).toEqual(['Middle', 'Small', 'Large']);
  await user.click(screen.getByRole('button', { name: /^City/ }));
  expect(names(1)).toEqual(['Small', 'Middle', 'Large']);
});

jest.mock('@/components/admin/MemberApprovalActions', () => ({
  __esModule: true,
  default: () => <button type="button">Review member</button>
}));
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => '/funds'
}));

import { MembersTable } from '@/components/admin/members-table';
import { DataTable as PaymentsTable } from '@/components/payments/data-table';
import { columns as paymentColumns } from '@/components/payments/columns';
import DonationReceipts from '@/components/ui/AccountForms/DonationReceiptForm';

test('admin member search and tabs retain the selected sort', async () => {
  const user = userEvent.setup();
  const members = [
    {
      id: '1',
      fullName: 'Zara',
      state: 'pending',
      created_at: '2026-01-01',
      email: 'z@example.com'
    },
    {
      id: '2',
      fullName: 'Adam',
      state: 'active',
      created_at: '2026-02-01',
      email: 'a@example.com'
    },
    {
      id: '3',
      fullName: 'Ben',
      state: 'active',
      created_at: '2026-03-01',
      email: 'b@example.com'
    }
  ] as React.ComponentProps<typeof MembersTable>['members'];
  render(<MembersTable members={members} />);
  expect(names()[0]).toContain('Zara');
  await user.click(screen.getByRole('button', { name: /^Member Sort/ }));
  expect(names().map((s) => s?.split('@')[0])).toEqual([
    'AAdama',
    'BBenb',
    'ZZaraz'
  ]);
  await user.click(screen.getByRole('tab', { name: /^Active/ }));
  expect(bodyRows()).toHaveLength(2);
  await user.type(screen.getByRole('searchbox'), 'Ben');
  expect(bodyRows()).toHaveLength(1);
  expect(names()[0]).toContain('Ben');
  await user.clear(screen.getByRole('searchbox'));
  expect(names()[0]).toContain('Adam');
});

test('contribution sorting handles missing directory members and chronological dates', async () => {
  const user = userEvent.setup();
  render(
    <PaymentsTable
      columns={paymentColumns}
      data={[
        {
          id: '1',
          member: { id: 'm1', fullName: 'Zara', totalMembersInFamily: 10 },
          amount: 100000,
          date: '2026-01-01T12:00:00Z'
        },
        {
          id: '2',
          member: undefined,
          amount: 50,
          date: '2025-12-01T12:00:00Z'
        },
        {
          id: '3',
          member: { id: 'm3', fullName: 'Adam', totalMembersInFamily: 2 },
          amount: 900,
          date: '2026-02-01T12:00:00Z'
        }
      ]}
    />
  );
  expect(
    within(screen.getAllByRole('row')[0]).getAllByRole('button')
  ).toHaveLength(5);
  await user.click(screen.getByRole('button', { name: /^Member Sort/ }));
  expect(names()).toEqual(['Adam', 'Zara', 'Not in the directory']);
  await user.click(screen.getByRole('button', { name: /^Payment Date/ }));
  expect(names()).toEqual(['Not in the directory', 'Zara', 'Adam']);
});

test('donation receipts sort all data columns and keep action menus separate', async () => {
  const user = userEvent.setup();
  render(
    <DonationReceipts
      donations={
        [
          {
            id: '1',
            donation_description: 'Large',
            donation_amount: 100000,
            donation_date: '2026-01-01'
          },
          {
            id: '2',
            donation_description: 'Small',
            donation_amount: 900,
            donation_date: '2025-12-01'
          }
        ] as unknown as Donation[]
      }
    />
  );
  expect(
    within(screen.getAllByRole('row')[0]).getAllByRole('button')
  ).toHaveLength(3);
  await user.click(screen.getByRole('button', { name: /^Amount/ }));
  expect(names()).toEqual(['Small', 'Large']);
  expect(screen.getAllByRole('button', { name: 'Open menu' })).toHaveLength(2);
});
