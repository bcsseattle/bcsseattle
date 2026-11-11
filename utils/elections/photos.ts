import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types_db';

const TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Stores a candidate photo in the public candidate-photos bucket, under the
 * signed-in user's own folder (the storage policy allows only that, W1;
 * admins may write anywhere). Uploads with the caller's session.
 */
export async function uploadCandidatePhoto(
  supabase: SupabaseClient<Database>,
  userId: string,
  file: File
): Promise<{ url: string } | { error: string }> {
  if (!TYPES.includes(file.type)) return { error: 'Choose a JPEG, PNG, GIF or WebP image.' };
  if (file.size > MAX_BYTES) return { error: 'The photo must be under 5 MB.' };
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const path = `${userId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('candidate-photos').upload(path, file, { cacheControl: '3600', upsert: false });
  if (error) {
    console.error('uploadCandidatePhoto:', error);
    return { error: 'The photo couldn’t be uploaded. Try again, or continue without one.' };
  }
  return { url: supabase.storage.from('candidate-photos').getPublicUrl(path).data.publicUrl };
}

/** A photo from a form field, or null when none was chosen. */
export const photoFrom = (formData: FormData, name = 'photo') => {
  const file = formData.get(name);
  return file instanceof File && file.size > 0 ? file : null;
};

/** Database refusals are plain sentences (the election and nomination functions); anything else gets a generic line. */
export const dbMessage = (error: { message: string; code?: string }) =>
  ['P0001', '22023', '42501', '23514', 'P0002'].includes(error.code ?? '') ? error.message : 'Something went wrong. Please try again.';
