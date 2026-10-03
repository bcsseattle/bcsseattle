/**
 * Test script to verify feature flags database functionality
 */

async function testFeatureFlags() {
  try {
    console.log('🧪 Testing Feature Flags System...\n');
    
    // Try importing the modules
    console.log('Importing modules...');
    const { resolveFeatureFlags } = await import('./utils/feature-flags.js');
    const { FEATURE_FLAGS } = await import('./utils/feature-flag-constants.js');
    console.log('✅ Modules imported successfully\n');

    // Test 1: Default context (no user, production environment)
    console.log('1. Testing default context:');
    const defaultFlags = await resolveFeatureFlags({
      environment: 'production'
    });
    console.log('Default flags:', defaultFlags);
    console.log('');

    // Test 2: Development environment (should enable debug mode)
    console.log('2. Testing development environment:');
    const devFlags = await resolveFeatureFlags({
      environment: 'development'
    });
    console.log('Development flags:', devFlags);
    console.log('');

    // Test 3: With user context
    console.log('3. Testing with user context:');
    const userFlags = await resolveFeatureFlags({
      userId: 'test-user-123',
      userRole: 'active',
      environment: 'development'
    });
    console.log('User flags:', userFlags);
    console.log('');

    // Test 4: URL override
    console.log('4. Testing URL override:');
    const overrideConfig = JSON.stringify({
      features: {
        skipMembershipCheck: true,
        enableDebugMode: true
      }
    });
    const overrideFlags = await resolveFeatureFlags({
      environment: 'production'
    }, overrideConfig);
    console.log('Override flags:', overrideFlags);
    console.log('');

    console.log('✅ Feature flags test completed!');
  } catch (error) {
    console.error('❌ Test failed:');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testFeatureFlags().catch(console.error);
