import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function FundraiserNotFound() {
  return (
    <div className="container py-10">
      <div className="flex flex-col items-center justify-center space-y-4">
        <h1 className="text-4xl font-bold">Fundraiser Not Found</h1>
        <p className="text-muted-foreground">
          The fundraiser you&apos;re looking for doesn&apos;t exist or has been removed.
        </p>
        <Button asChild>
          <Link href="/fundraisers">View All Fundraisers</Link>
        </Button>
      </div>
    </div>
  );
}
