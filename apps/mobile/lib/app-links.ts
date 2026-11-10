/**
 * Links that open the app: the custom scheme (org.bcsseattle.app://…) or a
 * universal link / App Link to the website's /m/ pages. Each one maps to a
 * screen, and email links also carry a token to verify. Anything else is
 * ignored. See docs/mobile-app-plan.md §3.3.
 */
const SCHEME = 'org.bcsseattle.app:';
const EMAIL_TYPES = ['email', 'magiclink', 'signup', 'invite', 'recovery', 'email_change'] as const;
export type EmailLinkType = (typeof EMAIL_TYPES)[number];

export type AppLink = { to: string; verify?: { tokenHash: string; type: EmailLinkType } };

export function parseAppLink(href: string, siteUrl: string): AppLink | null {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return null;
  }

  let path: string;
  if (url.protocol === SCHEME) path = `/${url.host}${url.pathname}`;
  else if (url.origin === new URL(siteUrl).origin && url.pathname.startsWith('/m/')) path = url.pathname.slice(2);
  else return null;
  path = path.replace(/\/+$/, '');
  const query = url.searchParams;

  if (path === '/auth/confirm') {
    const tokenHash = query.get('token_hash');
    const type = query.get('type') as EmailLinkType;
    if (!tokenHash || !EMAIL_TYPES.includes(type)) return null;
    const to = type === 'recovery' ? '/signin/new-password/' : type === 'email_change' ? '/account/' : '/home/';
    return { to, verify: { tokenHash, type } };
  }
  if (path === '/return/checkout') {
    const kind = query.get('kind');
    return { to: kind === 'donation' || kind === 'fundraiser' ? '/give/' : '/account/' };
  }
  if (path === '/return/portal') return { to: '/account/' };
  return null;
}
