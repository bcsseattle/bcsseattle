import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { createClient } from '@/utils/supabase/server';
import dayjs from '@/libs/dayjs';
import { formatDate } from '@/utils/format';

// The admin layout already turns away anyone who isn't an admin.
export default async function AdminElectionsPage() {
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
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/voting-config">Voting configuration</Link>
          </Button>
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
