'use client';
import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { redirect } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { User } from '@supabase/supabase-js';
import { registerMember } from '@/utils/membership/handlers';
import { MemberRegistrationFormSchema } from '@/types';

// Define prop type with allowEmail boolean
interface RegisterFormProps {
  redirectMethod: string;
  user: User | null | undefined;
}

export default function RegisterForm({
  redirectMethod,
  user
}: RegisterFormProps) {
  const router = redirectMethod === 'client' ? useRouter() : null;

  const form = useForm<z.infer<typeof MemberRegistrationFormSchema>>({
    resolver: zodResolver(MemberRegistrationFormSchema),
    defaultValues: {
      fullName: user?.user_metadata.full_name || '',
      membershipType: 'Individual',
      totalMembersInFamily: 1,
      phone: user?.phone ?? '',
      address: '',
      address2: '',
      city: '',
      state: 'WA',
      zip: '',
      terms: false
    }
  });

  async function onSubmit(
    values: z.infer<typeof MemberRegistrationFormSchema>
  ) {
    const res = await registerMember(values);
    router?.push(res);
  }

  if (!user) {
    return redirect('/signin');
  }

  return (
    <div className="">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
          <FormField
            control={form.control}
            name="fullName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="Your full name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex">
            <FormField
              control={form.control}
              name="membershipType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Membership Type</FormLabel>
                  <FormControl>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Individual" {...field} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Individual">Individual</SelectItem>
                        <SelectItem value="Family">Family</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {form.watch('membershipType') === 'Family' && (
              <div className="flex-1 ml-4">
                <FormField
                  control={form.control}
                  name="totalMembersInFamily"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Members in Family</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="1" {...field} />
                      </FormControl>
                      <FormDescription>
                        Enter the number of family members aged 16 or older
                        (fees apply for up to 5 people; additional members are
                        free).
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
          </div>
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone</FormLabel>
                <FormControl>
                  <Input placeholder="123-456-7890" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Address</FormLabel>
                <FormControl>
                  <Input placeholder="Stree address, P.O. box" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="address2"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Address 2</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Apartment, suite, unit, building, floor"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex justify-between space-x-2">
            <div className="w-1/2">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input placeholder="Seattle" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="w-1/2">
              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <SelectTrigger className="">
                          <SelectValue placeholder="WA" {...field} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="WA">WA</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
          <FormField
            control={form.control}
            name="zip"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Zip</FormLabel>
                <FormControl>
                  <Input placeholder="98087" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="terms"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 py-4">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Accept terms and conditions</FormLabel>
                  <FormDescription className="flex">
                    You agree to our {'   '}
                    <Link href="/terms" className="text-primary ml-1">
                      terms of Service and Privacy Policy.
                    </Link>
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />
          <div className="flex justify-center">
            <Button
              type="submit"
              className="flex-1 mt-4"
              disabled={!form.watch('terms')}
            >
              Register as member
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
