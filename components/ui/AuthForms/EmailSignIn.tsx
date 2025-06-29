'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { signInWithEmail } from '@/utils/auth-helpers/server';
import { handleRequest } from '@/utils/auth-helpers/client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

// Define prop type with allowPassword boolean
interface EmailSignInProps {
  allowPassword: boolean;
  redirectMethod: string;
  disableButton?: boolean;
  redirectTo?: string;
}

export default function EmailSignIn({
  allowPassword,
  redirectMethod,
  disableButton,
  redirectTo
}: EmailSignInProps) {
  const router = redirectMethod === 'client' ? useRouter() : null;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    setIsSubmitting(true); // Disable the button while the request is being handled
    await handleRequest(e, signInWithEmail, router);
    setIsSubmitting(false);
  };

  return (
    <div className="my-8">
      <form
        noValidate={true}
        className="mb-4"
        onSubmit={(e) => handleSubmit(e)}
      >
        <div className="grid w-full items-center gap-4">
          <div className="flex flex-col space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              placeholder="name@example.com"
              type="email"
              name="email"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect="off"
            />
          </div>
          {redirectTo && (
            <input type="hidden" name="redirectTo" value={redirectTo} />
          )}
          <Button
            variant="default"
            type="submit"
            className="mt-1"
            disabled={disableButton || isSubmitting}
          >
            Send OTP Code
          </Button>
        </div>
      </form>
      {allowPassword && (
        <>
          <p>
            <Link 
              href={`/signin/password_signin${redirectTo ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ''}`} 
              className="font-light text-sm"
            >
              Sign in with email and password
            </Link>
          </p>
          <p>
            <Link 
              href={`/signin/signup${redirectTo ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ''}`} 
              className="text-orange-900 font-light text-sm"
            >
              Don't have an account? Sign up
            </Link>
          </p>
        </>
      )}
    </div>
  );
}
