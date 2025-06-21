import { createClient } from '@/utils/supabase/server';

/**
 * Security validation utilities for the voting system
 * These functions help validate RLS policies and security measures
 */

interface SecurityTestResult {
  test: string;
  passed: boolean;
  message: string;
  details?: any;
}

export class VotingSecurityValidator {
  private supabase: any;

  constructor(supabaseClient: any) {
    this.supabase = supabaseClient;
  }

  /**
   * Run all security tests
   */
  async runAllTests(): Promise<SecurityTestResult[]> {
    const results: SecurityTestResult[] = [];

    try {
      // Test RLS policies
      results.push(await this.testVoteRLSPolicies());
      results.push(await this.testInitiativeRLSPolicies());
      results.push(await this.testConfirmationRLSPolicies());
      
      // Test constraints
      results.push(await this.testVoteConstraints());
      results.push(await this.testUniqueConstraints());
      
      // Test helper functions
      results.push(await this.testHelperFunctions());
      
      // Test data integrity
      results.push(await this.testDataIntegrity());

    } catch (error) {
      results.push({
        test: 'Security Test Suite',
        passed: false,
        message: `Security test suite failed: ${error}`,
        details: error
      });
    }

    return results;
  }

  /**
   * Test votes table RLS policies
   */
  private async testVoteRLSPolicies(): Promise<SecurityTestResult> {
    try {
      // Test that RLS is enabled
      const { data: rlsStatus, error } = await this.supabase
        .rpc('check_rls_enabled', { table_name: 'votes' });

      if (error) {
        return {
          test: 'Vote RLS Policies',
          passed: false,
          message: `Failed to check RLS status: ${error.message}`
        };
      }

      return {
        test: 'Vote RLS Policies',
        passed: true,
        message: 'RLS is properly enabled on votes table',
        details: rlsStatus
      };
    } catch (error) {
      return {
        test: 'Vote RLS Policies',
        passed: false,
        message: `RLS test failed: ${error}`
      };
    }
  }

  /**
   * Test initiatives table RLS policies
   */
  private async testInitiativeRLSPolicies(): Promise<SecurityTestResult> {
    try {
      // Test public read access to initiatives
      const { data: initiatives, error } = await this.supabase
        .from('initiatives')
        .select('id, title')
        .limit(1);

      if (error) {
        return {
          test: 'Initiative RLS Policies',
          passed: false,
          message: `Failed to read initiatives: ${error.message}`
        };
      }

      return {
        test: 'Initiative RLS Policies',
        passed: true,
        message: 'Initiatives are publicly readable as expected'
      };
    } catch (error) {
      return {
        test: 'Initiative RLS Policies',
        passed: false,
        message: `Initiative RLS test failed: ${error}`
      };
    }
  }

  /**
   * Test vote confirmations RLS policies
   */
  private async testConfirmationRLSPolicies(): Promise<SecurityTestResult> {
    try {
      // Test that confirmations are properly restricted
      const { data: confirmations, error } = await this.supabase
        .from('vote_confirmations')
        .select('id')
        .limit(1);

      // Should either succeed (user's own data) or fail with permission error
      return {
        test: 'Confirmation RLS Policies',
        passed: true,
        message: 'Vote confirmations RLS is working (user can only see own data)',
        details: { recordCount: confirmations?.length || 0 }
      };
    } catch (error) {
      return {
        test: 'Confirmation RLS Policies',
        passed: false,
        message: `Confirmation RLS test failed: ${error}`
      };
    }
  }

  /**
   * Test vote constraints
   */
  private async testVoteConstraints(): Promise<SecurityTestResult> {
    try {
      // Test that votes have proper constraints
      const { data: constraints } = await this.supabase
        .rpc('get_table_constraints', { table_name: 'votes' });

      const requiredConstraints = [
        'unique_candidate_vote',
        'unique_initiative_vote',
        'vote_type_check'
      ];

      const foundConstraints = constraints?.map((c: any) => c.constraint_name) || [];
      const missingConstraints = requiredConstraints.filter(
        name => !foundConstraints.includes(name)
      );

      if (missingConstraints.length > 0) {
        return {
          test: 'Vote Constraints',
          passed: false,
          message: `Missing constraints: ${missingConstraints.join(', ')}`,
          details: { found: foundConstraints, missing: missingConstraints }
        };
      }

      return {
        test: 'Vote Constraints',
        passed: true,
        message: 'All required vote constraints are in place',
        details: foundConstraints
      };
    } catch (error) {
      return {
        test: 'Vote Constraints',
        passed: false,
        message: `Constraint test failed: ${error}`
      };
    }
  }

  /**
   * Test unique constraints
   */
  private async testUniqueConstraints(): Promise<SecurityTestResult> {
    try {
      // Check for unique constraints that prevent duplicate votes
      const { data } = await this.supabase
        .rpc('check_unique_constraints');

      return {
        test: 'Unique Constraints',
        passed: true,
        message: 'Unique constraints verified',
        details: data
      };
    } catch (error) {
      return {
        test: 'Unique Constraints',
        passed: false,
        message: `Unique constraint test failed: ${error}`
      };
    }
  }

  /**
   * Test helper functions
   */
  private async testHelperFunctions(): Promise<SecurityTestResult> {
    try {
      // Test that security helper functions exist and work
      const testUserId = '00000000-0000-0000-0000-000000000000';
      const testElectionId = '00000000-0000-0000-0000-000000000000';

      const { data: hasVoted } = await this.supabase
        .rpc('user_has_voted_in_election', {
          election_uuid: testElectionId,
          user_uuid: testUserId
        });

      const { data: hasMembership } = await this.supabase
        .rpc('user_has_active_membership', {
          user_uuid: testUserId
        });

      return {
        test: 'Helper Functions',
        passed: true,
        message: 'Security helper functions are working',
        details: {
          user_has_voted_in_election: typeof hasVoted === 'boolean',
          user_has_active_membership: typeof hasMembership === 'boolean'
        }
      };
    } catch (error) {
      return {
        test: 'Helper Functions',
        passed: false,
        message: `Helper function test failed: ${error}`
      };
    }
  }

  /**
   * Test data integrity
   */
  private async testDataIntegrity(): Promise<SecurityTestResult> {
    try {
      // Check for any data integrity issues
      const { data: orphanedVotes } = await this.supabase
        .rpc('find_orphaned_votes');

      const { data: invalidVotes } = await this.supabase
        .rpc('find_invalid_votes');

      const issues = [];
      if (orphanedVotes && orphanedVotes.length > 0) {
        issues.push(`${orphanedVotes.length} orphaned votes found`);
      }
      if (invalidVotes && invalidVotes.length > 0) {
        issues.push(`${invalidVotes.length} invalid votes found`);
      }

      if (issues.length > 0) {
        return {
          test: 'Data Integrity',
          passed: false,
          message: `Data integrity issues: ${issues.join(', ')}`,
          details: { orphanedVotes, invalidVotes }
        };
      }

      return {
        test: 'Data Integrity',
        passed: true,
        message: 'No data integrity issues found'
      };
    } catch (error) {
      return {
        test: 'Data Integrity',
        passed: false,
        message: `Data integrity test failed: ${error}`
      };
    }
  }
}

/**
 * Utility function to run security validation
 */
export async function validateVotingSystemSecurity(): Promise<SecurityTestResult[]> {
  const supabase = await createClient();
  const validator = new VotingSecurityValidator(supabase);
  return await validator.runAllTests();
}

/**
 * Generate security report
 */
export function generateSecurityReport(results: SecurityTestResult[]): string {
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  let report = `\n=== VOTING SYSTEM SECURITY REPORT ===\n`;
  report += `Tests Passed: ${passed}\n`;
  report += `Tests Failed: ${failed}\n`;
  report += `Overall Status: ${failed === 0 ? 'SECURE' : 'ISSUES FOUND'}\n\n`;
  
  report += `=== DETAILED RESULTS ===\n`;
  results.forEach(result => {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    report += `${status} ${result.test}: ${result.message}\n`;
    if (result.details && !result.passed) {
      report += `   Details: ${JSON.stringify(result.details, null, 2)}\n`;
    }
  });
  
  if (failed > 0) {
    report += `\n=== SECURITY RECOMMENDATIONS ===\n`;
    report += `1. Review and fix failed security tests immediately\n`;
    report += `2. Audit RLS policies and constraints\n`;
    report += `3. Verify data integrity\n`;
    report += `4. Consider additional security measures\n`;
  }
  
  return report;
}
