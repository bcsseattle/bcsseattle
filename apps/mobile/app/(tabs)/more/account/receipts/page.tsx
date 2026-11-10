'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Download } from 'lucide-react';
import { ListGroup } from '@/components/portal/list-row';
import { RowButton, Screen } from '~/components/screen';
import { sharePdf } from '~/components/account/pdf';

// The website's receipt form offers 2023 (the first year with online contributions) to this year.
const FIRST_YEAR = 2023;
const years = Array.from({ length: new Date().getFullYear() - FIRST_YEAR + 1 }, (_, i) => new Date().getFullYear() - i);

/** Account › Contribution receipts: one PDF per tax year, from the member's Stripe payments. */
export default function ContributionReceipts() {
  const [busy, setBusy] = useState<number>();

  const download = async (year: number) => {
    if (busy) return;
    setBusy(year);
    try {
      // The receipt route reads the year from ?taxYear= (no year means this year).
      const error = await sharePdf(
        `/api/app/receipts/contributions?taxYear=${year}`,
        `BCS-Seattle-contributions-${year}.pdf`,
        `There’s no receipt for ${year}: we found no contributions from you that year.`
      );
      if (error) toast.error(error);
    } catch {
      toast.error('The receipt couldn’t be saved. Please try again.');
    } finally {
      setBusy(undefined);
    }
  };

  return (
    <Screen title="Contribution receipts" back={{ label: 'Account' }}>
      <p className="text-body text-muted-foreground">
        A tax receipt lists your contributions for the year. Choose a year to save or share it.
      </p>
      <ListGroup>
        {years.map((year) => (
          <RowButton
            key={year}
            label={`Tax year ${year}`}
            value={busy === year ? 'Preparing…' : 'PDF'}
            icon={Download}
            onClick={() => download(year)}
          />
        ))}
      </ListGroup>
    </Screen>
  );
}
