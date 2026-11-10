import { NextResponse } from 'next/server';
import { APP_ID, APP_LINK_PREFIX } from '@/utils/app-links';

/**
 * iOS universal links: /m/* opens the app (docs/mobile-app-plan.md §3.3).
 * APPLE_TEAM_ID comes from the Apple Developer account; until it is set there
 * is no app to point at, so this answers 404.
 */
export function GET() {
  const teamId = process.env.APPLE_TEAM_ID;
  if (!teamId) return new NextResponse(null, { status: 404 });

  return NextResponse.json({
    applinks: {
      details: [{ appIDs: [`${teamId}.${APP_ID}`], components: [{ '/': `${APP_LINK_PREFIX}*` }] }]
    }
  });
}
