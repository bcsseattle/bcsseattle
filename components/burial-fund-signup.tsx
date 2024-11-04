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
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { PersonIcon } from '@radix-ui/react-icons';
import { Button } from './ui/button';
import { Link } from 'lucide-react';
import { FuneralFundFormSchema } from '@/types';
import { signUpFuneralBurial } from '@/utils/auth-helpers/server';
import { Input } from '@/components/ui/input';
import { Textarea } from './ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from './ui/select';

export default function BurialFundSignUp() {
  const router = useRouter();
  const form = useForm<z.infer<typeof FuneralFundFormSchema>>({
    resolver: zodResolver(FuneralFundFormSchema),
    defaultValues: {
      fullName: '',
      email: '',
      phoneNumber: '',
      additionalServices: 'Yes',
      additionalComments: ''
    }
  });

  async function onSubmit(values: z.infer<typeof FuneralFundFormSchema>) {
    const res = await signUpFuneralBurial(values);
    form.reset();
    router.push(res);
  }

  return (
    <section className="my-4">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card className="max-w-screen py-4 mt-4">
            <CardHeader>
              <CardTitle>Funeral & burial fund survey</CardTitle>
              <CardDescription>
                Please fill out this form to show your interest in getting dedicated grave lots at the cemetery. We want to get a sense of how many people are interested and how much each of us will need to contribute.
              </CardDescription>
              <CardContent className="pl-0">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="fullName">Full Name</FormLabel>
                      <FormControl>
                        <Input {...field} id="fullName" />
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
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="phoneNumber">Phone</FormLabel>
                      <FormControl>
                        <Input {...field} id="phoneNumber" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="additionalServices"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Should include Burial Expenss and Optional Services?
                      </FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Individual" {...field} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Yes">Yes</SelectItem>
                            <SelectItem value="No">No</SelectItem>
                            <SelectItem value="Not sure">Not sure</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="additionalComments"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="additionalComments">
                        Additional Comments
                      </FormLabel>
                      <FormControl>
                        <Textarea {...field} id="additionalComments" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
              <CardFooter>
                <div className="flex justify-between w-screen">
                  <Button variant={'default'} type="submit">
                    Submit
                  </Button>
                </div>
              </CardFooter>
            </CardHeader>
          </Card>
        </form>
      </Form>
    </section>
  );
}
