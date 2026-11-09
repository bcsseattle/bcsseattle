/**
 * Server-side utility for feature flags in Next.js server components
 */

import { createClient } from '@/utils/supabase/server';
import { resolveFeatureFlags, logFeatureFlags, FeatureFlags, FeatureFlagContext } from './feature-flags';
import { FEATURE_FLAGS, FeatureFlagKey } from './feature-flag-constants';

/**
 * Server-side feature flag resolver for Next.js server components
 * This is the server equivalent of a "hook" for feature flags
 */
export async function useServerFeatureFlags(urlOverride?: string): Promise<FeatureFlags> {
  const supabase = await createClient();
  
  // Get user context
  const { data: { user } } = await supabase.auth.getUser();
  
  // Get user role/status from members table if available
  // Note: Using 'status' as role equivalent since members table doesn't have a 'role' column
  let userRole: string | undefined;
  if (user) {
    const { data: member } = await supabase
      .from('members')
      .select('status, membershipType')
      .eq('user_id', user.id)
      .single();
    
    // Use status as the role equivalent (active, inactive, etc.)
    // This allows us to create role-based feature flags based on membership status
    userRole = member?.status || 'guest';
  }

  // Build context
  const context: FeatureFlagContext = {
    userId: user?.id,
    userRole,
    environment: (process.env.NODE_ENV as any) || 'development',
  };

  // Resolve feature flags
  const features = await resolveFeatureFlags(context, urlOverride);
  
  // Log for debugging
  logFeatureFlags(features, context);

  return features;
}

/**
 * Get multiple feature flag values using constants for type safety
 * @param featureNames - Array of feature flag constants to check
 * @param urlOverride - Optional URL override string
 * @returns Promise<Record<FeatureFlagKey, boolean>> - Object with feature flag results
 */
export async function useServerFeatureFlag(
  featureNames: FeatureFlagKey[],
  urlOverride?: string
): Promise<Record<FeatureFlagKey, boolean>> {
  const features = await useServerFeatureFlags(urlOverride);
  
  // Map feature flag constants to FeatureFlags interface properties
  const featureMap: Record<FeatureFlagKey, keyof FeatureFlags> = {
    [FEATURE_FLAGS.SKIP_MEMBERSHIP_CHECK]: 'skipMembershipCheck',
    [FEATURE_FLAGS.ENABLE_BETA_FEATURES]: 'enableBetaFeatures',
    [FEATURE_FLAGS.ALLOW_GUEST_VOTING]: 'allowGuestVoting',
    [FEATURE_FLAGS.ENABLE_DEBUG_MODE]: 'enableDebugMode',
    [FEATURE_FLAGS.SHOW_FEATURE_FLAGS]: 'showFeatureFlags',
    [FEATURE_FLAGS.ENABLE_NEW_UI]: 'enableNewUI',
    [FEATURE_FLAGS.ALLOW_ANONYMOUS_FEEDBACK]: 'allowAnonymousFeedback',
  };

  // Build result object
  const result: Record<FeatureFlagKey, boolean> = {} as Record<FeatureFlagKey, boolean>;
  
  for (const featureName of featureNames) {
    const propertyName = featureMap[featureName];
    result[featureName] = features[propertyName] ?? false;
  }

  return result;
}

/**
 * Get a single feature flag value (convenience function)
 * @param featureName - Single feature flag constant to check
 * @param urlOverride - Optional URL override string
 * @returns Promise<boolean> - Whether the feature is enabled
 */
export async function useServerFeatureFlagSingle(
  featureName: FeatureFlagKey,
  urlOverride?: string
): Promise<boolean> {
  const result = await useServerFeatureFlag([featureName], urlOverride);
  return result[featureName];
}

/**
 * Simplified version for common use cases
 */
export async function checkFeatureFlag(
  featureName: keyof FeatureFlags,
  urlOverride?: string
): Promise<boolean> {
  const features = await useServerFeatureFlags(urlOverride);
  return features[featureName];
}
