'use client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { signInWithOAuth } from '@/utils/auth-helpers/client';
import { type Provider } from '@supabase/supabase-js';
import Google from '@/components/icons/Google';
import Facebook from '@/components/icons/Facebook';
import { useState, type JSX } from 'react';

type OAuthProviders = {
  name: Provider;
  displayName: string;
  icon: JSX.Element;
};

export default function OauthSignIn() {
  const oAuthProviders: OAuthProviders[] = [
    {
      name: 'google',
      displayName: 'Sign in with Google',
      icon: <Google className="h-8 w-8" />
    },
    {
      name: 'facebook',
      displayName: 'Sign in with Facebook',
      icon: <Facebook className="h-8 w-8" />
    }
    /* Add desired OAuth providers here */
  ];
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    setIsSubmitting(true); // Disable the button while the request is being handled
    await signInWithOAuth(e);
    setIsSubmitting(false);
  };

  return (
    <div className="mt-8">
      {oAuthProviders.map((provider) => (
        <form
          key={provider.name}
          className="pb-2"
          onSubmit={(e) => handleSubmit(e)}
        >
          <Input type="hidden" name="provider" value={provider.name} />
          {isSubmitting ? (
            <h1>Loading...</h1>
          ) : (
            <Button variant="outline" type="submit" className="w-full">
              <span className="mr-2">{provider.icon}</span>
              <span>{provider.displayName}</span>
            </Button>
          )}
        </form>
      ))}
    </div>
  );
}
