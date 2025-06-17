'use server';

import { z } from 'zod';
import { getErrorRedirect, getStatusRedirect } from 'utils/helpers';
import { createClient } from '@/utils/supabase/server';
import { Candidate, NominateFormSchema } from '@/types';
import { createCandidate } from '@/utils/supabase/admin';

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
    debugger;
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
