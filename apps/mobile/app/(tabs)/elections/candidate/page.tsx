'use client';

import { useSearchParams } from 'next/navigation';
import { Award, CalendarDays, Vote } from 'lucide-react';
import { ListGroup, ListRow } from '@/components/portal/list-row';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { initials } from '@/components/ui/person-row';
import { formatDate } from '@/utils/format';
import { Loaded, Screen, Section } from '~/components/screen';
import { electionPhase } from '~/components/elections/election';
import { must } from '~/lib/api';
import { supabase } from '~/lib/supabase';
import { useData } from '~/lib/use-data';

/** A candidate: photo, position, bio and platform, and the election they stand in (List rows 13:2112). */
export default function CandidatePage() {
  const id = useSearchParams().get('id') ?? '';
  const state = useData(async () => {
    const candidate = await must(
      supabase.from('candidates').select('*').eq('id', id).maybeSingle()
    );
    if (!candidate) throw new Error('This candidate was not found.');
    const election = candidate.election_id
      ? await must(
          supabase
            .from('elections')
            .select('*')
            .eq('id', candidate.election_id)
            .maybeSingle()
        )
      : null;
    return { candidate, election };
  }, [id]);

  return (
    <Screen title={state.data?.candidate.full_name ?? 'Candidate'}>
      <Loaded state={state}>
        {({ candidate: c, election: e }) => (
          <>
            <div className="flex flex-col items-center gap-3 text-center">
              <Avatar className="size-24">
                {c.photo_url && (
                  <AvatarImage
                    src={c.photo_url}
                    alt=""
                    className="object-cover"
                  />
                )}
                <AvatarFallback className="text-xl font-semibold">
                  {initials(c.full_name)}
                </AvatarFallback>
              </Avatar>
              <h2 className="text-screen text-foreground">{c.full_name}</h2>
              <Badge tone="blue">
                <Award aria-hidden />
                Running for {c.position}
              </Badge>
            </div>

            {e && (
              <Section label="Election">
                <ListGroup>
                  <ListRow
                    label={e.title}
                    icon={Vote}
                    href={`/elections/view/?id=${e.id}`}
                  />
                  <ListRow
                    label="Voting"
                    icon={CalendarDays}
                    value={`${formatDate(e.start_date)} – ${formatDate(e.end_date)}`}
                  />
                  <ListRow
                    label="Status"
                    value={electionPhase(e).phase.label}
                  />
                </ListGroup>
              </Section>
            )}

            {c.bio && (
              <Section label="About the candidate">
                <p className="whitespace-pre-wrap rounded-lg border bg-card p-4 text-body text-foreground">
                  {c.bio}
                </p>
              </Section>
            )}
            {c.manifesto && (
              <Section label="Platform and vision">
                <p className="whitespace-pre-wrap rounded-lg border bg-card p-4 text-body text-foreground">
                  {c.manifesto}
                </p>
              </Section>
            )}
          </>
        )}
      </Loaded>
    </Screen>
  );
}
