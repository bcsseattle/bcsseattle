'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { handleRequest } from '@/utils/auth-helpers/client';
import { verifyOtp } from '@/utils/auth-helpers/server';
import { Label } from '@radix-ui/react-label';

interface OTPVerifyProps {
  redirectMethod: string;
  disableButton?: boolean;
  email?: string;
  redirectTo?: string;
}

export default function OTPVerify({
  email,
  redirectMethod,
  disableButton,
  redirectTo
}: OTPVerifyProps) {
  const router = redirectMethod === 'client' ? useRouter() : null;
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    setLoading(true);
    await handleRequest(e, verifyOtp, router);
    setLoading(false);
  };

  return (
    <div className="my-8">
      <form
        className="mb-4"
        noValidate={true}
        onSubmit={(e) => handleSubmit(e)}
      >
        <div className="grid w-full items-center gap-4">
          <div className="flex flex-col space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              defaultValue={email}
              placeholder="name@example.com"
              type="email"
              name="email"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect="off"
              disabled={loading}
            />
          </div>
          <div className="flex flex-col space-y-1.5">
            <Label htmlFor="otp">OTP</Label>
            <Input
              id="otp"
              placeholder="123456"
              type="text"
              name="otp"
              autoCapitalize="none"
              autoComplete="one-time-code"
              autoCorrect="off"
              disabled={loading}
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
            />
          </div>
          {redirectTo && (
            <input type="hidden" name="redirectTo" value={redirectTo} />
          )}

          <Button
            variant="default"
            type="submit"
            className="mt-1"
            disabled={!otp && disableButton || loading}
          >
            {loading ? 'Loading...' : 'Verify Code'}
          </Button>
        </div>
      </form>
    </div>
  );
}
