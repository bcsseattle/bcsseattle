import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Member } from '@/types';
import Stripe from 'stripe';

export default function RecentFunds({
  payments = [],
  members = []
}: {
  payments?: Stripe.PaymentIntent[];
  members?: Member[];
}) {
  return (
    <div className="space-y-8">
      {payments?.map((payment) => {
        const member = members.find(
          (member) => member.customers?.stripe_customer_id === payment.customer
        );
        const paymentString = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: payment.currency!,
          minimumFractionDigits: 0
        }).format(payment?.amount / 100);
        return (
          <div className="flex items-center" key={payment.id}>
            <Avatar className="h-9 w-9">
              <AvatarImage src="/avatars/01.png" alt="Avatar" />
              <AvatarFallback>
                {payment?.description?.includes('Subscription') ? 'C' : 'M'}
              </AvatarFallback>
            </Avatar>
            <div className="ml-4 space-y-1">
              <p className="text-sm font-medium leading-none">
                {member?.fullName}
              </p>
              <p className="text-sm text-muted-foreground">
                {payment?.description?.includes('Subscription')
                  ? 'Contribution'
                  : 'Membership Fee'}
              </p>
            </div>
            <div className="ml-auto font-medium">{paymentString}</div>
          </div>
        );
      })}
    </div>
  );
}
