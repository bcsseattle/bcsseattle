import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function Page() {
  return (
    <section className="mb-32">
      <div className="max-w-6xl px-4 py-8 mx-auto sm:px-6 sm:pt-24 lg:px-8">
        <div className="sm:align-center sm:flex sm:flex-col">
          <h1 className="text-4xl font-extrabold sm:text-center sm:text-5xl">
            Terms of Service
          </h1>
          <p className="mt-5 text-xl sm:text-2xl">
            Please refer to our bylaws.
          </p>
          <div className="mt-10 w-60 self-center">
            <Button variant="default">
              <Link
                href="/about-us/bylaws"
              >
                View Bylaws
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
