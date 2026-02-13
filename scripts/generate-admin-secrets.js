#!/usr/bin/env node

/**
 * ============================================================
 * CoverGrab Admin Secrets Generator
 * ============================================================
 * 
 * This script generates all the environment variables needed
 * for the CoverGrab admin dashboard. It uses Node.js built-in
 * crypto module - NO external dependencies required!
 * 
 * USAGE:
 * ------
 * 1. Download this single file to your computer
 * 2. Open terminal/command prompt
 * 3. Run: node generate-admin-secrets.js "YourStrongPassword"
 * 4. Copy the output to Netlify environment variables
 * 
 * EXAMPLE:
 * --------
 *   node generate-admin-secrets.js "MySecureP@ssw0rd!"
 * 
 * If you don't provide a password, it uses a default (change it!)
 */

const crypto = require('crypto');

// Simple bcrypt-like hash using Node's built-in crypto
// For production, you should use the actual bcrypt package
function generateSecureHash(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `pbkdf2:${salt}:${hash}`;
}

// Generate a secure random string
function generateRandomSecret(length = 64) {
  return crypto.randomBytes(length).toString('hex');
}

// Generate TOTP secret (base32)
function generateTotpSecret() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let secret = '';
  const bytes = crypto.randomBytes(20);
  for (let i = 0; i < 20; i++) {
    secret += chars[bytes[i] % 32];
  }
  return secret;
}

// Main
console.log('\n' + '='.repeat(60));
console.log('🔐 CoverGrab Admin Secrets Generator');
console.log('='.repeat(60) + '\n');

const password = process.argv[2] || 'ChangeThisPassword123!';

console.log('📧 ADMIN_EMAIL:');
console.log('   Set this to your email address\n');

console.log('🔑 ADMIN_PASSWORD_HASH:');
console.log('   Password used:', password === 'ChangeThisPassword123!' ? '(default - CHANGE THIS!)' : '(custom)');
console.log('   Hash:', generateSecureHash(password));
console.log('');

console.log('🎫 JWT_SECRET:');
console.log('  ', generateRandomSecret(64));
console.log('');

console.log('📱 TOTP_SECRET (optional, for 2FA):');
console.log('  ', generateTotpSecret());
console.log('');

console.log('🧂 IP_HASH_SALT (if not already set):');
console.log('  ', generateRandomSecret(32));
console.log('');

console.log('='.repeat(60));
console.log('⚠️  IMPORTANT:');
console.log('   1. Change the default password!');
console.log('   2. Copy these values to Netlify Environment Variables');
console.log('   3. Never commit these secrets to git!');
console.log('='.repeat(60) + '\n');

// Also output in a copy-paste friendly format
console.log('📋 Copy-paste format for Netlify:\n');
console.log(`ADMIN_EMAIL=your-email@example.com`);
console.log(`ADMIN_PASSWORD_HASH=${generateSecureHash(password)}`);
console.log(`JWT_SECRET=${generateRandomSecret(64)}`);
console.log(`TOTP_SECRET=${generateTotpSecret()}`);
console.log(`IP_HASH_SALT=${generateRandomSecret(32)}`);
console.log('');
