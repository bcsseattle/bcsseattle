/**
 * Feature Flag Constants
 * 
 * Define all available feature flags here to ensure type safety
 * and prevent typos when using feature flags throughout the app.
 */

export const FEATURE_FLAGS = {
  // Elections & Voting
  SKIP_MEMBERSHIP_CHECK: 'skipMembershipCheck',
  ALLOW_GUEST_VOTING: 'allowGuestVoting',
  ENABLE_BETA_FEATURES: 'enableBetaFeatures',
  
  // Debug & Development
  ENABLE_DEBUG_MODE: 'enableDebugMode',
  SHOW_FEATURE_FLAGS: 'showFeatureFlags',
  
  // Future features (add as needed)
  ENABLE_NEW_UI: 'enableNewUI',
  ALLOW_ANONYMOUS_FEEDBACK: 'allowAnonymousFeedback',
} as const;

// Type for feature flag keys
export type FeatureFlagKey = typeof FEATURE_FLAGS[keyof typeof FEATURE_FLAGS];

// Helper to get all feature flag values as an array
export const ALL_FEATURE_FLAGS = Object.values(FEATURE_FLAGS);

// Default values for each feature flag
export const FEATURE_FLAG_DEFAULTS: Record<FeatureFlagKey, boolean> = {
  [FEATURE_FLAGS.SKIP_MEMBERSHIP_CHECK]: false,
  [FEATURE_FLAGS.ALLOW_GUEST_VOTING]: false,
  [FEATURE_FLAGS.ENABLE_BETA_FEATURES]: false,
  [FEATURE_FLAGS.ENABLE_DEBUG_MODE]: false,
  [FEATURE_FLAGS.SHOW_FEATURE_FLAGS]: false,
  [FEATURE_FLAGS.ENABLE_NEW_UI]: false,
  [FEATURE_FLAGS.ALLOW_ANONYMOUS_FEEDBACK]: false,
};

// Helper type for feature flag results
export type FeatureFlagResults<T extends readonly FeatureFlagKey[]> = {
  [K in T[number]]: boolean;
};

// Convenience function to create typed feature flag arrays
export const createFeatureFlagArray = <T extends readonly FeatureFlagKey[]>(...flags: T): T => flags;
