'use client';

import { useId, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle, Upload, User } from 'lucide-react';
import { ActionBar } from '@/components/ui/action-bar';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { StatePanel } from '@/components/ui/state-panel';
import { Textarea } from '@/components/ui/textarea';
import { NominateFormSchema } from '@/types';
import { compressImage } from '@/utils/image-compression';
import { AppHeader } from '~/components/app-header';
import { Field } from '~/components/auth-form';
import { Loaded } from '~/components/screen';
import {
  loadElection,
  type ElectionData
} from '~/components/elections/election';
import { api } from '~/lib/api';
import { useMember } from '~/lib/member';
import { useSession } from '~/lib/session';
import { useData } from '~/lib/use-data';

/**
 * Nominate yourself: the website's nominate form (NominateFormSchema, an
 * optional photo compressed before upload), posted as multipart to
 * /api/app/elections/[id]/nominate, which runs nominateCandidate.
 */
export default function NominateFlow() {
  const id = useSearchParams().get('id') ?? '';
  const userId = useSession().session!.user.id;
  const state = useData(() => loadElection(id, userId), [id, userId]);
  return (
    <>
      <AppHeader title="Nominate yourself" back={{}} />
      <Loaded state={state}>
        {(d) =>
          d.myCandidacy ? (
            <StatePanel icon={CheckCircle} title="You’re already nominated">
              You are running for {d.myCandidacy.position} in {d.election.title}
              . You can nominate yourself for one position per election; to
              change it, contact the election administrator.
            </StatePanel>
          ) : !d.phase.nominationsOpen ? (
            <StatePanel title="Nominations are not open">
              Nominations are not open for this election.
            </StatePanel>
          ) : (
            <NominateForm d={d} />
          )
        }
      </Loaded>
    </>
  );
}

function NominateForm({ d }: { d: ElectionData }) {
  const router = useRouter();
  const { data: me } = useMember();
  const ids = {
    position: useId(),
    bio: useId(),
    manifesto: useId(),
    photo: useId()
  };
  const [photo, setPhoto] = useState<File>();
  const [preview, setPreview] = useState<string>();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  const [position, setPosition] = useState(d.positions[0]?.position ?? '');
  const description = d.positions.find(
    (p) => p.position === position
  )?.description;

  async function choosePhoto(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith('image/'))
      return setErrors((e) => ({
        ...e,
        photoFile: 'Please select an image file'
      }));
    try {
      // Request bodies are capped at 4.5 MB, so the photo is shrunk first, as on the website.
      const compressed = await compressImage(file);
      setPhoto(compressed);
      setPreview(URL.createObjectURL(compressed));
      setErrors(({ photoFile, ...rest }) => rest);
    } catch {
      setErrors((e) => ({
        ...e,
        photoFile: 'Failed to process image. Please try a different image.'
      }));
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const values = {
      fullName: String(form.get('fullName') ?? '').trim(),
      position,
      bio: String(form.get('bio') ?? '') || undefined,
      manifesto: String(form.get('manifesto') ?? '') || undefined,
      photoFile: photo
    };
    const parsed = NominateFormSchema.safeParse(values);
    if (!parsed.success) {
      return setErrors(
        Object.fromEntries(
          parsed.error.issues.map((i) => [String(i.path[0]), i.message])
        )
      );
    }
    setErrors({});
    setError(undefined);
    setPending(true);
    const body = new FormData();
    body.set('fullName', values.fullName);
    body.set('position', values.position);
    if (values.bio) body.set('bio', values.bio);
    if (values.manifesto) body.set('manifesto', values.manifesto);
    if (photo) body.set('photoFile', photo, photo.name);
    try {
      await api(`/api/app/elections/${d.election.id}/nominate`, { form: body });
      router.replace(`/elections/view/?id=${d.election.id}`);
    } catch (e) {
      setError(
        e instanceof TypeError
          ? 'Something went wrong. Check your connection and try again.'
          : (e as Error).message
      );
      setPending(false);
    }
  }

  const fieldError = (name: string) =>
    errors[name] && (
      <p role="alert" className="text-caption text-destructive">
        {errors[name]}
      </p>
    );

  return (
    <form
      noValidate
      onSubmit={submit}
      className="flex flex-1 flex-col gap-5 px-4 pt-4"
    >
      <p className="text-body text-muted-foreground">
        Nominate yourself for a leadership position in {d.election.title}. You
        can nominate yourself for one position per election.
      </p>

      <div className="flex flex-col gap-1.5">
        <Field
          label="Full name"
          name="fullName"
          autoComplete="name"
          defaultValue={me?.fullName ?? ''}
          key={me?.fullName ?? ''}
        />
        {fieldError('fullName')}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={ids.position}>Position</Label>
        <select
          id={ids.position}
          value={position}
          onChange={(e) => setPosition(e.target.value)}
          className="h-11 rounded-md border border-input bg-card px-3 text-body text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {d.positions.map((p) => (
            <option key={p.position} value={p.position}>
              {p.position}
            </option>
          ))}
        </select>
        {description && (
          <p className="text-caption text-muted-foreground">{description}</p>
        )}
        {fieldError('position')}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={ids.bio}>
          Short bio{' '}
          <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          id={ids.bio}
          name="bio"
          rows={4}
          placeholder="Your background and experience"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={ids.manifesto}>
          Your platform and vision{' '}
          <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          id={ids.manifesto}
          name="manifesto"
          rows={5}
          maxLength={1000}
          placeholder="What you plan to accomplish in this role"
        />
        <p className="text-caption text-muted-foreground">
          10 to 1,000 characters.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">
          Profile photo{' '}
          <span className="font-normal text-muted-foreground">(optional)</span>
        </span>
        <div className="flex items-center gap-4">
          <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-muted">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview}
                alt="Your photo"
                className="size-full object-cover"
              />
            ) : (
              <User aria-hidden className="size-8 text-muted-foreground" />
            )}
          </div>
          <label
            htmlFor={ids.photo}
            className="flex h-11 cursor-pointer items-center gap-2 rounded-md border border-border-strong bg-card px-4 text-sm font-medium focus-within:ring-2 focus-within:ring-ring"
          >
            <Upload aria-hidden className="size-4" />
            {preview ? 'Change photo' : 'Choose photo'}
            <input
              id={ids.photo}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => choosePhoto(e.target.files?.[0])}
            />
          </label>
        </div>
        {fieldError('photoFile')}
      </div>

      {error && (
        <Banner tone="error" title="Your nomination was not submitted">
          {error}
        </Banner>
      )}
      <div className="flex-1" />
      <ActionBar>
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? 'Submitting…' : 'Submit nomination'}
        </Button>
      </ActionBar>
    </form>
  );
}
