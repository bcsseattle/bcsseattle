# Feature Flag System Documentation

## Overview

This application uses a comprehensive feature flag system that follows industry standards, supporting multiple sources and priority-based resolution.

## Feature Flag Sources (Priority Order)

1. **URL Override** (Highest Priority) - For testing/debugging
2. **Database Configuration** - User/role specific settings
3. **Environment Variables** - Deployment specific
4. **Default Values** (Fallback)

## Available Feature Flags

### `skipMembershipCheck`
- **Purpose**: Bypasses member status validation on protected pages
- **Usage**: Allows testing of protected pages without going through full membership flow
- **Default**: `false`

### `enableBetaFeatures`
- **Purpose**: Enables experimental features for testing
- **Default**: `false`

### `allowGuestVoting`
- **Purpose**: Allows non-members to participate in voting
- **Default**: `false`

### `enableDebugMode`
- **Purpose**: Shows debug information and logs feature flag context
- **Default**: `true` in development, `false` in production

## Usage Examples

### Server Components (Next.js)

```typescript
import { useServerFeatureFlags } from '@/utils/server-feature-flags';

export default async function MyPage({ searchParams }: { searchParams: { configoverride?: string } }) {
  // Get feature flags
  const features = await useServerFeatureFlags(searchParams.configoverride);
  
  // Use feature flags
  if (!features.skipMembershipCheck) {
    // Perform membership checks
  }
  
  return (
    <div>
      {features.enableBetaFeatures && (
        <div>Beta Feature Content</div>
      )}
    </div>
  );
}
```

### URL Override Testing

You can override feature flags via URL parameters for testing:

```
# Enable skip membership check
/elections?configoverride={"features":{"skipMembershipCheck":true}}

# Enable multiple features
/elections?configoverride={"features":{"skipMembershipCheck":true,"enableDebugMode":true}}
```

### Environment Variables

Add to your `.env.local` file:

```bash
# Feature Flag Environment Variables
FF_SKIP_MEMBERSHIP_CHECK=false
FF_ENABLE_BETA_FEATURES=false
FF_ALLOW_GUEST_VOTING=false
```

### Database Configuration

Feature flags can be configured in the database for specific users or roles:

```sql
-- User-specific feature flag
INSERT INTO feature_flags (feature_name, user_id, enabled, description) 
VALUES ('skipMembershipCheck', 'user-uuid-here', true, 'Skip membership check for this user');

-- Role-based feature flag
INSERT INTO feature_flags (feature_name, user_role, environment, enabled, description) 
VALUES ('enableBetaFeatures', 'active', 'staging', true, 'Beta features for active members in staging');

-- Environment-wide feature flag
INSERT INTO feature_flags (feature_name, environment, enabled, description) 
VALUES ('allowGuestVoting', 'development', true, 'Guest voting in development');
```

## Implementation Details

### Architecture

- **Core System**: `/utils/feature-flags.ts` - Main feature flag resolution logic
- **Server Utility**: `/utils/server-feature-flags.ts` - Next.js server component integration
- **Database Schema**: `/supabase/migrations/20250620000000_feature_flags.sql`
- **Environment Template**: `/feature-flags.env.example`

### Resolution Priority

The system resolves feature flags in this order:

1. **URL Override**: `?configoverride={"features":{"featureName":true}}`
2. **Database**: User-specific → Role-based → Environment-based
3. **Environment Variables**: `FF_FEATURE_NAME=true`
4. **Defaults**: Hard-coded fallback values

### Security

- Feature flags are read-only via RLS policies
- URL overrides only work for authenticated users
- Database modifications require elevated privileges
- Environment variables are server-side only

### Debugging

When `enableDebugMode` is true, the system logs:
- Active feature flags
- User context (ID, role, environment)
- Resolution source for each flag

## Best Practices

### Naming Convention
- Use camelCase for feature flag names
- Prefix with action verb when possible (`enable`, `allow`, `skip`)
- Be descriptive but concise

### Testing
- Use URL overrides for temporary testing
- Use environment variables for deployment-specific settings
- Use database configuration for user/role-specific permanent settings

### Cleanup
- Remove unused feature flags from code and database
- Document feature flag lifecycle in tickets/PRs
- Consider feature flag expiration dates for temporary flags

## Migration Guide

If you were using the old `parseConfigOverride` system:

```typescript
// Old way
const config = parseConfigOverride(searchParams.configoverride);
if (config.skipMembershipCheck) { ... }

// New way
const features = await useServerFeatureFlags(searchParams.configoverride);
if (features.skipMembershipCheck) { ... }
```

The old system is still supported for backward compatibility, but new code should use the new feature flag system.
