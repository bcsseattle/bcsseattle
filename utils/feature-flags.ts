/**
 * Feature Flag System
 * Supports multiple sources: environment variables, database, and URL overrides
 */

import { FEATURE_FLAGS, FeatureFlagKey, FEATURE_FLAG_DEFAULTS } from './feature-flag-constants';

export interface FeatureFlags {
  skipMembershipCheck: boolean;
  enableBetaFeatures: boolean;
  allowGuestVoting: boolean;
  enableDebugMode: boolean;
  showFeatureFlags: boolean;
  enableNewUI: boolean;
  allowAnonymousFeedback: boolean;
}

export interface FeatureFlagContext {
  userId?: string;
  userRole?: string;
  environment: 'development' | 'staging' | 'production';
}

/**
 * Default feature flag values
 */
const DEFAULT_FEATURES: FeatureFlags = {
  ...FEATURE_FLAG_DEFAULTS,
};

/**
 * Environment-based feature flags
 */
function getEnvironmentFeatures(): Partial<FeatureFlags> {
  return {
    skipMembershipCheck: process.env.FF_SKIP_MEMBERSHIP_CHECK === 'true',
    enableBetaFeatures: process.env.FF_ENABLE_BETA_FEATURES === 'true',
    allowGuestVoting: process.env.FF_ALLOW_GUEST_VOTING === 'true',
    enableDebugMode: process.env.NODE_ENV === 'development',
    showFeatureFlags: process.env.FF_SHOW_FEATURE_FLAGS === 'true',
    enableNewUI: process.env.FF_ENABLE_NEW_UI === 'true',
    allowAnonymousFeedback: process.env.FF_ALLOW_ANONYMOUS_FEEDBACK === 'true',
  };
}

/**
 * Parse URL override configuration
 */
function parseUrlOverride(configOverrideString?: string): Partial<FeatureFlags> {
  if (!configOverrideString) {
    return {};
  }

  try {
    const config = JSON.parse(configOverrideString);
    return {
      skipMembershipCheck: config?.features?.skipMembershipCheck === true,
      enableBetaFeatures: config?.features?.enableBetaFeatures === true,
      allowGuestVoting: config?.features?.allowGuestVoting === true,
      enableDebugMode: config?.features?.enableDebugMode === true,
      showFeatureFlags: config?.features?.showFeatureFlags === true,
      enableNewUI: config?.features?.enableNewUI === true,
      allowAnonymousFeedback: config?.features?.allowAnonymousFeedback === true,
    };
  } catch (error) {
    console.error('Error parsing feature flag override:', error);
    return {};
  }
}

/**
 * Fallback function to query feature_flags table directly
 */
async function getDatabaseFeaturesTableQuery(context: FeatureFlagContext): Promise<Partial<FeatureFlags>> {
  try {
    const { createClient } = await import('@/utils/supabase/server');
    const supabase = await createClient();

    // Build query conditions
    let query = supabase
      .from('feature_flags')
      .select('feature_name, enabled')
      .eq('environment', context.environment);

    // Add user-specific or role-based conditions
    if (context.userId) {
      query = query.or(`user_id.eq.${context.userId},and(user_id.is.null,user_role.eq.${context.userRole || 'null'}),and(user_id.is.null,user_role.is.null)`);
    } else if (context.userRole) {
      query = query.or(`and(user_id.is.null,user_role.eq.${context.userRole}),and(user_id.is.null,user_role.is.null)`);
    } else {
      query = query.is('user_id', null).is('user_role', null);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching feature flags from table:', error);
      return {};
    }

    return processFeatureFlagData(data || []);
  } catch (error) {
    console.error('Error in getDatabaseFeaturesTableQuery:', error);
    return {};
  }
}

/**
 * Process feature flag data from database into FeatureFlags format
 */
function processFeatureFlagData(data: Array<{ feature_name: string; enabled: boolean }>): Partial<FeatureFlags> {
  const dbFeatures: Partial<FeatureFlags> = {};
  
  // Map database feature names to FeatureFlags interface properties
  const featureNameMap: Record<string, keyof FeatureFlags> = {
    [FEATURE_FLAGS.SKIP_MEMBERSHIP_CHECK]: 'skipMembershipCheck',
    [FEATURE_FLAGS.ENABLE_BETA_FEATURES]: 'enableBetaFeatures',
    [FEATURE_FLAGS.ALLOW_GUEST_VOTING]: 'allowGuestVoting',
    [FEATURE_FLAGS.ENABLE_DEBUG_MODE]: 'enableDebugMode',
    [FEATURE_FLAGS.SHOW_FEATURE_FLAGS]: 'showFeatureFlags',
    [FEATURE_FLAGS.ENABLE_NEW_UI]: 'enableNewUI',
    [FEATURE_FLAGS.ALLOW_ANONYMOUS_FEEDBACK]: 'allowAnonymousFeedback',
  };

  // Process database results (database function now handles priority/deduplication)
  for (const row of data) {
    const propertyName = featureNameMap[row.feature_name];
    if (propertyName) {
      dbFeatures[propertyName] = row.enabled === true;
    }
  }

  return dbFeatures;
}

/**
 * Database-driven feature flags
 * Uses the get_user_feature_flags database function for efficient querying
 */
async function getDatabaseFeatures(context: FeatureFlagContext): Promise<Partial<FeatureFlags>> {
  try {
    // Import here to avoid circular dependencies
    const { createClient } = await import('@/utils/supabase/server');
    const supabase = await createClient();

    // Use the database function for efficient feature flag retrieval
    const { data, error } = await supabase.rpc('get_user_feature_flags', {
      p_user_id: context.userId as any, // Cast to any since DB types not updated yet
      p_user_role: context.userRole as any,
      p_environment: context.environment as any
    } as any); // Cast the whole params object until types are regenerated

    console.log('Database RPC call result:', {
      context,
      data,
      error,
      dataLength: data?.length
    });

    if (error) {
      // If the function doesn't exist yet (migration not run), fall back to table query
      if (error.code === '42883') { // Function doesn't exist
        console.warn('Database function get_user_feature_flags not found, falling back to table query');
        return await getDatabaseFeaturesTableQuery(context);
      }
      console.error('Error fetching database feature flags:', error);
      return {};
    }

    if (!data || data.length === 0) {
      console.log('No feature flags found in database for context:', context);
      return {};
    }

    const processed = processFeatureFlagData(data);
    console.log('Processed feature flags:', processed);
    return processed;
  } catch (error) {
    console.error('Error in getDatabaseFeatures:', error);
    return {};
  }
}

/**
 * Main feature flag resolution with priority order:
 * 1. URL Override (highest priority - for testing/debugging)
 * 2. Database Configuration (user/role specific)
 * 3. Environment Variables (deployment specific)
 * 4. Default Values (fallback)
 */
export async function resolveFeatureFlags(
  context: FeatureFlagContext,
  urlOverride?: string
): Promise<FeatureFlags> {
  // Start with defaults
  let features: FeatureFlags = { ...DEFAULT_FEATURES };

  // Apply environment-based flags
  const envFeatures = getEnvironmentFeatures();
  features = { ...features, ...envFeatures };

  // Apply database-driven flags (user/role specific)
  const dbFeatures = await getDatabaseFeatures(context);
  console.log('Database features loaded:', {
    context,
    dbFeatures,
    featureCount: Object.keys(dbFeatures).length
  });
  features = { ...features, ...dbFeatures };

  // Apply URL overrides (highest priority)
  const urlFeatures = parseUrlOverride(urlOverride);
  features = { ...features, ...urlFeatures };

  return features;
}

/**
 * Simple feature flag checker
 */
export function isFeatureEnabled(
  features: FeatureFlags,
  featureName: keyof FeatureFlags
): boolean {
  return features[featureName] === true;
}

/**
 * Feature flag logging for debugging
 */
export function logFeatureFlags(features: FeatureFlags, context: FeatureFlagContext): void {
  if (features.enableDebugMode) {
    console.log('🚩 Feature Flags:', {
      features,
      context,
      environment: process.env.NODE_ENV,
    });
  }
}

/**
 * Legacy support - maintains backward compatibility
 */
export interface SearchParamsWithOverride {
  configoverride?: string;
}

export function parseConfigOverride(configOverrideString?: string): { skipMembershipCheck: boolean } {
  const urlFeatures = parseUrlOverride(configOverrideString);
  return {
    skipMembershipCheck: urlFeatures.skipMembershipCheck || false,
  };
}
