import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function Page() {
  return (
    <section className="pb-8">
      <div className="max-w-3xl pt-8 lg:pt-16">
        <div className="flex flex-col">
          <h1 className="text-display text-foreground">
            Terms of Service
          </h1>
          <p className="mt-3 font-serif text-doc-lead text-foreground">
            Please refer to our bylaws.
          </p>
          <div className="mt-6">
            <Button variant="outline" asChild><Link
                href="/about-us/bylaws"
              >
                View Bylaws
              </Link></Button>
          </div>
        </div>
      </div>
    </section>
  );
}
