import { isCurrentUserAdmin } from '@/utils/auth-helpers/server';
import { createClient } from '@/utils/supabase/server';
import { checkFeatureFlag } from '@/utils/server-feature-flags';
import { candidateResultWord, initiativeResultWord } from '@/utils/elections/rules';

/**
 * The certified results as CSV: aggregates only (election_results), never
 * who voted for whom. Admins only; route handlers don't run the admin layout,
 * so the check is here.
 */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isCurrentUserAdmin()) || !(await checkFeatureFlag('enableElectionManagement'))) {
    return new Response('Not found', { status: 404 });
  }
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: election }, { data: rows }, { data: positions }, { data: candidates }, { data: initiatives }] = await Promise.all([
    supabase.from('elections').select('title, status').eq('id', id).maybeSingle(),
    supabase.from('election_results').select('*').eq('election_id', id),
    supabase.from('ballot_positions').select('id, title, display_order').eq('election_id', id).order('display_order'),
    supabase.from('candidates').select('id, full_name').eq('election_id', id),
    supabase.from('initiatives').select('id, title, ballot_order, response_type').eq('election_id', id).order('ballot_order')
  ]);
  if (!election || !rows?.length) return new Response('No certified results', { status: 404 });

  const cell = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [['Section', 'Position or initiative', 'Candidate', 'Votes', 'Yes', 'No', 'Abstain', 'Rank', 'Result', 'Note']];
  for (const p of positions ?? []) {
    for (const r of rows.filter((x) => x.ballot_position_id === p.id)) {
      const word = r.outcome === 'vacant' ? 'Vacant' : (candidateResultWord({ outcome: r.outcome, isTop: false, votes: 0, votingOpen: false }) ?? 'Not elected');
      lines.push(['Position', p.title, candidates?.find((c) => c.id === r.candidate_id)?.full_name ?? '', String(r.votes ?? ''), '', '', '', String(r.rank ?? ''), word, r.note ?? '']);
    }
  }
  for (const t of initiatives ?? []) {
    const r = rows.find((x) => x.initiative_id === t.id);
    if (!r) continue;
    if (t.response_type === 'choice' && Array.isArray(r.option_counts)) {
      for (const option of r.option_counts as { label?: unknown; count?: unknown }[]) {
        lines.push(['Initiative response', t.title, String(option.label ?? ''), String(option.count ?? 0), '', '', '', '', '', '']);
      }
      continue;
    }
    const { word } = initiativeResultWord({ outcome: r.outcome, note: r.note, yes: r.yes ?? 0, no: r.no ?? 0, votingOpen: false });
    lines.push(['Initiative', t.title, '', '', String(r.yes ?? 0), String(r.no ?? 0), String(r.abstain ?? 0), '', word, r.note ?? '']);
  }
  const filename = `${election.title.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-') || 'election'}-results.csv`;
  return new Response(lines.map((l) => l.map(cell).join(',')).join('\r\n') + '\r\n', {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store'
    }
  });
}
