'use client';

import React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ContactFormSchema } from '@/types';
import Link from 'next/link';
import { sendEmail } from '@/utils/auth-helpers/server';

// h1 on /contact-us, h2 as a section of the home page (BUG-051). `compact` is the
// home page's form card (Figma 4:216): the section supplies the heading, and
// Send message is Secondary because the header's Donate is that page's primary.
export default function ContactForm({ heading = 'h2', compact = false }: { heading?: 'h1' | 'h2'; compact?: boolean }) {
  const router = useRouter();
  const form = useForm<z.infer<typeof ContactFormSchema>>({
    resolver: zodResolver(ContactFormSchema),
    // Empty strings, not undefined, so zod reports "Name is required" rather than "Required" (BUG-075).
    defaultValues: { name: '', email: '', message: '' }
  });

  async function onSubmit(values: z.infer<typeof ContactFormSchema>) {
    const res = await sendEmail(values);
    router.push(res);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card className={compact ? 'p-6' : 'mt-4'}>
          {!compact && (
            <CardHeader>
              <CardTitle as={heading}>Contact us</CardTitle>
              <CardDescription>Send us a message and we&apos;ll get back to you shortly.</CardDescription>
            </CardHeader>
          )}
          <CardContent className={compact ? 'flex flex-col gap-4 p-0' : 'flex flex-col gap-4'}>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="name">Name</FormLabel>
                    <FormControl>
                      <Input {...field} id="name" autoComplete="name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="email">Email</FormLabel>
                    <FormControl>
                      <Input {...field} id="email" autoComplete="email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="message">Message</FormLabel>
                  <FormControl>
                    <Textarea {...field} id="message" rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex items-center justify-end gap-2">
              {!compact && (
                <Button variant="ghost" asChild>
                  <Link href="/">Cancel</Link>
                </Button>
              )}
              <Button variant={compact ? 'outline' : 'default'} type="submit">
                Send message
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </Form>
  );
}
