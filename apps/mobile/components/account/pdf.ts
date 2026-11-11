import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { SITE_URL } from '~/lib/api';
import { supabase } from '~/lib/supabase';

/** A website API call with the member's token, returning the raw Response (for PDFs and status codes). */
export async function appFetch(path: string, init: RequestInit = {}) {
  const { data } = await supabase.auth.getSession();
  return fetch(`${SITE_URL}${path}`, {
    ...init,
    headers: { ...init.headers, ...(data.session && { Authorization: `Bearer ${data.session.access_token}` }) }
  });
}

const base64 = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

/**
 * Downloads a receipt PDF and hands it to the share sheet (save to Files,
 * mail, print). In a browser, where Filesystem and Share can't do that, it
 * opens the PDF in a new tab instead. Returns an error message, or nothing.
 *
 * The receipt routes answer a problem (no contributions that year, a gift not
 * yet paid) with JSON { error } (W13), shown as is; anything else that isn't a
 * PDF is `notFound`.
 */
export async function sharePdf(path: string, fileName: string, notFound: string): Promise<string | void> {
  let response: Response;
  try {
    response = await appFetch(path, { redirect: 'manual' });
  } catch {
    return 'The receipt didn’t download. Check your connection and try again.';
  }
  if (!response.ok || !response.headers.get('content-type')?.includes('application/pdf')) {
    if (response.status === 401) return 'Sign in again to download receipts.';
    const body = await response.json().catch(() => null);
    return typeof body?.error === 'string' ? body.error : notFound;
  }
  const blob = await response.blob();

  if (!Capacitor.isNativePlatform()) {
    window.open(URL.createObjectURL(blob), '_blank');
    return;
  }
  const { uri } = await Filesystem.writeFile({ path: fileName, data: await base64(blob), directory: Directory.Cache });
  try {
    await Share.share({ title: fileName, files: [uri] });
  } catch (error) {
    // Closing the share sheet without choosing anything rejects; that isn't a failure.
    if (!String(error).toLowerCase().includes('cancel')) throw error;
  }
}
