import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import Link from 'next/link';

export default function ProgramsAndServices() {
  return (
    <section className="max-w-screen-xl mx-auto text-zinc-600 py-4">
      <div>
        <h2 className="text-2xl font-extrabold text-center py-8">
          Our Programs & Services
        </h2>
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-1 lg:grid-cols-3">
          <Link href="/funeral-burial">
            <Card className="">
              <CardHeader className="text-xl">
                <CardTitle>Funeral & Burial</CardTitle>
                <CardDescription>Learn more</CardDescription>
              </CardHeader>
            </Card>
          </Link>
          <Link href="/youth-programs">
            <Card>
              <CardHeader>
                <CardTitle>Youth Programs</CardTitle>
                <CardDescription>Learn more</CardDescription>
              </CardHeader>
            </Card>
          </Link>
          <Link href="/resources">
            <Card>
              <CardHeader>
                <CardTitle>Resources</CardTitle>
                <CardDescription>Learn more</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>
      </div>
    </section>
  );
}
