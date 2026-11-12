import type { Metadata } from 'next';
import { Mail } from 'lucide-react';

import { buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Support | BCS Seattle',
  description:
    'Contact the BCS Seattle team for help with your account, membership, contributions, or the BCS Seattle app.'
};

const SUPPORT_EMAIL = 'info@bcsseattle.org';
const SUPPORT_LINK = `mailto:${SUPPORT_EMAIL}?subject=BCS%20Seattle%20support%20request`;

export default function SupportPage() {
  return (
    <section className="mx-auto max-w-3xl pb-8 pt-8 lg:pt-16">
      <h1 className="text-display text-foreground">BCS Seattle support</h1>
      <p className="mt-4 text-body text-muted-foreground">
        Need help with your account, membership, contributions, or the BCS
        Seattle app? Send our team an email.
      </p>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle as="h2">Email our team</CardTitle>
          <CardDescription>
            Tell us what you need help with, and we’ll reply to your email.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-start gap-4">
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="break-all rounded-sm text-item text-accent underline underline-offset-4 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {SUPPORT_EMAIL}
          </a>
          <a href={SUPPORT_LINK} className={buttonVariants()}>
            <Mail aria-hidden="true" className="size-4" />
            Email support
          </a>
          <p className="mt-0 text-sm text-muted-foreground">
            This opens your email app. You can also copy the address into your
            preferred email service.
          </p>
        </CardContent>
      </Card>

      <div className="mt-8">
        <h2 className="text-section text-foreground">What to include</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-body text-muted-foreground">
          <li>
            Your name and the email address associated with your account, if you
            have one.
          </li>
          <li>A description of what you need help with.</li>
          <li>Any relevant details, such as an error message or screenshot.</li>
        </ul>
      </div>
    </section>
  );
}
