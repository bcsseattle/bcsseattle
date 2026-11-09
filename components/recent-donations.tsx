'use client';

import { Donation } from '@/types';
import { CardHeader, CardTitle } from './ui/card';
import { StatTile } from './ui/stat-tile';
import DonationTable from './donations/donation-table';
import { purposeTitleMap } from '@/utils/helpers';
import { formatMoney } from '@/utils/format';

export default function RecentDonations({
  donations = [],
  showTitle = true
}: {
  donations: Donation[];
  /** False inside a Panel that has its own title. */
  showTitle?: boolean;
}) {
  const totalDonationsForEachPurpose = donations.reduce(
    (
      acc: {
        [key: string]: {
          title: string | null;
          total: number;
          donations: Donation[];
        };
      },
      donation
    ) => {
      if (acc[String(donation.purpose)]) {
        acc[String(donation.purpose)].total += donation.donation_amount;
        acc[String(donation.purpose)].donations.push(donation);
      } else {
        acc[String(donation.purpose)] = {
          title: purposeTitleMap[String(donation.purpose)] || donation.purpose,
          total: donation.donation_amount,
          donations: [donation]
        };
      }
      return acc;
    },
    {}
  );

  return (
    <div className={showTitle ? 'my-6' : 'flex flex-col gap-4 p-4'}>
      {showTitle && (
        <CardHeader>
          <CardTitle>Recent Donations</CardTitle>
        </CardHeader>
      )}
      {/* Totals per purpose, as StatTiles. */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Object.keys(totalDonationsForEachPurpose).map((purpose) => {
          const { title, total } = totalDonationsForEachPurpose[purpose];
          return <StatTile key={purpose} label={title ?? purpose} value={formatMoney(total)} />;
        })}
      </div>
      <DonationTable data={donations} />
    </div>
  );
}
