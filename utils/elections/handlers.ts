'use server';

import { z } from 'zod';
import { getErrorRedirect, getStatusRedirect } from 'utils/helpers';
import { createClient } from '@/utils/supabase/server';
import {
  Candidate,
  NominateFormSchema,
  VoteInsert,
  VoteSessionInsert,
  VoteConfirmationInsert,
  Election,
  Initiative,
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

// Voting handlers following the same pattern as membership handlers
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

    // Validate election exists and is active
    const { data: election, error: electionError } = await supabase
      .from('elections')
      .select('id, start_date, end_date, candidate_voting_end, enable_separate_voting_periods')
      .eq('id', electionId)
      .single();

    if (electionError || !election) {
      return { success: false, error: 'Election not found' };
    }

    // Check if candidate voting is open
    const now = new Date();
    const startDate = new Date(election.start_date);
    const endDate = new Date(election.end_date);
    
    // Use candidate-specific end date if separate voting periods are enabled
    let candidateEndDate = endDate;
    if (election.enable_separate_voting_periods && election.candidate_voting_end) {
      candidateEndDate = new Date(election.candidate_voting_end);
    }

    if (now < startDate || now > candidateEndDate) {
      return { success: false, error: 'Candidate voting is not currently open for this election' };
    }

    // Check if user has already voted for candidates
    const { data: existingSession } = await supabase
      .from('vote_sessions')
      .select('id, completed_at')
      .eq('user_id', user.id)
      .eq('election_id', electionId)
      .eq('session_type', 'candidates')
      .single();

    if (existingSession?.completed_at) {
      return { success: false, error: 'You have already voted for candidates in this election' };
    }

    // Validate candidate votes
    if (candidateVotes.length > 0) {
      const candidateIds = candidateVotes.map(v => v.candidateId);
      const { data: validCandidates } = await supabase
        .from('candidates')
        .select('id, position')
        .eq('election_id', electionId)
        .in('id', candidateIds);

      const validCandidateIds = validCandidates?.map(c => c.id) || [];
      const invalidCandidates = candidateIds.filter(id => !validCandidateIds.includes(id));

      if (invalidCandidates.length > 0) {
        return { success: false, error: `Invalid candidate IDs: ${invalidCandidates.join(', ')}` };
      }

      // Check for duplicate positions
      const positions = candidateVotes.map(v => v.position);
      const uniquePositions = new Set(positions);
      if (positions.length !== uniquePositions.size) {
        return { success: false, error: 'Cannot vote for multiple candidates in the same position' };
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

      const { error: voteError } = await supabase
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

    // Validate election exists and is active
    const { data: election, error: electionError } = await supabase
      .from('elections')
      .select('id, start_date, end_date')
      .eq('id', electionId)
      .single();

    if (electionError || !election) {
      return { success: false, error: 'Election not found' };
    }

    // Check if voting is open
    const now = new Date();
    const startDate = new Date(election.start_date);
    const endDate = new Date(election.end_date);

    if (now < startDate || now > endDate) {
      return { success: false, error: 'Voting is not currently open for this election' };
    }

    // Check if user has already voted for initiatives
    const { data: existingSession } = await supabase
      .from('vote_sessions')
      .select('id, completed_at')
      .eq('user_id', user.id)
      .eq('election_id', electionId)
      .eq('session_type', 'initiatives')
      .single();

    if (existingSession?.completed_at) {
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

      const { error: voteError } = await supabase
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

    // Validate election exists and is active
    const { data: election, error: electionError } = await supabase
      .from('elections')
      .select('id, start_date, end_date')
      .eq('id', electionId)
      .single();

    if (electionError || !election) {
      return { success: false, error: 'Election not found' };
    }

    // Check if voting is open
    const now = new Date();
    const startDate = new Date(election.start_date);
    const endDate = new Date(election.end_date);

    if (now < startDate || now > endDate) {
      return { success: false, error: 'Voting is not currently open for this election' };
    }

    // Check if user has already voted
    const { data: existingVotes } = await supabase
      .from('votes')
      .select('id')
      .eq('user_id', user.id)
      .eq('election_id', electionId)
      .limit(1);

    if (existingVotes && existingVotes.length > 0) {
      return { success: false, error: 'You have already voted in this election' };
    }

    // Validate votes (reuse validation logic from separate functions)
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
    const { error: voteError } = await supabase
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
  supabase: any
): Promise<{ photoUrl: string; filePath: string } | { error: string }> {
  try {
    // Validate file
    const validation = validatePhotoFile(photoFile);
    if (!validation.valid) {
      return { error: validation.error! };
    }

    // Generate unique filename
    const fileExt = photoFile.name.split('.').pop();
    const fileName = `${userId}_${Date.now()}.${fileExt}`;
    const filePath = `candidate-photos/${fileName}`;

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
  electionId: string,
  userId?: string
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
    const finalUserId = userId || user.id;

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

    const candidateDetails: Partial<Candidate> = {
      bio,
      election_id: electionId,
      full_name: fullName,
      photo_url: photoUrl,
      position,
      user_id: finalUserId,
      manifesto
    };

    const { data, error } = await createCandidate(candidateDetails);

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

async function deleteUploadedPhoto(filePath: string) {
  try {
    const supabase = await createClient();
    const { error } = await supabase.storage
      .from('candidate-photos')
      .remove([filePath]);

    if (error) {
      console.error('Failed to delete uploaded photo:', error);
    }
  } catch (error) {
    console.error('Error deleting uploaded photo:', error);
  }
}

export async function nominateCandidateWithRollback(
  formValue: z.infer<typeof NominateFormSchema>,
  electionId: string,
  userId?: string
) {
  let uploadedFilePath: string | null = null;

  try {
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

    const finalUserId = userId || user.id;

    // Check for existing nomination
    const { data: existingNomination, error: checkError } = await supabase
      .from('candidates')
      .select('id, position')
      .eq('user_id', finalUserId)
      .eq('election_id', electionId)
      .single();

    if (existingNomination && !checkError) {
      return getErrorRedirect(
        '/elections/nominate',
        `You have already nominated yourself for ${existingNomination.position}. You can only nominate yourself for one position per election.`
      );
    }

    const { fullName, position, bio, photoFile } = formValue;

    let photoUrl = '';

    if (photoFile) {
      const validation = validatePhotoFile(photoFile);
      if (!validation.valid) {
        return getErrorRedirect(
          `/elections/${electionId}/nominate`,
          validation.error!
        );
      }

      try {
        // Generate unique filename with user folder structure
        const fileExt = photoFile.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `candidate-photos/${finalUserId}/${fileName}`; // Organize by user ID

        uploadedFilePath = filePath;

        console.log('Starting file upload:', {
          fileName,
          filePath,
          fileSize: photoFile.size,
          fileType: photoFile.type
        });

        console.log('User authentication check:', {
          userId: finalUserId,
          userEmail: user.email,
          userRole: user.role,
          bucketPath: filePath
        });

        // Upload file to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('candidate-photos')
          .upload(filePath, photoFile, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error('Upload error details:', {
            message: uploadError.message,
            details: uploadError
          });
          return getErrorRedirect(
            `/elections/${electionId}/nominate`,
            `Failed to upload photo: ${uploadError.message}`
          );
        }

        console.log('File uploaded successfully:', uploadData);

        // Get public URL for the uploaded file
        const { data: urlData } = supabase.storage
          .from('candidate-photos')
          .getPublicUrl(filePath);

        // FIX: Check if URL was generated properly
        if (!urlData?.publicUrl) {
          console.error('Failed to get public URL for uploaded file');
          return getErrorRedirect(
            `/elections/${electionId}/nominate`,
            'Failed to generate photo URL. Please try again.'
          );
        }

        photoUrl = urlData.publicUrl;

        console.log('Photo uploaded successfully:', {
          filePath,
          publicUrl: photoUrl
        });
      } catch (uploadError) {
        console.error('File upload error:', uploadError);
        if (uploadedFilePath) {
          await deleteUploadedPhoto(uploadedFilePath);
        }
        return getErrorRedirect(
          `/elections/${electionId}/nominate`,
          'Failed to process photo upload. Please try again.'
        );
      }
    }

    // Create candidate record
    const candidateDetails: Partial<Candidate> = {
      bio,
      election_id: electionId,
      full_name: fullName,
      photo_url: photoUrl,
      position,
      user_id: finalUserId
    };

    const { data, error } = await createCandidate(candidateDetails);

    if (error) {
      console.error('Error creating candidate:', error);

      // Rollback: Delete uploaded photo if candidate creation failed
      if (uploadedFilePath) {
        await deleteUploadedPhoto(uploadedFilePath);
      }

      if (
        (error as any).message?.includes('candidates_user_election_unique') ||
        (error as any).message?.includes('duplicate key value')
      ) {
        return getErrorRedirect(
          `/elections/${electionId}/nominate`,
          'You have already nominated yourself for this election.'
        );
      }

      return getErrorRedirect(
        `/elections/${electionId}/nominate`,
        `Failed to submit nomination: ${(error as any).message}`
      );
    }

    console.log('Candidate created successfully:', data);

    return getStatusRedirect(
      `/elections/${electionId}`,
      'Success!',
      'You have successfully nominated yourself as a candidate.'
    );
  } catch (error) {
    console.error('Error in nominateCandidate:', error);

    // Rollback: Delete uploaded photo if any error occurred
    if (uploadedFilePath) {
      await deleteUploadedPhoto(uploadedFilePath);
    }

    return getErrorRedirect(
      `/elections/${electionId}`,
      'An unexpected error occurred while submitting your nomination. Please try again.'
    );
  }
}
