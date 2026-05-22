import type { UserRole } from '@prisma/client';
import { env } from './env';

export const SESSION_COOKIE_NAME = 'parkir_session';

export interface SessionTokenData {
  sessionId: string;
  userId: string;
  role: UserRole;
}

function normalizeTokenParts(sessionId: string, userId: string, role: string): SessionTokenData | null {
  if (!sessionId || !userId || !role) return null;
  if (role !== 'ADMIN' && role !== 'SATPAM' && role !== 'WARGA' && role !== 'PENGELOLA') {
    return null;
  }

  return {
    sessionId,
    userId,
    role,
  };
}

async function getSessionSignature(payload: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(env.NEXTAUTH_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function buildSessionPayload(data: SessionTokenData): string {
  return `${data.sessionId}.${data.userId}.${data.role}`;
}

export async function signSessionToken(data: SessionTokenData): Promise<string> {
  const payload = buildSessionPayload(data);
  const signature = await getSessionSignature(payload);
  return `${payload}.${signature}`;
}

export async function verifySessionToken(token: string): Promise<SessionTokenData | null> {
  const parts = token.split('.');
  if (parts.length !== 4) return null;

  const [sessionId, userId, role, tokenSignature] = parts;
  const data = normalizeTokenParts(sessionId, userId, role);

  if (!data) return null;

  const payload = buildSessionPayload(data);
  const expectedSignature = await getSessionSignature(payload);

  if (tokenSignature.length !== expectedSignature.length) return null;

  let mismatch = 0;
  for (let index = 0; index < tokenSignature.length; index++) {
    mismatch |= tokenSignature.charCodeAt(index) ^ expectedSignature.charCodeAt(index);
  }

  return mismatch === 0 ? data : null;
}