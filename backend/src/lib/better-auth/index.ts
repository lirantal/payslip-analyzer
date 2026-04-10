import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { betterAuth } from 'better-auth';
import { normalizeDatabaseUrl } from '../../db';
import { betterAuthOptions } from './options';

import * as schema from '../../db/schema'; // Ensure the schema is imported

/**
 * Better Auth Instance
 */
export const auth = (env: Env): ReturnType<typeof betterAuth> => {
  const sql = neon(normalizeDatabaseUrl(env.DATABASE_URL));
  const db = drizzle(sql, { schema });

  // Only configure Google OAuth if credentials are provided
  const socialProviders = env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
    ? {
        google: {
          clientId: env.GOOGLE_CLIENT_ID,
          clientSecret: env.GOOGLE_CLIENT_SECRET,
        },
      }
    : {};

  // Enable email+password auth by default, disable only if explicitly set to 'false'
  const emailPasswordEnabled = env.EMAIL_PASSWORD_AUTH_ENABLED !== 'false';

  return betterAuth({
    ...betterAuthOptions,
    emailAndPassword: {
      ...betterAuthOptions.emailAndPassword,
      enabled: emailPasswordEnabled,
    },
    database: drizzleAdapter(db, { provider: 'pg' }),
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    socialProviders,
  });
};
