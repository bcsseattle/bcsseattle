import type { Metadata } from 'next';
import ContactForm from '@/components/ui/ctonact-form';

export const metadata: Metadata = { title: 'Delete your account | BCS Seattle' };

/**
 * How to delete a BCS Seattle account, and a request form for anyone who
 * can't use the app (Google Play requires a web path; plan §5.1).
 */
export default function AccountDeletionPage() {
  return (
    <section className="pb-8">
      <div className="max-w-3xl pt-8 lg:pt-16">
        <h1 className="text-display text-foreground">Delete your account</h1>
        <div className="mt-6 flex flex-col gap-4 text-body text-foreground">
          <p>
            <strong>In the BCS Seattle app:</strong> More › Account › Delete account. Confirm with your password or an
            email code, and the account is deleted straight away.
          </p>
          <div>
            <p className="font-semibold">What is deleted</p>
            <ul className="mt-1 list-disc pl-5">
              <li>Your sign-in, name, email, phone, address and profile.</li>
              <li>Your membership details and any open nominations.</li>
              <li>Your contribution plan, which is cancelled.</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold">What we keep, no longer linked to you</p>
            <ul className="mt-1 list-disc pl-5">
              <li>Votes you cast, so past election results don’t change. Ballots were always secret.</li>
              <li>
                Donation and payment records, which we must keep for tax and accounting. Payment processor records stay
                with Stripe under their retention rules.
              </li>
            </ul>
          </div>
          <p>
            <strong>Without the app:</strong> send the request below from the email you sign in with. We delete the
            account within 7 days and reply to confirm.
          </p>
        </div>
        <ContactForm
          title="Request account deletion"
          description="Use the email address you sign in with."
          defaultMessage="Please delete my BCS Seattle account."
        />
      </div>
    </section>
  );
}
