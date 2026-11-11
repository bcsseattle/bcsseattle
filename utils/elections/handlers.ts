'use server';

import { z } from 'zod';
import { getErrorRedirect, getStatusRedirect } from 'utils/helpers';
import { createClient } from '@/utils/supabase/server';
// Votes have no insert policy for users: they are written here, after the checks above (BUG-005).
import { supabaseAdmin } from '@/utils/supabase/admin';
import { ballotRefusal, PHASE_COLUMNS } from '@/utils/elections/access';
import { currentUserIsActiveMember } from '@/utils/election-config';
import { electionPhase, positionOnBallot, type Position } from '@/utils/elections/rules';
import {
  NominateFormSchema,
  VoteInsert,
  VoteConfirmationInsert,
  VoteOption,
  VoteSessionType
} from '@/types';
import { createCandidate } from '@/utils/supabase/admin';
import crypto from 'crypto';

// Helper function to generate confirmation code
function generateConfirmationCode(): string {
  return crypto.randomBytes(16).toString('hex').toUpperCase();
}

// Helper function to get client IP from headers
function getClientIP(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return headers.get('x-real-ip') || 'unknown';
}

// Voting related types
interface CandidateVote {
  candidateId: string;
  position: string;
}

interface InitiativeVote {
  initiativeId: string;
  vote: VoteOption;
}

interface VotingResult {
  success: boolean;
  confirmationCode?: string;
  votesCast?: number;
  sessionId?: string;
  error?: string;
}

/**
 * Whether the user already has votes of this kind in the election, cast through
 * any ballot (combined, candidates or initiatives). The votes themselves are the
 * record, so every path checks them the same way (BUG-016).
 */
async function hasVoted(userId: string, electionId: string, kind: 'candidates' | 'initiatives' | 'any') {
  let query = supabaseAdmin.from('votes').select('id').eq('user_id', userId).eq('election_id', electionId);
  if (kind === 'candidates') query = query.not('candidate_id', 'is', null);
  if (kind === 'initiatives') query = query.not('initiative_id', 'is', null);
  const { data } = await query.limit(1);
  return (data?.length ?? 0) > 0;
}

/**
 * Candidates must belong to the election and stand for a position on the
 * ballot (not vacant, not elected unopposed). Withdrawn candidates can't be
 * chosen, and each position takes at most as many votes as it has seats.
 * Positions come from the database, never from the request (BUG-011).
 */
async function validateCandidateVotes(
  supabase: Awaited<ReturnType<typeof createClient>>,
  electionId: string,
  candidateVotes: CandidateVote[]
): Promise<string | null> {
  if (candidateVotes.length === 0) return null;
  const candidateIds = candidateVotes.map((v) => v.candidateId);
  if (new Set(candidateIds).size !== candidateIds.length) return 'Each candidate can be chosen once';

  const [{ data: all }, { data: dbPositions }] = await Promise.all([
    supabase.from('candidates').select('id, position, withdrawn_at').eq('election_id', electionId),
    supabase.from('ballot_positions').select('title, seats, vacant, unopposed_decision').eq('election_id', electionId)
  ]);
  const candidates = all ?? [];
  const byId = new Map(candidates.map((c) => [c.id, c]));
  const invalid = candidateIds.filter((id) => !byId.has(id));
  if (invalid.length > 0) return `Invalid candidate IDs: ${invalid.join(', ')}`;
  if (candidateIds.some((id) => byId.get(id)!.withdrawn_at)) return 'A withdrawn candidate can’t be chosen';

  // Elections set up before per-election positions: one seat each.
  const position = (title: string): Position =>
    (dbPositions ?? []).map((p) => ({ position: p.title, description: null, display_order: 0, seats: p.seats, vacant: p.vacant, unopposed_decision: p.unopposed_decision }))
      .find((p) => p.position === title) ?? { position: title, description: null, display_order: 0 };
  const chosen = new Map<string, number>();
  for (const id of candidateIds) {
    const title = byId.get(id)!.position;
    chosen.set(title, (chosen.get(title) ?? 0) + 1);
  }
  for (const [title, count] of Array.from(chosen)) {
    const p = position(title);
    if (!positionOnBallot(p, candidates)) return `${title} isn’t on the ballot`;
    if (count > (p.seats ?? 1)) {
      return (p.seats ?? 1) === 1 ? 'Cannot vote for multiple candidates in the same position' : `Choose up to ${p.seats} candidates for ${title}`;
    }
  }
  return null;
}

export async function submitCandidateVotes(
  candidateVotes: CandidateVote[],
  electionId: string,
  headers?: Headers
): Promise<VotingResult> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Authentication required' };
    }

    // Locked ballot, candidate window open (BUG-060), active member, on the roll.
    const refusal = await ballotRefusal(supabase, electionId, user.id, 'candidates');
    if (refusal) {
      return { success: false, error: refusal };
    }

    // Check if user has already voted for candidates
    const { data: existingSession } = await supabase
      .from('vote_sessions')
      .select('id, completed_at')
      .eq('user_id', user.id)
      .eq('election_id', electionId)
      .eq('session_type', 'candidates')
      .single();

    if (existingSession?.completed_at || (await hasVoted(user.id, electionId, 'candidates'))) {
      return { success: false, error: 'You have already voted for candidates in this election' };
    }

    const candidateError = await validateCandidateVotes(supabase, electionId, candidateVotes);
    if (candidateError) {
      return { success: false, error: candidateError };
    }

    // Generate confirmation code
    const confirmationCode = generateConfirmationCode();
    const clientIP = headers ? getClientIP(headers) : 'unknown';
    const userAgent = headers?.get('user-agent') || 'unknown';

    // Create or update vote session
    let sessionId: string;
    if (existingSession) {
      sessionId = existingSession.id;
      await supabase
        .from('vote_sessions')
        .update({
          confirmation_code: confirmationCode,
          votes_cast: candidateVotes.length
        })
        .eq('id', sessionId);
    } else {
      const { data: newSession, error: sessionError } = await supabase
        .from('vote_sessions')
        .insert({
          user_id: user.id,
          election_id: electionId,
          session_type: 'candidates' as VoteSessionType,
          confirmation_code: confirmationCode,
          votes_cast: candidateVotes.length
        })
        .select('id')
        .single();

      if (sessionError || !newSession) {
        return { success: false, error: 'Failed to create vote session' };
      }
      sessionId = newSession.id;
    }

    // Delete existing votes if updating
    if (existingSession) {
      await supabase
        .from('votes')
        .delete()
        .eq('user_id', user.id)
        .eq('election_id', electionId)
        .eq('vote_type', 'candidates');
    }

    // Insert candidate votes
    if (candidateVotes.length > 0) {
      const votesToInsert: VoteInsert[] = candidateVotes.map(vote => ({
        user_id: user.id,
        election_id: electionId,
        candidate_id: vote.candidateId,
        session_id: sessionId,
        vote_type: 'candidates' as VoteSessionType,
        voted_at: new Date().toISOString(),
        ip_address: clientIP,
        user_agent: userAgent
      }));

      const { error: voteError } = await supabaseAdmin
        .from('votes')
        .insert(votesToInsert);

      if (voteError) {
        return { success: false, error: 'Failed to record votes' };
      }
    }

    // Mark session as completed
    await supabase
      .from('vote_sessions')
      .update({ completed_at: new Date().toISOString() })
      .eq('id', sessionId);

    return {
      success: true,
      confirmationCode,
      votesCast: candidateVotes.length,
      sessionId
    };

  } catch (error) {
    console.error('Error in submitCandidateVotes:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function submitInitiativeVotes(
  initiativeVotes: InitiativeVote[],
  electionId: string,
  headers?: Headers
): Promise<VotingResult> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Authentication required' };
    }

    // Locked ballot, window open, active member, on the roll.
    const refusal = await ballotRefusal(supabase, electionId, user.id, 'initiatives');
    if (refusal) {
      return { success: false, error: refusal };
    }

    // Check if user has already voted for initiatives
    const { data: existingSession } = await supabase
      .from('vote_sessions')
      .select('id, completed_at')
      .eq('user_id', user.id)
      .eq('election_id', electionId)
      .eq('session_type', 'initiatives')
      .single();

    if (existingSession?.completed_at || (await hasVoted(user.id, electionId, 'initiatives'))) {
      return { success: false, error: 'You have already voted for initiatives in this election' };
    }

    // Validate initiative votes
    if (initiativeVotes.length > 0) {
      const initiativeIds = initiativeVotes.map(v => v.initiativeId);
      const { data: validInitiatives } = await supabase
        .from('initiatives')
        .select('id, title')
        .eq('election_id', electionId)
        .in('id', initiativeIds);

      const validInitiativeIds = validInitiatives?.map(i => i.id) || [];
      const invalidInitiatives = initiativeIds.filter(id => !validInitiativeIds.includes(id));

      if (invalidInitiatives.length > 0) {
        return { success: false, error: `Invalid initiative IDs: ${invalidInitiatives.join(', ')}` };
      }

      // Check for duplicates
      const uniqueInitiatives = new Set(initiativeIds);
      if (initiativeIds.length !== uniqueInitiatives.size) {
        return { success: false, error: 'Cannot vote multiple times for the same initiative' };
      }
    }

    // Generate confirmation code
    const confirmationCode = generateConfirmationCode();
    const clientIP = headers ? getClientIP(headers) : 'unknown';
    const userAgent = headers?.get('user-agent') || 'unknown';

    // Create or update vote session
    let sessionId: string;
    if (existingSession) {
      sessionId = existingSession.id;
      await supabase
        .from('vote_sessions')
        .update({
          confirmation_code: confirmationCode,
          votes_cast: initiativeVotes.length
        })
        .eq('id', sessionId);
    } else {
      const { data: newSession, error: sessionError } = await supabase
        .from('vote_sessions')
        .insert({
          user_id: user.id,
          election_id: electionId,
          session_type: 'initiatives' as VoteSessionType,
          confirmation_code: confirmationCode,
          votes_cast: initiativeVotes.length
        })
        .select('id')
        .single();

      if (sessionError || !newSession) {
        return { success: false, error: 'Failed to create vote session' };
      }
      sessionId = newSession.id;
    }

    // Delete existing votes if updating
    if (existingSession) {
      await supabase
        .from('votes')
        .delete()
        .eq('user_id', user.id)
        .eq('election_id', electionId)
        .eq('vote_type', 'initiatives');
    }

    // Insert initiative votes
    if (initiativeVotes.length > 0) {
      const votesToInsert: VoteInsert[] = initiativeVotes.map(vote => ({
        user_id: user.id,
        election_id: electionId,
        initiative_id: vote.initiativeId,
        vote_value: vote.vote,
        session_id: sessionId,
        vote_type: 'initiatives' as VoteSessionType,
        voted_at: new Date().toISOString(),
        ip_address: clientIP,
        user_agent: userAgent
      }));

      const { error: voteError } = await supabaseAdmin
        .from('votes')
        .insert(votesToInsert);

      if (voteError) {
        return { success: false, error: 'Failed to record votes' };
      }
    }

    // Mark session as completed
    await supabase
      .from('vote_sessions')
      .update({ completed_at: new Date().toISOString() })
      .eq('id', sessionId);

    return {
      success: true,
      confirmationCode,
      votesCast: initiativeVotes.length,
      sessionId
    };

  } catch (error) {
    console.error('Error in submitInitiativeVotes:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function submitCombinedVotes(
  candidateVotes: CandidateVote[],
  initiativeVotes: InitiativeVote[],
  electionId: string,
  headers?: Headers
): Promise<VotingResult> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Authentication required' };
    }

    // Locked ballot, window open, active member, on the roll.
    const refusal = await ballotRefusal(supabase, electionId, user.id, 'any');
    if (refusal) {
      return { success: false, error: refusal };
    }

    // Already voted through any ballot? (BUG-016)
    if (await hasVoted(user.id, electionId, 'any')) {
      return { success: false, error: 'You have already voted in this election' };
    }

    const candidateError = await validateCandidateVotes(supabase, electionId, candidateVotes);
    if (candidateError) {
      return { success: false, error: candidateError };
    }

    // Initiative votes: yes/no/abstain, once each, on this election's initiatives (BUG-052).
    if (initiativeVotes.some((v) => !['yes', 'no', 'abstain'].includes(v.vote as string))) {
      return { success: false, error: 'Each initiative vote must be yes, no or abstain' };
    }
    const initiativeIds = initiativeVotes.map((v) => v.initiativeId);
    if (new Set(initiativeIds).size !== initiativeIds.length) {
      return { success: false, error: 'Cannot vote on the same initiative twice' };
    }
    if (initiativeIds.length > 0) {
      const { data: found } = await supabase
        .from('initiatives')
        .select('id')
        .eq('election_id', electionId)
        .in('id', initiativeIds);
      if ((found?.length ?? 0) !== initiativeIds.length) {
        return { success: false, error: 'Invalid initiative for this election' };
      }
    }

    const totalVotes = candidateVotes.length + initiativeVotes.length;
    const confirmationCode = generateConfirmationCode();
    const clientIP = headers ? getClientIP(headers) : 'unknown';
    const userAgent = headers?.get('user-agent') || 'unknown';

    // Insert all votes
    const votesToInsert: VoteInsert[] = [];

    // Add candidate votes
    candidateVotes.forEach(vote => {
      votesToInsert.push({
        user_id: user.id,
        election_id: electionId,
        candidate_id: vote.candidateId,
        vote_type: 'combined' as VoteSessionType,
        voted_at: new Date().toISOString(),
        ip_address: clientIP,
        user_agent: userAgent
      });
    });

    // Add initiative votes
    initiativeVotes.forEach(vote => {
      votesToInsert.push({
        user_id: user.id,
        election_id: electionId,
        initiative_id: vote.initiativeId,
        vote_value: vote.vote,
        vote_type: 'combined' as VoteSessionType,
        voted_at: new Date().toISOString(),
        ip_address: clientIP,
        user_agent: userAgent
      });
    });

    // Insert votes
    const { error: voteError } = await supabaseAdmin
      .from('votes')
      .insert(votesToInsert);

    if (voteError) {
      return { success: false, error: 'Failed to record votes' };
    }

    // Create confirmation record
    const confirmationData: VoteConfirmationInsert = {
      user_id: user.id,
      election_id: electionId,
      confirmation_code: confirmationCode,
      votes_cast: totalVotes,
      confirmed_at: new Date().toISOString(),
      session_type: 'combined' as VoteSessionType
    };

    await supabase
      .from('vote_confirmations')
      .insert(confirmationData);

    return {
      success: true,
      confirmationCode,
      votesCast: totalVotes
    };

  } catch (error) {
    console.error('Error in submitCombinedVotes:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function getVotingStatus(electionId: string, sessionType?: VoteSessionType) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { hasVoted: false, error: 'Authentication required' };
    }

    if (sessionType && sessionType !== 'combined') {
      // Get session-based voting status
      const { data: session } = await supabase
        .from('vote_sessions')
        .select('confirmation_code, votes_cast, completed_at')
        .eq('user_id', user.id)
        .eq('election_id', electionId)
        .eq('session_type', sessionType)
        .single();

      const { data: votes } = await supabase
        .from('votes')
        .select(`
          id,
          candidate_id,
          initiative_id,
          vote_value,
          voted_at,
          candidates(full_name, position),
          initiatives(title)
        `)
        .eq('user_id', user.id)
        .eq('election_id', electionId)
        .eq('vote_type', sessionType);

      return {
        hasVoted: !!session?.completed_at,
        votes: votes || [],
        session: session || null
      };
    } else {
      // Get combined voting status
      const { data: votes } = await supabase
        .from('votes')
        .select(`
          id,
          candidate_id,
          initiative_id,
          vote_value,
          voted_at,
          candidates(full_name, position),
          initiatives(title)
        `)
        .eq('user_id', user.id)
        .eq('election_id', electionId);

      const { data: confirmation } = await supabase
        .from('vote_confirmations')
        .select('confirmation_code, votes_cast, confirmed_at')
        .eq('user_id', user.id)
        .eq('election_id', electionId)
        .single();

      return {
        hasVoted: votes && votes.length > 0,
        votes: votes || [],
        confirmation: confirmation || null
      };
    }
  } catch (error) {
    console.error('Error in getVotingStatus:', error);
    return { hasVoted: false, error: 'Failed to fetch voting status' };
  }
}

function validatePhotoFile(file: File): {
  valid: boolean;
  error?: string;
} {
  // Check file size (5MB max)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    return { valid: false, error: 'File size must be less than 5MB' };
  }

  // Check file type
  const allowedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp'
  ];
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Please select a valid image file (JPEG, PNG, GIF, or WebP)'
    };
  }

  return { valid: true };
}

async function uploadPhotoFile(
  photoFile: File,
  userId: string,
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<{ photoUrl: string; filePath: string } | { error: string }> {
  try {
    // Validate file
    const validation = validatePhotoFile(photoFile);
    if (!validation.valid) {
      return { error: validation.error! };
    }

    // Generate unique filename
    const fileExt = photoFile.name.split('.').pop();
    // Members may write only under their own folder (storage policy, W1).
    const filePath = `${userId}/${Date.now()}.${fileExt}`;

    // Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('candidate-photos')
      .upload(filePath, photoFile, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return { error: `Failed to upload photo: ${uploadError.message}` };
    }

    console.log('File uploaded successfully:', uploadData);

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('candidate-photos')
      .getPublicUrl(filePath);

    if (!urlData?.publicUrl) {
      console.error('Failed to get public URL');
      return { error: 'Failed to generate photo URL' };
    }

    console.log('Photo uploaded successfully:', {
      filePath,
      publicUrl: urlData.publicUrl
    });

    return {
      photoUrl: urlData.publicUrl,
      filePath
    };
  } catch (error) {
    console.error('Photo upload error:', error);
    return { error: 'Failed to process photo upload' };
  }
}

export async function nominateCandidate(
  formValue: z.infer<typeof NominateFormSchema>,
  electionId: string
) {
  try {
    // debugger;
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return getErrorRedirect(
        '/signin',
        'Please sign in to nominate yourself.'
      );
    }
    // Always the signed-in user: a userId from the browser is not trusted (BUG-006).
    const finalUserId = user.id;

    // Only approved, active members can stand (B3).
    if (!(await currentUserIsActiveMember())) {
      return getErrorRedirect(
        `/elections/${electionId}/nominate`,
        'Only approved members with active membership can be nominated.'
      );
    }

    // The same window everywhere: a published election, edges included.
    const { data: election } = await supabase.from('elections').select(PHASE_COLUMNS).eq('id', electionId).maybeSingle();
    if (!election || !electionPhase(election).nominationsOpen) {
      return getErrorRedirect(
        `/elections/${electionId}/nominate`,
        'Nominations are not open for this election.'
      );
    }

    // Check for existing nomination
    const { data: existingNomination, error: checkError } = await supabase
      .from('candidates')
      .select('id, position')
      .eq('user_id', finalUserId)
      .eq('election_id', electionId)
      .single();

    if (existingNomination && !checkError) {
      return getErrorRedirect(
        `/elections/${electionId}/nominate`,
        `You have already nominated yourself for ${existingNomination.position}.`
      );
    }

    const { fullName, position, bio, photoFile, manifesto } = formValue;
    let photoUrl = '';

    // Handle photo upload
    if (photoFile) {
      const result = await uploadPhotoFile(photoFile, finalUserId, supabase);

      if ('error' in result) {
        return getErrorRedirect(
          `/elections/${electionId}/nominate`,
          result.error
        );
      }

      photoUrl = result.photoUrl;
    }

    const candidateDetails = {
      bio,
      election_id: electionId,
      full_name: fullName,
      photo_url: photoUrl,
      position,
      user_id: finalUserId,
      manifesto
    };

    const { error } = await createCandidate(candidateDetails);

    if (error) {
      console.error('Error creating candidate:', error);
      const errorMessage = typeof error === 'string' ? error : error.message;
      return getErrorRedirect(
        `/elections/${electionId}/nominate`,
        `Failed to submit nomination: ${errorMessage}`
      );
    }

    return getStatusRedirect(
      `/elections/${electionId}`,
      'Success!',
      'You have successfully nominated yourself as a candidate.'
    );
  } catch (error) {
    console.error('Error in nominateCandidate:', error);
    return getErrorRedirect(
      `/elections/${electionId}/nominate`,
      'An unexpected error occurred. Please try again.'
    );
  }
}
