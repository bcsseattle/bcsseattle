import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface Props {}
export default function Hero({}: Props) {
  return (
    <section className="py-8 px-4 mx-auto max-w-screen-xl text-center lg:py-16 lg:px-12">
      <div className='flex flex-col items-center justify-center py-24 space-y-4 text-center'>
        <h1 className='text-3xl font-bold'>Baloch Community Services of Seattle</h1>
        <p className='mt-5 text-md'></p>
        <Link href="/about-us">
          <Button variant='default'>Learn more</Button>
        </Link>
      </div>
    </section>
  );
}
