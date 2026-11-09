import 'server-only';

// The /api/send-email/* endpoints are called only by this app's own server code.
// They require this header so outsiders can't send BCS-branded email (BUG-008).
// Same secret and scheme as the cron routes.
export const internalAuthHeader = () => ({ authorization: `Bearer ${process.env.CRON_SECRET}` });

export const isInternalRequest = (request: Request) =>
  !!process.env.CRON_SECRET &&
  request.headers.get('authorization') === `Bearer ${process.env.CRON_SECRET}`;
