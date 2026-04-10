# Admin CLI Reference

This document describes the command-line tools available for administering the Upload Bucket application. These scripts are intended for system administrators.

---

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Commands](#commands)
  - [reset-password](#reset-password)
  - [set-tier](#set-tier)
  - [recover](#recover)
  - [purge](#purge)
  - [cleanup-orphans](#cleanup-orphans)

---

## Overview

All admin scripts are located in `backend/scripts/` and are run via pnpm from the backend directory:

```bash
cd backend
pnpm run <script-name> [arguments]
```

Scripts automatically load environment variables from `.dev.vars` or `.env` files.

---

## Prerequisites

Before running admin scripts, ensure:

1. You have the backend dependencies installed:
   ```bash
   cd backend
   pnpm install
   ```

2. Environment variables are configured in `backend/.dev.vars` or `backend/.env`:
   ```bash
   DATABASE_URL=postgresql://user:pass@host/db
   BETTER_AUTH_SECRET=your-secret-key
   ```

3. You have direct database access (scripts connect to the production database)

---

## Commands

### reset-password

Reset a user's password. Use this for account recovery when a user cannot reset their password through normal means.

**Usage:**

```bash
pnpm run reset-password <email> <new-password>
```

**Arguments:**

| Argument | Description |
|----------|-------------|
| email | User's email address |
| new-password | New password (minimum 8 characters) |

**Example:**

```bash
pnpm run reset-password user@example.com "NewSecurePassword123"
```

**Output:**

```
🔐 Resetting password for user: user@example.com
📡 Connecting to database...
🔍 Looking up user...
✅ Found user: John Doe (ID: user_abc123)
🔑 Hashing password (using bcrypt with 10 rounds, matching Better Auth)...
💾 Updating password in database...
✅ Password reset successfully!

📝 Summary:
   Email: user@example.com
   User ID: user_abc123
   User Name: John Doe
   Password: [REDACTED]

⚠️  Please notify the user about this password change.

✨ Done!
```

**Notes:**

- The password is hashed using bcrypt with 10 rounds (matching Better Auth's internal configuration)
- Always notify the user after resetting their password
- Passwords must be at least 8 characters

## Troubleshooting

**Script fails to connect to database:**
- Verify `DATABASE_URL` in `.dev.vars` or `.env`
- Ensure the database is accessible (Neon projects may pause when inactive)

**User not found:**
- Verify the email address is correct
- Check if the user has an account (they may have used Google OAuth with a different email)

**Permission denied:**
- Ensure you have execute permissions on the scripts
- Try running with `pnpm exec tsx` directly

**Environment variables not loading:**
- Check that `.dev.vars` or `.env` exists in the backend directory
- Verify the file format (KEY=value, no spaces around `=`)
