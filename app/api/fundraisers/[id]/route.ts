import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { FundraiserFormSchema } from '@/types';
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
    const body = FundraiserFormSchema.partial().parse(json);

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
  const supabase = await createClient();

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

  // For now, creators can delete their own fundraisers
  // TODO: Add admin check when admin role is implemented
  const { data: fundraiser } = await supabase
    .from('fundraisers')
    .select('created_by')
    .eq('id', params.id)
    .single();

  if (!fundraiser || fundraiser.created_by !== user.id) {
    return NextResponse.json(
      { error: 'Only the creator can delete this fundraiser' },
      { status: 403 }
    );
  }

  const { error: deleteError } = await supabase
    .from('fundraisers')
    .delete()
    .eq('id', params.id);

  if (deleteError) {
    return NextResponse.json(
      { error: deleteError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
