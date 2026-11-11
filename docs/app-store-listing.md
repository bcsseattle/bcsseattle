# BCS Seattle app: store listing and review answers

This is a draft to paste into App Store Connect and Play Console once the BCS Seattle organization accounts exist (`docs/mobile-app-gaps.md`, P7). It matches the app as built, the website's [privacy policy](https://www.bcsseattle.org/privacy) and the iOS privacy manifest (`apps/mobile/ios/App/App/PrivacyInfo.xcprivacy`). Edit the wording as you like, but keep the privacy answers in step with the policy.

## Listing

| Field | Draft |
|---|---|
| App name | **BCS Seattle** (iOS and Play, 30 characters max). If Apple says it's taken: "BCS Seattle Members". |
| Subtitle (iOS, 30) | Members, elections and giving |
| Short description (Play, 80) | Baloch Community Services of Seattle: membership, elections, giving and funds. |
| Category | iOS: **Lifestyle** (secondary: Social Networking). Play: **Social**. |
| Price | Free. No in-app purchases. |
| Availability | **United States only** (plan §4) |
| Age rating | 4+ / Everyone. No objectionable content; members can't message each other. |
| Support URL | https://www.bcsseattle.org/contact-us |
| Privacy policy URL | https://www.bcsseattle.org/privacy |
| Account deletion URL (Play) | https://www.bcsseattle.org/account-deletion |
| Copyright | © 2026 Baloch Community Services of Seattle |

**Description**

> The BCS Seattle app is for members and friends of Baloch Community Services of Seattle, a 501(c)(3) nonprofit.
>
> • **Membership:** apply to join, see your status and manage your contribution plan.
> • **Elections:** nominate candidates, read their statements, vote on leadership positions and community initiatives, and keep your confirmation codes. Results appear when voting closes.
> • **Giving:** give to BCS Seattle or to a community fundraiser. Payments are made securely with Stripe on the web.
> • **Community funds:** see where BCS Seattle's money comes from and where it goes.
> • **Receipts:** download contribution receipts for your taxes and donation receipts, and share or print them.
> • **Members and resources:** the member directory, and BCS programs such as the funeral and burial fund.
>
> Election reminders and payment notices arrive as notifications if you turn them on.

**Keywords (iOS, 100 characters):** `Baloch,BCS,Seattle,community,nonprofit,members,elections,vote,donate,fundraiser,funeral fund`

**Screenshots:** the iPhone 6.9" set is required (1320 × 2868). I'll capture Home, Elections and Ballot, Give, Funds and Account from the simulator with demo data once the listing exists.

## Apple: App Privacy ("nutrition label")

- **Tracking:** No. The app has no ads, no analytics and no third-party SDKs that track.
- **Data collected.** Every type below is **linked to the user**, **not used for tracking**, and used for **App Functionality** only:

| Apple category | What it is in the app |
|---|---|
| Contact Info › Name | account and membership application, donor name |
| Contact Info › Email Address | sign-in, receipts |
| Contact Info › Phone Number | membership application, donor details |
| Contact Info › Physical Address | membership application, donor details |
| Identifiers › User ID | the member's account ID |
| Purchases › Purchase History | contributions and donations (amounts, dates, purposes) |
| User Content › Photos or Videos | a candidate photo, when someone nominates |
| User Content › Other User Content | nomination statements, fundraiser comments |
| Other Data | ballot choices (kept so each member votes once; results are published as totals only) |

- **Not collected:** payment card or bank details (entered on Stripe's pages), location, contacts, browsing history, diagnostics, and usage data.
- **Decide before submitting:** Apple's **Sensitive Info** category includes "political opinion" and "racial or ethnic data". Ballot choices in BCS's own elections aren't political opinions in the usual sense, and the app collects no ethnicity, so I've listed votes under Other Data. If BCS reads either more broadly, add Sensitive Info here and in `PrivacyInfo.xcprivacy`.

## Google Play: Data safety

- **Data collected:** the same types as above (Personal info: name, email, phone, address, user IDs. Financial info: purchase history. Photos. Other user-generated content. Other: votes).
- **Shared with third parties:** No. Stripe and Supabase are service providers that process data for BCS, which Google doesn't count as sharing.
- **Encrypted in transit:** Yes.
- **Users can request deletion:** Yes, in the app (More › Account › Delete account) and at https://www.bcsseattle.org/account-deletion.
- **Purposes:** App functionality and Account management.

## App Review notes (paste into "Notes for review")

> BCS Seattle is the members' app of Baloch Community Services of Seattle, a 501(c)(3) nonprofit. It's distributed in the United States only.
>
> **Sign in:** the review account below is an approved, active member with a password (no email code needed).
>
> **Payments:** membership contributions and donations are paid on our website in Safari (Stripe Checkout), not in the app. Contributions are dues for a real-world community membership (3.1.3(e)). Donations go to a nonprofit and are collected outside the app (3.2.2(iv)). On the US storefront, linking out to pay is also allowed (3.1.1(a)). There are no in-app purchases.
>
> **Where things are:** Home, Give, Elections, Funds, and More (Account, Members, Resources). Account deletion: More › Account › Delete account. Deleting removes the account and personal data. Vote and donation records are kept without the link to the person, as the screen explains.
>
> **Elections are seasonal.** If none is open during review, the attached screen recording shows nominating, voting (both confirmation codes) and results from our staging site. We didn't create a fake election in production, because every member would see it.

**Review account (decision 8):** a production account that is an approved, active member with a password. It also needs a plan that doesn't charge: a 100%-off Stripe coupon, or a manual comped subscription. Fill in its email and password in App Store Connect's Sign-In Information, never in this file.
