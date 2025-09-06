#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

async function setupSecrets() {
  const secretsPath = path.join(process.cwd(), 'secrets.env');
  const targetPath = path.join(process.cwd(), '.env');

  try {
    // Check if secrets.env exists (downloaded from GitHub Actions)
    if (fs.existsSync(secretsPath)) {
      console.log('Found secrets.env file, copying to .env...');
      
      // Read the secrets file
      const secretsContent = fs.readFileSync(secretsPath, 'utf8');
      
      // Write to .env
      fs.writeFileSync(targetPath, secretsContent);
      
      console.log('✅ Secrets successfully copied to .env');
      
      // Optionally remove the secrets.env file for security
      fs.unlinkSync(secretsPath);
      console.log('🗑️  Cleaned up secrets.env file');
      
    } else {
      console.log('❌ secrets.env file not found.');
      console.log('Please manually add your MongoDB password to the .env file');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error setting up secrets:', error.message);
    process.exit(1);
  }
}

// Instructions for manual setup
function showInstructions() {
  console.log(`
📋 MongoDB Cloud Setup Instructions:

Create a .env file with your MongoDB credentials:

# MongoDB Cloud Database Configuration
MONGO_USERNAME=dpkcmn_db_user
MONGO_PASSWORD=
MONGO_CLUSTER=pomodoro-web.sidvw0l.mongodb.net
MONGO_DATABASE=pomodoro-web
VITE_MONGODB_URI=mongodb+srv://dpkcmn_db_user:@pomodoro-web.sidvw0l.mongodb.net/?retryWrites=true&w=majority&appName=pomodoro-web
VITE_MONGODB_DB_NAME=pomodoro-web

Note: Please enter your MongoDB password in MONGO_PASSWORD field above
  `);
}

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  showInstructions();
} else {
  setupSecrets();
}