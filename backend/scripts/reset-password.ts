#!/usr/bin/env node
/**
 * Admin script to reset a user's password using Better Auth
 * 
 * Usage:
 *   pnpm run reset-password <email> <new-password>
 *   or
 *   npm run reset-password <email> <new-password>
 * 
 * Example:
 *   pnpm run reset-password user@example.com "NewSecurePassword123"
 * 
 * Environment variables required (from .dev.vars or .env):
 *   - DATABASE_URL: Neon database connection string
 *   - BETTER_AUTH_SECRET: Secret key for Better Auth
 * 
 * Note: Make sure to install dependencies first:
 *   pnpm install
 * 
 * Implementation Note:
 *   Better Auth's setPassword API requires a user session, so it cannot be used
 *   for admin password resets. This script uses bcryptjs directly with the same
 *   configuration Better Auth uses internally (10 rounds) to ensure compatibility.
 *   See: https://github.com/better-auth/better-auth/issues/1173
 */

import bcrypt from 'bcryptjs';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq, and } from 'drizzle-orm';
import { normalizeDatabaseUrl } from '../src/db';
import { user, account } from '../src/db/schema';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables from .dev.vars or .env
const devVarsPath = path.join(process.cwd(), '.dev.vars');
const envPath = path.join(process.cwd(), '.env');

if (fs.existsSync(devVarsPath)) {
  const envContent = fs.readFileSync(devVarsPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').replace(/^["']|["']$/g, '');
        process.env[key.trim()] = value.trim();
      }
    }
  });
} else if (fs.existsSync(envPath)) {
  // Load .env file manually
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').replace(/^["']|["']$/g, '');
        process.env[key.trim()] = value.trim();
      }
    }
  });
}

// Validate required environment variables
const requiredEnvVars = ['DATABASE_URL', 'BETTER_AUTH_SECRET'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingVars.forEach(varName => console.error(`   - ${varName}`));
  console.error('\nPlease set these in .dev.vars or .env file');
  process.exit(1);
}

// Get command line arguments
const args = process.argv.slice(2);

if (args.length < 2) {
  console.error('❌ Usage: reset-password.ts <email> <new-password>');
  console.error('\nExample:');
  console.error('  npm run reset-password user@example.com "NewSecurePassword123"');
  process.exit(1);
}

const [email, newPassword] = args;

// Validate email format
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) {
  console.error(`❌ Invalid email format: ${email}`);
  process.exit(1);
}

// Validate password
if (!newPassword || newPassword.length < 8) {
  console.error('❌ Password must be at least 8 characters long');
  process.exit(1);
}

async function resetPassword() {
  try {
    console.log(`\n🔐 Resetting password for user: ${email}`);
    console.log('📡 Connecting to database...');

    // Connect to database
    const sql = neon(normalizeDatabaseUrl(process.env.DATABASE_URL!));
    const db = drizzle(sql);

    // Find user by email
    console.log('🔍 Looking up user...');
    const users = await db
      .select()
      .from(user)
      .where(eq(user.email, email))
      .limit(1);

    if (users.length === 0) {
      console.error(`❌ User not found with email: ${email}`);
      process.exit(1);
    }

    const userRecord = users[0];
    console.log(`✅ Found user: ${userRecord.name} (ID: ${userRecord.id})`);

    // Find the account record for this user (where password is stored)
    const accounts = await db
      .select()
      .from(account)
      .where(
        and(eq(account.userId, userRecord.id), eq(account.providerId, 'credential')),
      )
      .limit(1);

    if (accounts.length === 0) {
      console.error(`❌ No account found for user: ${email}`);
      console.error('   This user may not have email/password authentication set up.');
      process.exit(1);
    }

    // Note: Better Auth's setPassword API requires a user session, so it cannot be used
    // for admin password resets. According to Better Auth documentation and GitHub issues,
    // admin password reset functionality is not yet available in the API.
    // 
    // Therefore, we use bcryptjs directly with the same configuration Better Auth uses
    // internally (10 rounds) to ensure compatibility with Better Auth's password verification.
    console.log('🔑 Hashing password (using bcrypt with 10 rounds, matching Better Auth)...');
    
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update password in the database
    console.log('💾 Updating password in database...');
    await db
      .update(account)
      .set({
        password: hashedPassword,
        updatedAt: new Date(),
      })
      .where(eq(account.userId, userRecord.id));

    console.log('✅ Password reset successfully!');
    console.log(`\n📝 Summary:`);
    console.log(`   Email: ${email}`);
    console.log(`   User ID: ${userRecord.id}`);
    console.log(`   User Name: ${userRecord.name}`);
    console.log(`   Password: [REDACTED]`);
    console.log('\n⚠️  Please notify the user about this password change.');

  } catch (error: unknown) {
    console.error('❌ Unexpected error:');
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`   ${msg}`);
    if (error instanceof Error && error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run the script
resetPassword()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });

