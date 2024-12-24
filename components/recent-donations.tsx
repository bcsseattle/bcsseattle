'use client';

import { Donation } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import DonationTable from './donations/donation-table';
import { DollarSign } from 'lucide-react';
import { getPriceString, purposeTitleMap } from '@/utils/helpers';

export default function RecentDonations({
  donations = []
}: {
  donations: Donation[];
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
    <div className="my-6">
      <CardHeader>
        <CardTitle>Recent Donations</CardTitle>
      </CardHeader>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Object.keys(totalDonationsForEachPurpose).map((purpose) => {
          const { title, total, donations } =
            totalDonationsForEachPurpose[purpose];
          return (
            <div key={title} className="mb-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{title}</CardTitle>
                  <DollarSign size={16} className="text-gray-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {getPriceString(total)}
                  </div>
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>
      <DonationTable data={donations} />
    </div>
  );
}
