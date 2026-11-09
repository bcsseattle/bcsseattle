import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { FundraiserFormSchema } from '@/types/forms';
import { z } from 'zod';
import { createFundraiser } from '@/utils/fundraisers/handlers';

export async function GET() {
  const supabase = await createClient();

  const { data: fundraisers, error } = await supabase
    .from('fundraisers')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(fundraisers);
}

export async function POST(request: NextRequest) {
  try {
    const json = await request.json();
    const body = FundraiserFormSchema.parse(json);

    const { success, error, fundraiser } = await createFundraiser(body);

    if (!success || error) {
      const status = error === 'Authentication required' ? 401 : 
                    error === 'Only admins can create fundraisers' ? 403 : 500;
      return NextResponse.json({ error }, { status });
    }

    return NextResponse.json(fundraiser);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid fundraiser data', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
