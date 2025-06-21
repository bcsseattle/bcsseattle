# Feature Flags Usage Guide

This guide shows how to use the industry-standard feature flag system in the BCSS Seattle application.

## Overview

The feature flag system supports multiple sources with priority order:
1. **URL Override** (highest priority) - for testing/debugging
2. **Database Configuration** (user/role specific) - for targeted rollouts
3. **Environment Variables** (deployment specific) - for environment-based features
4. **Default Values** (fallback) - safe defaults

## Available Feature Flags

All feature flags are defined as constants in `/utils/feature-flag-constants.ts`:

```typescript
export const FEATURE_FLAGS = {
  SKIP_MEMBERSHIP_CHECK: 'skipMembershipCheck',
  ALLOW_GUEST_VOTING: 'allowGuestVoting',
  ENABLE_BETA_FEATURES: 'enableBetaFeatures',
  ENABLE_DEBUG_MODE: 'enableDebugMode',
  SHOW_FEATURE_FLAGS: 'showFeatureFlags',
  ENABLE_NEW_UI: 'enableNewUI',
  ALLOW_ANONYMOUS_FEEDBACK: 'allowAnonymousFeedback',
} as const;
```

## Usage in Server Components

### Single Feature Flag

```typescript
import { useServerFeatureFlagSingle } from '@/utils/server-feature-flags';
import { FEATURE_FLAGS } from '@/utils/feature-flag-constants';

export default async function MyPage({ searchParams }: { searchParams: { configoverride?: string } }) {
  const skipChecks = await useServerFeatureFlagSingle(
    FEATURE_FLAGS.SKIP_MEMBERSHIP_CHECK,
    searchParams.configoverride
  );

  if (skipChecks) {
    // Skip membership validation
  }
}
```

### Multiple Feature Flags (Recommended)

```typescript
import { useServerFeatureFlag } from '@/utils/server-feature-flags';
import { FEATURE_FLAGS, createFeatureFlagArray } from '@/utils/feature-flag-constants';

export default async function MyPage({ searchParams }: { searchParams: { configoverride?: string } }) {
  // Define the flags you need
  const requiredFlags = createFeatureFlagArray(
    FEATURE_FLAGS.SKIP_MEMBERSHIP_CHECK,
    FEATURE_FLAGS.ENABLE_DEBUG_MODE,
    FEATURE_FLAGS.ENABLE_BETA_FEATURES
  );
  
  // Get all flags in one call (efficient!)
  const flags = await useServerFeatureFlag(requiredFlags, searchParams.configoverride);
  
  // Use the flags with full type safety
  if (flags[FEATURE_FLAGS.SKIP_MEMBERSHIP_CHECK]) {
    // Skip checks
  }
  
  if (flags[FEATURE_FLAGS.ENABLE_DEBUG_MODE]) {
    console.log('Debug mode active');
  }
}
```

## Testing with URL Overrides

You can override feature flags via URL for testing:

```
# Enable single feature
/elections?configoverride={"features":{"skipMembershipCheck":true}}

# Enable multiple features
/elections?configoverride={"features":{"skipMembershipCheck":true,"enableDebugMode":true}}
```

## Environment Variables

Set feature flags via environment variables:

```env
# .env.local
FF_SKIP_MEMBERSHIP_CHECK=true
FF_ENABLE_BETA_FEATURES=false
FF_ALLOW_GUEST_VOTING=true
NODE_ENV=development  # Automatically enables debug mode
```

## Database-Driven Feature Flags

Feature flags can be configured in the database for user/role-specific targeting:

```sql
-- Enable for specific user
INSERT INTO feature_flags (feature_name, user_id, enabled) VALUES
('skipMembershipCheck', 'user-uuid-here', true);

-- Enable for all active members in development
INSERT INTO feature_flags (feature_name, user_role, environment, enabled) VALUES
('enableBetaFeatures', 'active', 'development', true);

-- Enable globally for staging environment
INSERT INTO feature_flags (feature_name, environment, enabled) VALUES
('allowGuestVoting', 'staging', true);
```

## Best Practices

1. **Use Constants**: Always use `FEATURE_FLAGS` constants to prevent typos
2. **Batch Calls**: Use `useServerFeatureFlag([...])` for multiple flags
3. **Type Safety**: Use `createFeatureFlagArray()` for full TypeScript support
4. **Graceful Degradation**: Features should work even if flags fail to load
5. **Clear Naming**: Feature flag names should be descriptive and action-oriented

## Adding New Feature Flags

1. Add the constant to `FEATURE_FLAGS` in `/utils/feature-flag-constants.ts`
2. Add the default value to `FEATURE_FLAG_DEFAULTS`
3. Update the `FeatureFlags` interface in `/utils/feature-flags.ts`
4. Add environment variable support if needed
5. Update the feature map in `/utils/server-feature-flags.ts`

## Example: Elections Page

See `/app/elections/page.tsx` for a complete working example of the feature flag system in action.
