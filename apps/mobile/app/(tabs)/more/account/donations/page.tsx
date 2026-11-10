'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Download, Receipt } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { StatePanel } from '@/components/ui/state-panel';
import { ListGroup } from '@/components/portal/list-row';
import { formatDate, formatMoney } from '@/utils/format';
import { purposeTitleMap } from '@/utils/helpers';
import { Loaded, Screen } from '~/components/screen';
import { sharePdf } from '~/components/account/pdf';
import { must } from '~/lib/api';
import { useSession } from '~/lib/session';
import { supabase } from '~/lib/supabase';
import { useData } from '~/lib/use-data';

const STATUS = {
  completed: { label: 'Received', tone: 'green' },
  pending: { label: 'Pending', tone: 'orange' },
  failed: { label: 'Failed', tone: 'red' },
  refunded: { label: 'Refunded', tone: 'neutral' }
} as const;

/** Account › Donation history: the member's own gifts (their donor rows), newest first, each with its receipt. */
export default function DonationHistory() {
  const userId = useSession().session?.user.id;
  const state = useData(async () => {
    // Filtered to the member's donors: active members may read other people's public gifts.
    const donors = (await must(supabase.from('donors').select('id').eq('user_id', userId!))) ?? [];
    if (!donors.length) return [];
    const donations = await must(
      supabase
        .from('donations')
        .select('id, donation_amount, donation_date, donation_status, purpose, donation_description')
        .in(
          'donor_id',
          donors.map((d) => d.id)
        )
        .order('donation_date', { ascending: false })
    );
    return donations ?? [];
  }, [userId]);
  const [busy, setBusy] = useState<string>();

  const download = async (id: string, date: string) => {
    if (busy) return;
    setBusy(id);
    try {
      const error = await sharePdf(
        `/api/app/donations/${id}/pdf`,
        `BCS-Seattle-donation-${date.slice(0, 10)}.pdf`,
        'This receipt isn’t available yet. Receipts are ready once the gift has been received.'
      );
      if (error) toast.error(error);
    } catch {
      toast.error('The receipt couldn’t be saved. Please try again.');
    } finally {
      setBusy(undefined);
    }
  };

  return (
    <Screen title="Donation history" back={{ label: 'Account' }}>
      <Loaded state={state}>
        {(donations) =>
          donations.length === 0 ? (
            <StatePanel icon={Receipt} title="No gifts yet">
              Gifts you make while signed in appear here, with their receipts.
            </StatePanel>
          ) : (
            <ListGroup>
              <ul aria-label="Gifts">
                {donations.map((d) => {
                  const status = STATUS[d.donation_status];
                  const purpose = (d.purpose && purposeTitleMap[d.purpose]) || d.donation_description || 'General Purpose';
                  return (
                    <li key={d.id} className="flex min-h-14 items-center gap-3 border-b py-2 pl-4 pr-1 last:border-b-0">
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="text-sm font-medium text-foreground">{formatMoney(d.donation_amount)}</span>
                        <span className="truncate text-caption text-muted-foreground">
                          {purpose} · {formatDate(d.donation_date)}
                        </span>
                      </div>
                      <Badge tone={status.tone}>{status.label}</Badge>
                      {d.donation_status === 'completed' ? (
                        <button
                          type="button"
                          aria-label={`Receipt for ${formatMoney(d.donation_amount)} on ${formatDate(d.donation_date)}`}
                          disabled={busy === d.id}
                          onClick={() => download(d.id, d.donation_date)}
                          className="flex size-11 shrink-0 items-center justify-center rounded-md text-accent hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                        >
                          <Download aria-hidden className="size-4" />
                        </button>
                      ) : (
                        <span className="size-11 shrink-0" />
                      )}
                    </li>
                  );
                })}
              </ul>
            </ListGroup>
          )
        }
      </Loaded>
      <p className="text-caption text-muted-foreground">Receipts are available once a gift has been received.</p>
    </Screen>
  );
}
