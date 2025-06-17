'use client';

import React, { useState, useEffect } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { ElectionPosition, Member, NominateFormSchema } from '@/types';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
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
  FormMessage,
  FormDescription
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { nominateCandidate } from '@/utils/elections/handlers';
import { Upload, X, User, CheckCircle } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { compressImage } from '@/utils/image-compression';

type NominateFormInputs = z.infer<typeof NominateFormSchema>;

export default function NominateForm({
  electionId,
  userId,
  positions,
  member
}: {
  electionId: string;
  userId: string;
  positions: Array<ElectionPosition>;
  member: Member;
}) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [existingNomination, setExistingNomination] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const form = useForm<NominateFormInputs>({
    resolver: zodResolver(NominateFormSchema),
    defaultValues: {
      fullName: member?.fullName || '',
      position: 'President',
      bio: '',
      manifesto: '',
      photoFile: undefined
    }
  });

  // Check for existing nomination on component mount
  useEffect(() => {
    async function checkExistingNomination() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('candidates')
          .select('*')
          .eq('user_id', userId)
          .eq('election_id', electionId)
          .single();

        if (data && !error) {
          setExistingNomination(data);
        }
      } catch (err) {
        console.log('No existing nomination found');
      } finally {
        setLoading(false);
      }
    }

    checkExistingNomination();
  }, [userId, electionId]);

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
    field: any
  ) => {
    const file = event.target.files?.[0];

    if (!file) {
      // User cancelled file selection
      return;
    }

    console.log('Selected file:', {
      name: file.name,
      type: file.type,
      size: (file.size / 1024 / 1024).toFixed(2) + ' MB'
    });

    // Validate file type
    if (!file.type.startsWith('image/')) {
      form.setError('photoFile', {
        type: 'manual',
        message: 'Please select an image file'
      });
      return;
    }

    // Validate file size (before compression)
    if (file.size > 50 * 1024 * 1024) {
      // 50MB absolute max
      form.setError('photoFile', {
        type: 'manual',
        message: 'File is too large. Please select a smaller image.'
      });
      return;
    }

    try {
      // Show loading state (optional)
      console.log('Compressing image...');

      // Compress the image
      const compressedFile = await compressImage(file);

      console.log('Compressed file:', {
        name: compressedFile.name,
        type: compressedFile.type,
        size: (compressedFile.size / 1024 / 1024).toFixed(2) + ' MB'
      });

      // Verify compressed file is still a File instance
      if (!(compressedFile instanceof File)) {
        throw new Error('Compression failed - invalid file type');
      }

      // Set the compressed file to the form
      form.setValue('photoFile', compressedFile);

      // Clear any previous errors
      form.clearErrors('photoFile');

      // Create preview URL from compressed file
      const url = URL.createObjectURL(compressedFile);
      setPreviewUrl(url);
    } catch (error) {
      console.error('Error processing image:', error);
      form.setError('photoFile', {
        type: 'manual',
        message: 'Failed to process image. Please try a different image.'
      });
    }
  };

  const removeFile = (field: any) => {
    field.onChange(undefined);
    setPreviewUrl(null);
    // Reset file input
    const fileInput = document.getElementById('photoFile') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const handleSubmit = async (values: NominateFormInputs) => {
    console.log('Submit handler called with values:', values);
    setSubmitError(null);
    setSubmitting(true);

    try {
      const res = await nominateCandidate(
        {
          fullName: values.fullName,
          position: values.position,
          bio: values.bio,
          manifesto: values.manifesto,
          photoFile: values.photoFile
        },
        electionId,
        userId
      );

      form.reset();
      setPreviewUrl(null);
      router.push(res || '/elections/thank-you');
    } catch (err) {
      console.error('Error submitting nomination:', err);
      setSubmitError('Failed to submit nomination. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <section className="my-4 max-w-lg mx-auto">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Checking nomination status...</p>
          </CardContent>
        </Card>
      </section>
    );
  }

  // Show existing nomination if found
  if (existingNomination) {
    return (
      <section className="my-4 max-w-lg mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Already Nominated
            </CardTitle>
            <CardDescription>
              You have already submitted your nomination for this election.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-4">
                {existingNomination.photo_url ? (
                  <img
                    src={existingNomination.photo_url}
                    alt={existingNomination.full_name}
                    className="w-16 h-16 rounded-full object-cover border-2 border-green-200"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-green-200 flex items-center justify-center text-green-700 font-semibold">
                    {existingNomination.full_name
                      .split(' ')
                      .map((n: any) => n[0])
                      .join('')
                      .toUpperCase()}
                  </div>
                )}
                <div>
                  <h3 className="font-semibold text-green-900">
                    {existingNomination.full_name}
                  </h3>
                  <p className="text-green-700">
                    Running for {existingNomination.position}
                  </p>
                </div>
              </div>
              {existingNomination.bio && (
                <p className="mt-3 text-sm text-green-800">
                  {existingNomination.bio}
                </p>
              )}
            </div>

            <div className="text-sm text-gray-600 space-y-2">
              <p>
                <strong>Note:</strong> You can only nominate yourself for one
                position per election.
              </p>
              <p>
                If you need to make changes to your nomination, please contact
                the election administrator.
              </p>
            </div>
          </CardContent>

          <CardFooter>
            <div className="flex items-center justify-between w-full space-x-2">
              <Button
                onClick={() => router.push(`/elections/${electionId}`)}
                variant="outline"
                className="w-full"
              >
                Back to Election Details
              </Button>
            </div>
          </CardFooter>
        </Card>
      </section>
    );
  }

  // Show nomination form if no existing nomination
  return (
    <section className="my-4 max-w-lg mx-auto">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Nominate Yourself for Leadership</CardTitle>
              <CardDescription>
                Fill out the form below to nominate yourself for a leadership
                position.
                <br />
                <span className="text-amber-600 font-medium mt-2 block">
                  ⚠️ You can only nominate yourself for one position per
                  election.
                </span>
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
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
                name="position"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Position</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select position" />
                        </SelectTrigger>
                        <SelectContent>
                          {positions.map((item) => (
                            <SelectItem key={item.id} value={item.position}>
                              {item.position}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormDescription>
                      Choose carefully - you cannot change this after
                      submission.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="bio">
                      Short Bio{' '}
                      <span className="text-gray-400 text-sm font-normal">
                        (Optional)
                      </span>
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        id="bio"
                        rows={4}
                        placeholder="Tell voters about yourself and your background..."
                      />
                    </FormControl>
                    <FormDescription>
                      Share your background and experience (optional).
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="manifesto"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="manifesto">
                      Your Platform & Vision{' '}
                      <span className="text-gray-400 text-sm font-normal">
                        (Optional)
                      </span>
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        id="manifesto"
                        rows={5}
                        placeholder="What are you bringing to the table? Share your vision, goals, and specific initiatives you plan to implement in this role..."
                      />
                    </FormControl>
                    <FormDescription>
                      Describe your platform, vision, and what you plan to
                      accomplish in this role (optional).
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Photo Upload Field - This was missing! */}
              <FormField
                control={form.control}
                name="photoFile"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Profile Photo{' '}
                      <span className="text-gray-400 text-sm font-normal">
                        (Optional)
                      </span>
                    </FormLabel>
                    <FormControl>
                      <div className="space-y-4">
                        {/* Preview Area */}
                        <div className="flex items-center justify-center">
                          {previewUrl ? (
                            <div className="relative">
                              <img
                                src={previewUrl}
                                alt="Preview"
                                className="w-32 h-32 rounded-full object-cover border-2 border-gray-200"
                              />
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                className="absolute -top-2 -right-2 rounded-full w-6 h-6 p-0"
                                onClick={() => removeFile(field)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="w-32 h-32 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center">
                              <User className="h-12 w-12 text-gray-400" />
                            </div>
                          )}
                        </div>

                        {/* File Input */}
                        <div className="flex items-center justify-center">
                          <label
                            htmlFor="photoFile"
                            className="cursor-pointer flex items-center space-x-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors"
                          >
                            <Upload className="h-4 w-4" />
                            <span>
                              {previewUrl ? 'Change Photo' : 'Upload Photo'}
                            </span>
                          </label>
                          <Input
                            id="photoFile"
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleFileChange(e, field)}
                            className="hidden"
                          />
                        </div>
                      </div>
                    </FormControl>
                    <FormDescription>
                      Upload a profile photo (optional). Max file size: 5MB.
                      Supported formats: JPG, PNG, GIF.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>

            <CardFooter>
              <Button
                disabled={submitting}
                type="submit"
                variant="default"
                className="w-full"
              >
                {submitting ? 'Submitting...' : 'Submit Nomination'}
              </Button>
            </CardFooter>

            {submitError && (
              <p className="text-red-600 text-center mt-2 pb-4" role="alert">
                {submitError}
              </p>
            )}
          </Card>
        </form>
      </Form>
    </section>
  );
}
