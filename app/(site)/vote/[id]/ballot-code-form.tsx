'use client';

import { useActionState, useState } from 'react';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { sendBallotCode, verifyBallotCode, type CodeState } from './actions';

/** Email, then the code we send. The email stays in this form, never the URL. */
export function BallotCodeForm({ electionId }: { electionId: string }) {
  // One state for both steps: a form with a code checks it, one without sends it.
  const [state, act, pending] = useActionState<CodeState, FormData>(
    (prev, fd) => (fd.has('code') ? verifyBallotCode(electionId, prev, fd) : sendBallotCode(electionId, prev, fd)),
    {}
  );
  const [again, setAgain] = useState(false);

  // A wrong code keeps the code step; "Use a different email" goes back.
  const codeStep = !again && state.sent;
  const email = state.email ?? '';

  if (!codeStep) {
    return (
      <form action={(fd) => (setAgain(false), act(fd))} className="flex flex-col gap-4">
        {state.error && !state.sent && <Banner tone="error" title={state.error} />}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            placeholder="name@example.com"
            defaultValue={email}
            required
          />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? 'Sending…' : 'Send my code'}
        </Button>
      </form>
    );
  }

  return (
    <form action={act} className="flex flex-col gap-4">
      {state.error ? (
        <Banner tone="error" title={state.error} />
      ) : (
        <Banner tone="info" title="Check your email">
          If {email} is on the voter list, a code is on its way. It can take a minute.
        </Banner>
      )}
      <input type="hidden" name="email" value={email} />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="code">Code</Label>
        <Input
          id="code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9 ]*"
          placeholder="123456"
          required
          autoFocus
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? 'Checking…' : 'Open my ballot'}
      </Button>
      <Button type="button" variant="outline" onClick={() => setAgain(true)}>
        Use a different email
      </Button>
    </form>
  );
}
