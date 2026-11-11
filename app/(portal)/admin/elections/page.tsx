import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageHeader } from '@/components/portal/page-header';
import { ElectionsList, type ElectionListRow } from '@/components/admin/elections/elections-list';
import { createClient } from '@/utils/supabase/server';
import dayjs from '@/libs/dayjs';
import { formatDate, formatDeadline } from '@/utils/format';
import { ADMIN_TAB, electionPhase, keyDate, nextAction, validateTimeline, type NextAction } from '@/utils/elections/rules';
import { electionManagementEnabled } from './data';

// The admin layout already turns away anyone who isn't an admin.
export default async function AdminElectionsPage() {
  return (await electionManagementEnabled()) ? <ManageElections /> : <LegacyElections />;
}

/** Where each next action is done. Later phases add the nominations, ballot, voting and results tabs. */
const actionHref = (id: string, action: NextAction) =>
  action === 'finish_setup'
    ? `/admin/elections/${id}/edit?step=review`
    : action === 'preview'
      ? `/elections/${id}`
      : `/admin/elections/${id}`;

async function ManageElections() {
  const supabase = await createClient();
  const [{ data: elections }, { data: positions }, { data: initiatives }, { data: nominations }] = await Promise.all([
    supabase.from('elections').select('*').order('start_date', { ascending: false }),
    supabase.from('ballot_positions').select('election_id'),
    supabase.from('initiatives').select('election_id'),
    supabase.from('nominations').select('election_id').eq('status', 'submitted')
  ]);
  const count = (list: { election_id: string | null }[] | null, id: string) => (list ?? []).filter((r) => r.election_id === id).length;

  const rows: ElectionListRow[] = (elections ?? []).map((e) => {
    const p = electionPhase(e);
    const hasPositions = count(positions, e.id) > 0;
    // The list only needs to know whether a draft could be published; the
    // overview checks the rest (adminActions).
    const canPublish = (hasPositions || count(initiatives, e.id) > 0) && validateTimeline(e, { hasPositions }).valid;
    const next = nextAction(p.phase, { canPublish, nominationsToReview: count(nominations, e.id) });
    const date = keyDate(e, p.phase);
    return {
      id: e.id,
      title: e.title,
      type: e.type ?? 'leadership',
      tab: ADMIN_TAB[p.phase],
      phase: { label: p.label.admin, tone: p.label.tone },
      keyDate: date ? `${date.label} ${formatDeadline(date.at)}` : null,
      next: next && { label: next.label, href: actionHref(e.id, next.action) }
    };
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Elections"
        description="Create elections, run nominations and voting, and publish results. Times are Pacific."
        actions={
          <Link href="/admin/elections/new" className={buttonVariants()}>
            <Plus aria-hidden className="size-4" />
            New election
          </Link>
        }
      />
      <ElectionsList rows={rows} />
    </div>
  );
}

/** The read-only list shown until enableElectionManagement is on. */
async function LegacyElections() {
  const supabase = await createClient();
  const { data: elections } = await supabase
    .from('elections')
    .select('id, title, start_date, end_date')
    .order('start_date', { ascending: false });

  const now = dayjs.utc();
  const status = (e: { start_date: string; end_date: string }) =>
    now.isBefore(dayjs.utc(e.start_date)) ? 'Upcoming' : now.isAfter(dayjs.utc(e.end_date)) ? 'Closed' : 'Open';

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle>Election Management</CardTitle>
          <CardDescription>All elections, newest first.</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {elections?.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Election</TableHead>
                <TableHead>Voting period</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Links</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {elections.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">{e.title}</TableCell>
                  <TableCell>
                    {formatDate(e.start_date)} – {formatDate(e.end_date)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={status(e) === 'Open' ? 'default' : 'secondary'}>{status(e)}</Badge>
                  </TableCell>
                  <TableCell className="space-x-3 text-right">
                    <Link className="underline" href={`/elections/${e.id}`}>View</Link>
                    <Link className="underline" href={`/elections/${e.id}/results`}>Results</Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground">No elections yet.</p>
        )}
      </CardContent>
    </Card>
  );
}
