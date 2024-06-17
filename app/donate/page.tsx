import { Button } from '@/components/ui/button';

export default function Page() {
  return (
    <section className="mb-32">
      <div className="max-w-6xl px-4 py-8 mx-auto sm:px-6 sm:pt-24 lg:px-8">
        <div className="sm:align-center sm:flex sm:flex-col">
          <h1 className="text-4xl font-extrabold sm:text-center sm:text-5xl">
            Donate
          </h1>
          <Button variant="default" className="mt-10 w-60 self-center">
            <a
              href="https://buy.stripe.com/00gg2g57M3XxemQ4gi"
              target="_blank"
              rel="noreferrer"
            >
              Donate
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}
