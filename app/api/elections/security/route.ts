import { type NextRequest, NextResponse } from 'next/server';
import { isCurrentUserAdmin } from '@/utils/auth-helpers/server';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { validateVotingSystemSecurity, generateSecurityReport } from '@/utils/elections/security-validator';

// GET - Run security validation tests
export async function GET() {
  try {
    // The report exposes voter IDs and confirmation codes: admins only (BUG-033).
    if (!(await isCurrentUserAdmin())) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Run security validation tests
    const testResults = await validateVotingSystemSecurity();
    
    // Generate report
    const report = generateSecurityReport(testResults);
    
    // Check if all tests passed
    const allTestsPassed = testResults.every(result => result.passed);
    
    return NextResponse.json({
      success: true,
      securityStatus: allTestsPassed ? 'SECURE' : 'ISSUES_FOUND',
      testsRun: testResults.length,
      testsPassed: testResults.filter(r => r.passed).length,
      testsFailed: testResults.filter(r => !r.passed).length,
      results: testResults,
      report
    });

  } catch (error) {
    console.error('Security validation error:', error);
    return NextResponse.json({ 
      error: 'Failed to run security validation',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST - Run specific security test
export async function POST(request: NextRequest) {
  try {
    // The report exposes voter IDs and confirmation codes: admins only (BUG-033).
    if (!(await isCurrentUserAdmin())) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    const supabase = supabaseAdmin;

    const { testName, electionId } = await request.json();

    let result;
    
    switch (testName) {
      case 'voting_stats':
        if (!electionId) {
          return NextResponse.json({ error: 'Election ID required for voting stats' }, { status: 400 });
        }
        
        const { data: stats, error: statsError } = await supabase
          .rpc('get_voting_security_stats', { election_uuid: electionId });
          
        if (statsError) {
          throw statsError;
        }
        
        result = { stats };
        break;
        
      case 'duplicate_votes':
        const { data: duplicates, error: duplicateError } = await supabase
          .rpc('find_duplicate_votes');
          
        if (duplicateError) {
          throw duplicateError;
        }
        
        result = { duplicates };
        break;
        
      case 'orphaned_votes':
        const { data: orphaned, error: orphanedError } = await supabase
          .rpc('find_orphaned_votes');
          
        if (orphanedError) {
          throw orphanedError;
        }
        
        result = { orphaned };
        break;
        
      case 'invalid_votes':
        const { data: invalid, error: invalidError } = await supabase
          .rpc('find_invalid_votes');
          
        if (invalidError) {
          throw invalidError;
        }
        
        result = { invalid };
        break;
        
      default:
        return NextResponse.json({ error: 'Unknown test name' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      testName,
      result
    });

  } catch (error) {
    console.error('Specific security test error:', error);
    return NextResponse.json({ 
      error: 'Failed to run security test',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
