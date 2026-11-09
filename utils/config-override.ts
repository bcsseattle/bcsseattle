/**
 * Utility functions for handling configuration overrides in server components
 */

export interface ConfigOverride {
  features: {
    [key: string]: boolean;
  };
}

export interface ParsedConfigOverride {
  skipMembershipCheck: boolean;
  // Add other feature flags here as needed
}

/**
 * Parses a config override JSON string and extracts feature flags
 * @param configOverrideString - JSON string from search params
 * @returns Parsed configuration with feature flags
 */
export function parseConfigOverride(configOverrideString?: string): ParsedConfigOverride {
  const defaultConfig: ParsedConfigOverride = {
    skipMembershipCheck: false,
  };

  if (!configOverrideString) {
    return defaultConfig;
  }

  try {
    const config: ConfigOverride = JSON.parse(configOverrideString);
    
    return {
      skipMembershipCheck: config?.features?.skipMembershipCheck === true,
      // Add other feature flags here as they're needed
    };
  } catch (error) {
    console.error('Error parsing configoverride:', error);
    return defaultConfig;
  }
}

/**
 * Type definition for search params with config override
 */
export interface SearchParamsWithOverride {
  configoverride?: string;
}
