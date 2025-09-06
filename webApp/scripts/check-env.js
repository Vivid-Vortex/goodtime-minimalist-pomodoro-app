#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function checkEnvironment() {
  const envPath = path.join(process.cwd(), '.env');
  
  console.log('🔍 Checking environment configuration...');
  
  if (fs.existsSync(envPath)) {
    console.log('✅ .env file found');
    
    // Validate .env file content
    const envContent = fs.readFileSync(envPath, 'utf8');
    const hasMongoUri = envContent.includes('VITE_MONGODB_URI');
    const hasDbName = envContent.includes('VITE_MONGODB_DB_NAME');
    
    if (hasMongoUri && hasDbName) {
      console.log('✅ Environment variables properly configured');
      return true;
    } else {
      console.log('⚠️  .env file exists but missing required variables');
      console.log('🔄 Attempting to update environment configuration...');
    }
  } else {
    console.log('❌ .env file not found');
    console.log('🔄 Attempting to set up environment...');
  }

  // Try to setup environment automatically
  return await attemptAutoSetup();
}

async function attemptAutoSetup() {
  console.log('📥 Attempting automatic environment setup...');
  
  try {
    // Check if we're in a git repository
    const isGitRepo = fs.existsSync('.git');
    if (!isGitRepo) {
      console.log('⚠️  Not in a git repository, cannot auto-download secrets');
      return createFallbackEnv();
    }

    // Try to get the repository info
    let repoInfo;
    try {
      const remoteUrl = execSync('git config --get remote.origin.url', { encoding: 'utf8' }).trim();
      repoInfo = parseGitUrl(remoteUrl);
    } catch (error) {
      console.log('⚠️  Cannot determine git repository info');
      return createFallbackEnv();
    }

    if (!repoInfo) {
      return createFallbackEnv();
    }

    console.log('📋 Setup Instructions:');
    console.log('');
    console.log('Manually create .env file with your MongoDB credentials');
    
    return createFallbackEnv();
    
  } catch (error) {
    console.error('❌ Error during auto-setup:', error.message);
    return createFallbackEnv();
  }
}

function parseGitUrl(url) {
  // Handle both SSH and HTTPS git URLs
  const sshMatch = url.match(/git@github\.com:([^/]+)\/(.+)\.git/);
  const httpsMatch = url.match(/https:\/\/github\.com\/([^/]+)\/(.+)(?:\.git)?/);
  
  if (sshMatch) {
    return { owner: sshMatch[1], repo: sshMatch[2] };
  } else if (httpsMatch) {
    return { owner: httpsMatch[1], repo: httpsMatch[2].replace('.git', '') };
  }
  
  return null;
}

function createFallbackEnv() {
  const envPath = path.join(process.cwd(), '.env');
  const fallbackContent = `# MongoDB Cloud Database Configuration
MONGO_USERNAME=dpkcmn_db_user
MONGO_PASSWORD=
MONGO_CLUSTER=pomodoro-web.sidvw0l.mongodb.net
MONGO_DATABASE=pomodoro-web
VITE_MONGODB_URI=mongodb+srv://dpkcmn_db_user:@pomodoro-web.sidvw0l.mongodb.net/?retryWrites=true&w=majority&appName=pomodoro-web
VITE_MONGODB_DB_NAME=pomodoro-web

# Note: Please enter your MongoDB password in MONGO_PASSWORD field above
# This app will work in local-only mode without MongoDB
# Data will be stored in IndexedDB instead
`;

  try {
    fs.writeFileSync(envPath, fallbackContent);
    console.log('📄 Created .env file with template');
    console.log('⚠️  Please update .env with your actual MongoDB password');
    console.log('💡 App will run in local-only mode until MongoDB is properly configured');
    return true;
  } catch (error) {
    console.error('❌ Failed to create .env file:', error.message);
    console.log('💡 App will run in local-only mode (IndexedDB)');
    return true; // Continue anyway, app can work without MongoDB
  }
}

// Run the check
checkEnvironment()
  .then((success) => {
    if (success) {
      console.log('🚀 Environment check complete - ready to start!');
      process.exit(0);
    } else {
      console.log('⚠️  Environment setup incomplete but app can still run');
      process.exit(0);
    }
  })
  .catch((error) => {
    console.error('💥 Environment check failed:', error.message);
    console.log('💡 App will run in local-only mode');
    process.exit(0); // Don't fail the build, just warn
  });