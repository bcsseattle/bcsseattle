/**
 * Client-safe election type configuration utilities
 * These functions don't require database access and can be used in both client and server components
 */

import { ElectionType } from '@/types';

// Type-specific voting behavior configuration
interface ElectionTypeConfig {
  defaultSeparateVotingPeriods: boolean;
  defaultShowUnopposedStatus: boolean;
  allowsUnopposedCandidates: boolean;
  typicalDurationDays: number;
  description: string;
}

/**
 * Election type-specific configurations
 * These are constants and can be used safely in client components
 */
export const ELECTION_TYPE_CONFIGS: Record<ElectionType, ElectionTypeConfig> = {
  leadership: {
    defaultSeparateVotingPeriods: true,
    defaultShowUnopposedStatus: true,
    allowsUnopposedCandidates: true,
    typicalDurationDays: 14,
    description: 'Leadership elections for organizational positions'
  },
  initiative: {
    defaultSeparateVotingPeriods: false,
    defaultShowUnopposedStatus: false,
    allowsUnopposedCandidates: false,
    typicalDurationDays: 21,
    description: 'Community initiative and ballot measure voting'
  },
  board: {
    defaultSeparateVotingPeriods: true,
    defaultShowUnopposedStatus: true,
    allowsUnopposedCandidates: true,
    typicalDurationDays: 10,
    description: 'Board member elections and governance votes'
  }
};

// Type definitions for election voting periods
export interface ElectionVotingConfig {
  candidate_voting_start?: string | null;
  candidate_voting_end?: string | null;
  enable_separate_voting_periods?: boolean;
  show_unopposed_status?: boolean;
}

/**
 * Get type-aware defaults for creating new elections
 * Client-safe - no database access required
 */
export function getElectionTypeDefaults(electionType: ElectionType): Partial<ElectionVotingConfig> {
  const typeConfig = ELECTION_TYPE_CONFIGS[electionType];
  return {
    enable_separate_voting_periods: typeConfig.defaultSeparateVotingPeriods,
    show_unopposed_status: typeConfig.defaultShowUnopposedStatus
  };
}

/**
 * Check if an election type supports unopposed candidates
 * Client-safe - no database access required
 */
export function supportsUnopposedCandidates(electionType: ElectionType): boolean {
  return ELECTION_TYPE_CONFIGS[electionType]?.allowsUnopposedCandidates ?? true;
}

/**
 * Get human-readable description for election type
 * Client-safe - no database access required
 */
export function getElectionTypeDescription(electionType: ElectionType): string {
  return ELECTION_TYPE_CONFIGS[electionType]?.description ?? 'Election';
}

/**
 * Get suggested duration for election type
 * Client-safe - no database access required
 */
export function getTypicalElectionDuration(electionType: ElectionType): number {
  return ELECTION_TYPE_CONFIGS[electionType]?.typicalDurationDays ?? 14;
}

/**
 * Get appropriate icon name for election type
 * Client-safe - returns string that can be used with icon libraries
 */
export function getElectionTypeIcon(electionType: ElectionType): string {
  switch (electionType) {
    case 'leadership':
      return 'crown';
    case 'board':
      return 'building';
    case 'initiative':
      return 'vote';
    default:
      return 'users';
  }
}

/**
 * Get type-specific UI colors
 * Client-safe - returns CSS classes or color codes
 */
export function getElectionTypeColors(electionType: ElectionType): {
  primary: string;
  secondary: string;
  badge: string;
} {
  switch (electionType) {
    case 'leadership':
      return {
        primary: 'text-blue-900',
        secondary: 'text-blue-700',
        badge: 'bg-blue-100 text-blue-800 border-blue-300'
      };
    case 'board':
      return {
        primary: 'text-purple-900',
        secondary: 'text-purple-700',
        badge: 'bg-purple-100 text-purple-800 border-purple-300'
      };
    case 'initiative':
      return {
        primary: 'text-green-900',
        secondary: 'text-green-700',
        badge: 'bg-green-100 text-green-800 border-green-300'
      };
    default:
      return {
        primary: 'text-gray-900',
        secondary: 'text-gray-700',
        badge: 'bg-gray-100 text-gray-800 border-gray-300'
      };
  }
}
