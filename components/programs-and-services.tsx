import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import Link from 'next/link';

export default function ProgramsAndServices() {
  return (
    <section className="container mx-auto">
      <div className="">
        <h2 className="text-2xl font-extrabold text-center py-8">
          Our Programs & Services
        </h2>
        <div className="container mx-auto">
          <div className="flex flex-wrap lg:space-x-12">
            <div className="w-full md:w-1/2 lg:my-4 lg:w-1/3 mb-4">
              <Link href="/funeral-burial">
                <Card className="">
                  <CardHeader className="text-xl">
                    <CardTitle>Funeral & Burial</CardTitle>
                    <CardDescription>Learn more</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            </div>
            <div className="w-full md:w-1/2 lg:my-4 lg:w-1/4 mb-4">
              <Link href="/youth-programs">
                <Card>
                  <CardHeader>
                    <CardTitle>Youth Programs</CardTitle>
                    <CardDescription>Learn more</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            </div>
            <div className="w-full md:w-1/2 lg:my-4 lg:w-1/4 mb-4">
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
        </div>
      </div>
    </section>
  );
}
