'use client';

import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { toast } from 'sonner';
import { RowButton } from '~/components/screen';
import { checkPush, startPush, type PushState } from '~/lib/push';

const VALUE: Record<Exclude<PushState, 'unavailable'>, string> = { on: 'On', off: 'Off', blocked: 'Off in Settings' };

/**
 * Account › Notifications: election reminders and payment notices. Asking for
 * permission happens here, when the member chooses, never on launch. Once
 * decided, only the phone's Settings can change it, so the row says where.
 */
export function NotificationsRow() {
  const [state, setState] = useState<PushState>();
  useEffect(() => {
    checkPush().then(setState).catch(() => setState('unavailable'));
  }, []);
  if (!state || state === 'unavailable') return null;

  return (
    <RowButton
      label="Notifications"
      value={VALUE[state]}
      icon={Bell}
      onClick={async () => {
        if (state === 'off') return setState(await startPush(true));
        toast(
          state === 'on'
            ? 'To stop notifications, turn them off for BCS Seattle in your phone’s Settings.'
            : 'Notifications are off for BCS Seattle in your phone’s Settings. Turn them on there.'
        );
      }}
    />
  );
}
