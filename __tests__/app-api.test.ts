/** pdfOrError (W13): the website's PDF routes redirect on a problem; the app gets JSON. */
jest.mock('server-only', () => ({}));
jest.mock('@/utils/supabase/server', () => ({ createClient: jest.fn() }));
import { NextResponse } from 'next/server';
import { pdfOrError } from '@/utils/app-api';

describe('pdfOrError', () => {
  it('passes a PDF through', () => {
    const pdf = new Response('%PDF', { headers: { 'content-type': 'application/pdf' } });
    expect(pdfOrError(pdf)).toBe(pdf);
  });
  it('turns a redirect with an error into a 404 with its message', async () => {
    const res = pdfOrError(
      NextResponse.redirect('http://localhost/account?error=No%20Contributions%20Found&error_description=None%20this%20year.')
    );
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'None this year.' });
  });
  it('gives a plain message for a redirect without one', async () => {
    const res = pdfOrError(NextResponse.redirect('http://localhost/donate'));
    expect(res.status).toBe(404);
    expect((await res.json()).error).toMatch(/receipt/);
  });
});
