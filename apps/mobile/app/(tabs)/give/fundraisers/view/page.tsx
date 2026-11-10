'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { SearchX } from 'lucide-react';
import { FundraiserProgress } from '@/components/fundraisers/fundraiser-progress';
import { MoneyList, MoneyRow } from '@/components/portal/money-row';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { StatePanel } from '@/components/ui/state-panel';
import { formatDate, formatMoney } from '@/utils/format';
import { ListGroup } from '@/components/portal/list-row';
import { Loaded, Screen, Section } from '~/components/screen';
import { FundraiserImage, categoryLabel, isOpen } from '~/components/give/fundraiser-card';
import { must } from '~/lib/api';
import { supabase } from '~/lib/supabase';
import { useData } from '~/lib/use-data';

async function loadFundraiser(id: string) {
  const [fundraiser, updates, donors] = await Promise.all([
    must(supabase.from('fundraisers').select('*').eq('id', id).maybeSingle()),
    must(
      supabase
        .from('fundraiser_updates')
        .select('id, content, created_at')
        .eq('fundraiser_id', id)
        .order('created_at', { ascending: false })
    ),
    // The donor wall, as the website's FundraiserDonors reads it: completed gifts only.
    must(
      supabase
        .from('fundraiser_donations')
        .select('id, amount, donor_name, message, created_at, is_anonymous')
        .eq('fundraiser_id', id)
        .eq('payment_status', 'completed')
        .order('created_at', { ascending: false })
    )
  ]);
  return fundraiser && { fundraiser, updates: updates ?? [], donors: donors ?? [] };
}

/** A fundraiser (the website's /fundraisers/[id]): progress, story, updates and donors; Donate starts the gift. */
export default function FundraiserView() {
  const id = useSearchParams().get('id') ?? '';
  const state = useData(() => loadFundraiser(id), [id]);

  return (
    <Screen title="Fundraiser" back={{ label: 'Fundraisers' }}>
      <Loaded state={state}>
        {(data) => {
          if (!data) {
            return (
              <StatePanel icon={SearchX} title="Fundraiser not found">
                It may have been removed. See the fundraisers that are open now.
              </StatePanel>
            );
          }
          const { fundraiser: f, updates, donors } = data;
          const open = isOpen(f);
          const category = categoryLabel(f.category);
          return (
            <>
              <div className="-mx-4 -mt-4">
                <FundraiserImage src={f.image_url} className="h-[240px]" />
              </div>
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  {category && <Badge tone="neutral">{category}</Badge>}
                  {!open && <Badge tone="neutral">Closed</Badge>}
                </div>
                <h2 className="text-screen text-foreground">{f.title}</h2>
                {f.beneficiary && <p className="mt-0 text-sm text-muted-foreground">For {f.beneficiary}</p>}
              </div>
              <FundraiserProgress currentAmount={f.current_amount ?? 0} goalAmount={f.goal_amount} />
              <p className="mt-0 text-caption text-muted-foreground">
                {f.ends_at ? `${open ? 'Ends' : 'Ended'} ${formatDate(f.ends_at)}` : 'No end date'}
                {f.minimum_donation ? ` · Smallest gift ${formatMoney(f.minimum_donation * 100)}` : ''}
              </p>
              {open ? (
                <Link
                  href={`/give/fundraisers/donate/?id=${f.id}`}
                  className={buttonVariants({ size: 'lg', className: 'w-full' })}
                >
                  Donate<span className="sr-only"> to {f.title}</span>
                </Link>
              ) : (
                <p className="mt-0 rounded-lg border bg-card px-4 py-3 text-sm text-foreground">
                  This fundraiser is no longer accepting donations.
                </p>
              )}
              {f.description && <p className="mt-0 whitespace-pre-line text-body text-foreground">{f.description}</p>}
              {updates.length > 0 && (
                <Section label="Updates">
                  <ListGroup>
                    {updates.map((u) => (
                      <article key={u.id} className="flex flex-col gap-1 border-b px-4 py-3 last:border-b-0">
                        <span className="text-caption text-muted-foreground">{formatDate(u.created_at)}</span>
                        <p className="mt-0 whitespace-pre-line text-sm text-foreground">{u.content}</p>
                      </article>
                    ))}
                  </ListGroup>
                </Section>
              )}
              <Section label="Donors">
                <ListGroup>
                  {donors.length ? (
                    <MoneyList label="Donors">
                      {donors.map((d) => (
                        <MoneyRow
                          key={d.id}
                          name={d.is_anonymous ? 'Anonymous donor' : d.donor_name || 'Anonymous donor'}
                          secondary={d.message || 'Gift'}
                          date={formatDate(d.created_at)}
                          amount={formatMoney((d.amount ?? 0) * 100)}
                        />
                      ))}
                    </MoneyList>
                  ) : (
                    <p className="mt-0 px-4 py-3 text-sm text-muted-foreground">No donations yet. Be the first to give.</p>
                  )}
                </ListGroup>
              </Section>
            </>
          );
        }}
      </Loaded>
    </Screen>
  );
}
