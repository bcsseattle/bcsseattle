'use client';

import * as React from 'react';

import { Field } from '@/components/admin/elections/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { compressImage } from '@/utils/image-compression';

/**
 * What a nominee shows members: the name on the ballot, a statement, an
 * optional platform and an optional photo. The photo is shrunk in the browser
 * (to 800px) before it's sent, so it stays well under the upload limit.
 */
export function NomineeFields({
  defaults,
  photoUrl
}: {
  defaults: { full_name?: string; bio?: string; manifesto?: string };
  /** The current photo, when editing. */
  photoUrl?: string | null;
}) {
  const [preview, setPreview] = React.useState(photoUrl ?? null);
  const [photoError, setPhotoError] = React.useState<string>();

  async function choose(input: HTMLInputElement) {
    setPhotoError(undefined);
    const file = input.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setPhotoError('Choose an image file (JPEG, PNG or WebP).');
      input.value = '';
      return;
    }
    try {
      const small = await compressImage(file);
      const files = new DataTransfer();
      files.items.add(small);
      input.files = files.files;
      setPreview(URL.createObjectURL(small));
    } catch {
      setPhotoError('That image couldn’t be read. Try another one.');
      input.value = '';
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <Field id="full_name" label="Name on the ballot">
        {(p) => <Input {...p} name="full_name" defaultValue={defaults.full_name} maxLength={120} required autoComplete="name" />}
      </Field>
      <Field id="bio" label="Statement" helper="Who you are and why you’re standing. Members read this before they vote.">
        {(p) => <Textarea {...p} name="bio" defaultValue={defaults.bio} rows={4} maxLength={2000} />}
      </Field>
      <Field id="manifesto" label="Platform" helper="Optional. What you’ll do if elected, 10 to 1,000 characters.">
        {(p) => <Textarea {...p} name="manifesto" defaultValue={defaults.manifesto} rows={4} maxLength={1000} />}
      </Field>
      <Field id="photo" label="Photo" helper="Optional. A clear photo of your face." error={photoError}>
        {(p) => (
          <div className="flex items-center gap-4">
            {preview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="Your photo" className="size-16 shrink-0 rounded-full border object-cover" />
            )}
            <input
              {...p}
              type="file"
              name="photo"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="text-sm file:mr-3 file:rounded-md file:border file:border-input file:bg-card file:px-3 file:py-1.5 file:text-sm"
              onChange={(e) => choose(e.currentTarget)}
            />
          </div>
        )}
      </Field>
    </div>
  );
}
