'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '../card';
import { useRouter } from 'next/navigation';
import { Member } from '@/types';

const FormSchema = z.object({
  taxYear: z.preprocess((val) => {
    if (typeof val === 'string') {
      return parseInt(val);
    }

    return val;
  }, z.number().int().min(2023).max(new Date().getFullYear()))
});

const currentYear = new Date().getFullYear();
const startYear = 2023;

const taxYears = Array.from(
  { length: Math.max(1, currentYear - startYear + 1) },
  (_, i) => startYear + i
).sort((a, b) => b - a);

interface Props {
  member: Member;
}
export default function ReceiptForm({ member }: Props) {
  if (!member) return null;
  const router = useRouter();
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      taxYear: currentYear
    }
  });

  function onSubmit(data: z.infer<typeof FormSchema>) {
    router.push(
      `/account/${member.id}/contributions/pdf?taxYear=${data.taxYear}`
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contributions Receipt</CardTitle>
        <CardDescription>
          Download your tax receipt for the selected year.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="w-2/3 space-y-6"
          >
            <FormField
              control={form.control}
              name="taxYear"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tax Year</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={`${field.value}`}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a verified email to display" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {taxYears.map((year) => (
                        <SelectItem key={year} value={`${year}`}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription></FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit">Download</Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
