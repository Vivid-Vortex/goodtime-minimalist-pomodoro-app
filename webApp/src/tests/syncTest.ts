// Simple sync functionality test
// This can be run in browser console to test the sync functionality

export async function testStartupSync() {
  console.log('🧪 Testing startup sync functionality...');
  
  try {
    // Get database manager
    const { default: DatabaseManager } = await import('../database/database');
    const dbManager = DatabaseManager.getInstance();
    
    console.log('✅ Database manager initialized');
    
    // Check sync status
    const syncStatus = await dbManager.getStartupSyncStatus();
    console.log('📊 Sync status:', syncStatus);
    
    // Check if cloud is connected
    const isCloudConnected = dbManager.isCloudConnected();
    console.log(`🌐 Cloud connected: ${isCloudConnected}`);
    
    // Check if real-time sync is active
    const isRealtimeActive = dbManager.isRealtimeSyncActive();
    console.log(`⚡ Real-time sync active: ${isRealtimeActive}`);
    
    // Get some sample data
    const sessions = await dbManager.getAllSessions();
    const labels = await dbManager.getAllLabels();
    const profiles = await dbManager.getAllTimerProfiles();
    
    console.log('📊 Local data counts:', {
      sessions: sessions.length,
      labels: labels.length,
      profiles: profiles.length
    });
    
    console.log('✅ Startup sync test completed successfully!');
    
    return {
      success: true,
      cloudConnected: isCloudConnected,
      realtimeSyncActive: isRealtimeActive,
      dataCount: {
        sessions: sessions.length,
        labels: labels.length,
        profiles: profiles.length
      },
      syncStatus
    };
    
  } catch (error) {
    console.error('❌ Startup sync test failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function testForceSync() {
  console.log('🧪 Testing force sync functionality...');
  
  try {
    const { default: DatabaseManager } = await import('../database/database');
    const dbManager = DatabaseManager.getInstance();
    
    console.log('🔄 Forcing startup sync...');
    await dbManager.forceStartupSync();
    console.log('✅ Force sync completed');
    
    const newStatus = await dbManager.getStartupSyncStatus();
    console.log('📊 New sync status:', newStatus);
    
    return { success: true, syncStatus: newStatus };
    
  } catch (error) {
    console.error('❌ Force sync test failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Auto-run basic test when imported
if (typeof window !== 'undefined') {
  // Add to window for manual testing
  (window as any).testStartupSync = testStartupSync;
  (window as any).testForceSync = testForceSync;
  
  console.log('🧪 Sync test functions available:');
  console.log('- testStartupSync(): Test basic sync functionality');
  console.log('- testForceSync(): Test force sync functionality');
}

export default { testStartupSync, testForceSync };