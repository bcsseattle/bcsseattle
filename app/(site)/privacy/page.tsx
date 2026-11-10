import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Privacy Policy | BCS Seattle',
  description: 'What BCS Seattle collects on bcsseattle.org and in the BCS Seattle app, why, who processes it, and your choices.'
};

const UPDATED = '9 Nov 2026';
const CONTACT = 'info@bcsseattle.org';

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4">
      <h2 id={id} className="text-screen text-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Item({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="text-item text-foreground">{title}</h3>
      <div className="mt-1 flex flex-col gap-2">{children}</div>
    </div>
  );
}

const List = ({ children }: { children: ReactNode }) => <ul className="list-disc space-y-1 pl-5">{children}</ul>;

const A = ({ href, children }: { href: string; children: ReactNode }) => (
  <Link href={href} className="text-accent underline underline-offset-4 hover:decoration-2">
    {children}
  </Link>
);

/**
 * Privacy policy for bcsseattle.org and the iOS and Android apps. It describes
 * what the code actually does; when collection or a service provider changes,
 * update this page and UPDATED.
 */
export default function PrivacyPage() {
  return (
    <section className="pb-12">
      <div className="max-w-3xl pt-8 lg:pt-16">
        <h1 className="text-display text-foreground">Privacy Policy</h1>
        <p className="mt-2 text-body text-muted-foreground">Last updated {UPDATED}</p>
        <p className="mt-4 font-serif text-doc-lead text-foreground">
          Baloch Community Services of Seattle (“BCS Seattle”, “we”) is a nonprofit in Seattle, Washington. This policy
          explains what we collect on bcsseattle.org and in the BCS Seattle app for iOS and Android, why we collect it,
          who processes it for us, and the choices you have.
        </p>

        <div className="mt-6 rounded-lg border bg-card p-4 text-body text-foreground">
          <p className="text-item">In short</p>
          <List>
            <li>We collect what we need to run membership, giving, elections and our programs.</li>
            <li>We don’t sell your information or use it for advertising.</li>
            <li>Card and bank details go straight to Stripe, our payment processor. We never see or store them.</li>
            <li>
              You can delete your account at any time: in the app, or on our{' '}
              <A href="/account-deletion">account deletion page</A>.
            </li>
          </List>
        </div>

        <div className="mt-10 flex flex-col gap-10 text-body text-foreground">
          <Section id="collect" title="What we collect">
            <Item title="Your account">
              <p>
                Your email address and password (stored only in scrambled, hashed form by our sign-in provider), and
                your name. If you sign in with an email code, we send the code to your email address.
              </p>
            </Item>
            <Item title="Membership application">
              <p>
                Your name, street address, city, state and ZIP code, phone number, membership type, the number of people
                in your family, and that you accepted our terms. Approval status and dates are recorded as we review it.
              </p>
            </Item>
            <Item title="Contributions and donations">
              <p>
                The amount, date, frequency and purpose of each payment or pledge, the payment method you chose (card,
                bank account, Zelle, check or cash), and the donor details you give us: name, email, phone and address.
                For fundraiser gifts, also your comment and whether you gave anonymously.
              </p>
              <p>
                Card and bank payments are entered on Stripe’s secure pages. Stripe gives us a record of the payment
                and your contribution plan, never your full card or bank account number.
              </p>
            </Item>
            <Item title="Elections">
              <p>
                If you nominate someone or are nominated: the candidate’s name, photo, statement and the position. When
                you vote: your ballot choices, kept with your account so that each member votes only once and receives a
                confirmation code.
              </p>
            </Item>
            <Item title="Funeral and burial fund sign-up">
              <p>Your name, email, phone number, the services you’re interested in, and any comments.</p>
            </Item>
            <Item title="Messages you send us">
              <p>
                Your name, email and message when you use the contact form or request account deletion. They reach us
                by email.
              </p>
            </Item>
            <Item title="How you use the website">
              <p>
                Pages visited, approximate location derived from your IP address, device and browser type, collected
                by Google Analytics and Vercel Web Analytics (see Cookies and analytics below).
              </p>
            </Item>
            <Item title="In the app">
              <List>
                <li>
                  Your sign-in session is stored in your device’s secure storage (the iOS Keychain, or encrypted
                  storage protected by the Android Keystore), not in ordinary app files.
                </li>
                <li>
                  If you allow notifications, we store your device’s push notification token so we can send election
                  reminders and payment notices. Turning notifications off in your device settings stops them.
                </li>
                <li>The app has no advertising, no analytics and no tracking across other apps or websites.</li>
                <li>
                  Receipts you save or share are created on your device and go only where you send them.
                </li>
              </List>
            </Item>
          </Section>

          <Section id="use" title="How we use it">
            <List>
              <li>To create and secure your account, and to review and manage memberships.</li>
              <li>To process contributions and donations, and to send receipts for your tax records.</li>
              <li>To run nominations and elections, prevent double voting and publish results.</li>
              <li>
                To contact you about your membership, payments and elections, by email, text message (for example, a
                reminder that a contribution payment failed) or app notification.
              </li>
              <li>To answer your messages, and to keep the funeral and burial fund list.</li>
              <li>To understand how the website is used and improve it.</li>
              <li>To meet our legal, tax and accounting obligations as a nonprofit.</li>
            </List>
          </Section>

          <Section id="members" title="What other members can see">
            <p>Some information is visible to approved, active members of BCS Seattle, and only to them:</p>
            <List>
              <li>
                <strong>The member directory:</strong> each member’s name, membership status, family size, the date
                they joined, and their total contributions.
              </li>
              <li>
                <strong>Donations:</strong> donations that weren’t marked anonymous or private, with the donor’s name.
              </li>
              <li>
                <strong>Elections:</strong> candidates’ names, photos and statements.
              </li>
            </List>
            <p>
              Fundraiser pages are public. If you give to a fundraiser, your name and comment can appear on its page
              unless you choose to give anonymously.
            </p>
            <p>
              <strong>Votes are secret.</strong> No other member can see how you voted, and results are published only as
              totals.
            </p>
          </Section>

          <Section id="share" title="Who processes it for us">
            <p>
              We use these service providers to run the website and the app. They process your information on our
              behalf and only for these purposes.
            </p>
            <List>
              <li>
                <strong>Supabase</strong>: our database, sign-in and file storage (candidate photos).
              </li>
              <li>
                <strong>Stripe</strong>: card and bank payments, contribution plans and payment records.
              </li>
              <li>
                <strong>Vercel</strong>: website hosting, and Vercel Web Analytics.
              </li>
              <li>
                <strong>Google</strong>: Google Analytics on the website, and the email account that receives contact
                form messages.
              </li>
              <li>
                <strong>Resend</strong>: account emails such as welcome messages and payment notices.
              </li>
              <li>
                <strong>Twilio</strong>: text messages, such as payment reminders.
              </li>
              <li>
                <strong>Apple and Google</strong>: delivery of app notifications, if you allow them.
              </li>
            </List>
            <p>
              We don’t sell or rent your information, and we don’t share it for advertising. We may disclose information
              if the law requires it, to protect the rights and safety of our members, or as part of our nonprofit’s
              required financial reporting.
            </p>
          </Section>

          <Section id="cookies" title="Cookies and analytics">
            <List>
              <li>
                <strong>Sign-in cookies</strong> keep you signed in on the website. They are necessary for the site to
                work.
              </li>
              <li>
                <strong>Google Analytics</strong> sets cookies to count visits and see which pages are used. You can block
                it with your browser’s cookie settings or Google’s{' '}
                <a
                  href="https://tools.google.com/dlpage/gaoptout"
                  className="text-accent underline underline-offset-4 hover:decoration-2"
                >
                  opt-out add-on
                </a>
                .
              </li>
              <li>
                <strong>Vercel Web Analytics</strong> counts page views without cookies.
              </li>
            </List>
            <p>The app uses none of these.</p>
          </Section>

          <Section id="keep" title="How long we keep it">
            <List>
              <li>Your account and membership details: until you delete your account.</li>
              <li>
                Payment and donation records: as long as tax and accounting rules require, even after you delete your
                account. They are then no longer linked to your account.
              </li>
              <li>
                Votes: kept so past election results don’t change. When you delete your account they are no longer
                linked to you.
              </li>
              <li>Messages and sign-ups: as long as we need them to respond or to run the program.</li>
            </List>
          </Section>

          <Section id="choices" title="Your choices">
            <List>
              <li>
                <strong>See and correct</strong> your name, email and membership details on your account page, or ask us.
              </li>
              <li>
                <strong>Delete your account</strong> in the app (More › Account › Delete account) or on our{' '}
                <A href="/account-deletion">account deletion page</A>. It explains what is deleted and what we have to
                keep.
              </li>
              <li>
                <strong>Stop text messages</strong> by replying STOP, and <strong>stop app notifications</strong> in your
                device settings.
              </li>
              <li>
                <strong>Ask us</strong> for a copy of the information we hold about you, or about anything in this
                policy, at <a href={`mailto:${CONTACT}`} className="text-accent underline underline-offset-4">{CONTACT}</a>.
              </li>
            </List>
          </Section>

          <Section id="security" title="Security">
            <p>
              Information travels over encrypted connections. Access to member data is limited by rules in our database,
              so members see only what this policy describes. Payments are handled by Stripe, and the app keeps your
              session in your device’s secure storage. No system is perfectly secure; if we learn of a breach that affects
              you, we will tell you as the law requires.
            </p>
          </Section>

          <Section id="children" title="Children">
            <p>
              Accounts are for adults. We don’t knowingly collect information from children under 13. A membership
              application records only how many people are in a family, not their details.
            </p>
          </Section>

          <Section id="changes" title="Changes to this policy">
            <p>
              When we change this policy we update the date at the top. If a change is significant, we’ll also let
              members know by email or in the app.
            </p>
          </Section>

          <Section id="contact" title="Contact us">
            <p>
              Baloch Community Services of Seattle, Seattle, Washington.
              <br />
              Email: <a href={`mailto:${CONTACT}`} className="text-accent underline underline-offset-4">{CONTACT}</a>
            </p>
          </Section>
        </div>
      </div>
    </section>
  );
}
