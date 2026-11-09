'use client';

import React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from './card';
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

// h1 on /contact-us, h2 as a section of the home page (BUG-051).
export default function ContactForm({ heading = 'h2' }: { heading?: 'h1' | 'h2' }) {
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
        <Card className="max-w-screen py-4 mt-4">
          <CardHeader>
            <CardTitle as={heading}>Contact Us</CardTitle>
            <CardDescription>
              Send us a message and we'll get back to you shortly
            </CardDescription>
            <CardContent className="pl-0">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="name">Name</FormLabel>
                    <FormControl>
                      <Input {...field} id="name" />
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
                      <Input {...field} id="email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="message">Message</FormLabel>
                    <FormControl>
                      <Textarea {...field} id="message" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter>
              <div className="flex justify-between w-screen">
                <Button variant={'link'}>
                  <Link href="/">Cancel</Link>
                </Button>
                <Button variant={'default'} type="submit">
                  Send
                </Button>
              </div>
            </CardFooter>
          </CardHeader>
        </Card>
      </form>
    </Form>
  );
}
