import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/utils/auth-helpers/server';

const UpdateSchema = z.object({
  content: z.string().min(1, 'Update content is required'),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();

  try {
    const { data: updates, error } = await supabase
      .from('fundraiser_updates')
      .select('*, created_by:users(name)')
      .eq('fundraiser_id', params.id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(updates);
  } catch (error) {
    console.error('Error fetching fundraiser updates:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();

  try {
    // Check authentication and admin status
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify admin status
    const { data: userData } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', session.user.id)
      .single();

    if (!userData?.is_admin) {
      return NextResponse.json(
        { error: 'Only admins can add updates' },
        { status: 403 }
      );
    }

    // Verify fundraiser exists
    const { data: fundraiser } = await supabase
      .from('fundraisers')
      .select()
      .eq('id', params.id)
      .single();

    if (!fundraiser) {
      return NextResponse.json(
        { error: 'Fundraiser not found' },
        { status: 404 }
      );
    }

    // Parse and validate request body
    const json = await request.json();
    const { content } = UpdateSchema.parse(json);

    // Create the update
    const { data: update, error: updateError } = await supabase
      .from('fundraiser_updates')
      .insert({
        fundraiser_id: params.id,
        content,
        created_by: session.user.id
      })
      .select('*, created_by:users(name)')
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(update);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid update data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating fundraiser update:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
