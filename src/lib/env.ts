type RequiredEnvKey = 'DATABASE_URL' | 'NEXTAUTH_SECRET' | 'NEXTAUTH_URL';

function requireEnv(key: RequiredEnvKey): string {
  const value = process.env[key];

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
}

export const env = {
  DATABASE_URL: requireEnv('DATABASE_URL'),
  NEXTAUTH_SECRET: requireEnv('NEXTAUTH_SECRET'),
  NEXTAUTH_URL: requireEnv('NEXTAUTH_URL'),
} as const;