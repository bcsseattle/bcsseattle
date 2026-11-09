import { createClient } from '@/utils/supabase/server';
import { isCurrentUserAdmin } from '@/utils/auth-helpers/server';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { FundraiserFormSchema } from '@/types';

// What the admin edit form sends (BUG-017): the create schema plus status, with
// the optional fields allowed to be cleared (null).
const FundraiserUpdateSchema = FundraiserFormSchema.extend({
  status: z.enum(['draft', 'active', 'paused', 'completed', 'cancelled']),
  category: FundraiserFormSchema.shape.category.nullable(),
  beneficiary: z.string().nullable(),
  ends_at: z.string().datetime().nullable(),
  image_url: z.string().url('Invalid image URL').nullable()
}).partial();
import { z } from 'zod';

export async function GET(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const params = await paramsPromise;
  const supabase = await createClient();

  const { data: fundraiser, error } = await supabase
    .from('fundraisers')
    .select('*, fundraiser_updates(*), fundraiser_donations(*, donors(*))')
    .eq('id', params.id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!fundraiser) {
    return NextResponse.json({ error: 'Fundraiser not found' }, { status: 404 });
  }

  return NextResponse.json(fundraiser);
}

export async function PATCH(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const params = await paramsPromise;
  const supabase = await createClient();

  try {
    // Check if user is authenticated and is admin
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify admin status
    const { data: userData } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!userData?.is_admin) {
      return NextResponse.json(
        { error: 'Only admins can update fundraisers' },
        { status: 403 }
      );
    }

    const json = await request.json();
    const body = FundraiserUpdateSchema.parse(json);

    // Convert any Date objects to ISO strings
    const formattedBody = {
      ...body,
      // Only convert ends_at if it's a valid date string
      ends_at: typeof body.ends_at === 'string' && !isNaN(Date.parse(body.ends_at))
        ? new Date(body.ends_at).toISOString()
        : body.ends_at,
      updated_at: new Date().toISOString()
    };

    const { data, error: updateError } = await supabase
      .from('fundraisers')
      .update(formattedBody)
      .eq('id', params.id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: updateError?.message || 'Update failed' },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Fundraiser not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid fundraiser data', details: (error as z.ZodError).errors },
        { status: 400 }
      );
    }
    console.error('Error updating fundraiser:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const params = await paramsPromise;

  // Admins only. RLS has no delete policy, so the old creator-only delete with
  // the user's client removed nothing yet answered success (BUG-062).
  if (!(await isCurrentUserAdmin())) {
    return NextResponse.json({ error: 'Only admins can delete fundraisers' }, { status: 403 });
  }

  // Deleting would cascade to the donations: a fundraiser that has any is a
  // financial record and should be cancelled instead.
  const { count } = await supabaseAdmin
    .from('fundraiser_donations')
    .select('id', { count: 'exact', head: true })
    .eq('fundraiser_id', params.id);
  if (count) {
    return NextResponse.json(
      { error: 'This fundraiser has donations; set its status to cancelled instead' },
      { status: 409 }
    );
  }

  const { data, error } = await supabaseAdmin.from('fundraisers').delete().eq('id', params.id).select('id');
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data?.length) {
    return NextResponse.json({ error: 'Fundraiser not found' }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
