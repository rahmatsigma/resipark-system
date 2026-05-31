import { db, UserRole } from './db';
import { logger } from './logger';
import { SESSION_COOKIE_NAME, signSessionToken, verifySessionToken } from './session';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { nanoid } from 'nanoid';

export const SESSION_COOKIE_NAME_EXPORT = SESSION_COOKIE_NAME;
const SESSION_EXPIRY_DAYS = 7;
const IDLE_TIMEOUT_MINUTES = 30 * 60 * 1000; // 30 minutes in ms

// Persist sessions across dev hot reloads so authenticated API calls keep working.
const globalForSessions = globalThis as typeof globalThis & {
  __parkirSessions?: Map<string, { userId: string; expiresAt: Date; lastActivity: number }>;
  __parkirCurrentUsers?: Map<string, { user: SessionUser; expiresAt: number }>;
};

// Simple in-memory session store (for demo - use Redis in production)
const sessions = globalForSessions.__parkirSessions ?? new Map<string, { userId: string; expiresAt: Date; lastActivity: number }>(); // Unix timestamp
const currentUsers = globalForSessions.__parkirCurrentUsers ?? new Map<string, { user: SessionUser; expiresAt: number }>();

if (!globalForSessions.__parkirSessions) {
  globalForSessions.__parkirSessions = sessions;
}

if (!globalForSessions.__parkirCurrentUsers) {
  globalForSessions.__parkirCurrentUsers = currentUsers;
}

export interface SessionUser {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: UserRole;
  houseId?: string;
  houseNumber?: string;
}

const CURRENT_USER_CACHE_TTL_MS = 15 * 1000;

function cacheCurrentUser(sessionId: string, user: SessionUser): void {
  currentUsers.set(sessionId, {
    user,
    expiresAt: Date.now() + CURRENT_USER_CACHE_TTL_MS,
  });
}

function getCachedCurrentUser(sessionId: string): SessionUser | null {
  const cached = currentUsers.get(sessionId);
  if (!cached) return null;

  if (cached.expiresAt < Date.now()) {
    currentUsers.delete(sessionId);
    return null;
  }

  return cached.user;
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

// Verify password
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// Validate plat number format (Indonesian format)
export function validatePlatNumber(plat: string): boolean {
  // Format: [A-Z]{1-2} [0-9]{1-4} [A-Z]{1-3}
  const platRegex = /^[A-Z]{1,2}\s?\d{1,4}\s?[A-Z]{0,3}$/i;
  return platRegex.test(plat.trim());
}

// Format plat number to standard format
export function formatPlatNumber(plat: string): string {
  return plat.toUpperCase().trim();
}

// Create session
export async function createSession(userId: string): Promise<string> {
  const sessionId = nanoid(32);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_EXPIRY_DAYS);
  const now = Date.now();
  
  sessions.set(sessionId, { userId, expiresAt, lastActivity: now });
  
  // Update last login
  await db.user.update({
    where: { id: userId },
    data: { lastLogin: new Date() }
  });
  
  return sessionId;
}

// Get session
export async function getSession(sessionId: string): Promise<{ userId: string } | null> {
  const session = sessions.get(sessionId);
  if (!session) return null;
  
  const now = new Date();
  if (session.expiresAt < now) {
    sessions.delete(sessionId);
    return null;
  }
  
  // Check idle timeout
  if (Date.now() - session.lastActivity > IDLE_TIMEOUT_MINUTES) {
    sessions.delete(sessionId);
    return null;
  }
  
  return { userId: session.userId };
}

// Delete session
export async function deleteSession(sessionId: string): Promise<void> {
  sessions.delete(sessionId);
}

// Get current user from session
// Get current user from session
export async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const signedSession = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    
    if (!signedSession) return null;

    // 1. Verifikasi murni pakai crypt/token (Abaikan memory Map Vercel)
    const token = await verifySessionToken(signedSession);
    if (!token) return null;
    // Check in-memory cache first (keyed by token.sessionId)
    const cached = getCachedCurrentUser(token.sessionId);
    if (cached) return cached;
    
    // (BARIS GET SESSION DIHAPUS DI SINI BIAR GAK MENTAL DI VERCEL)
    
    // 2. Langsung cari data usernya ke database (Supabase)
    const user = await db.user.findUnique({
      where: { id: token.userId },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        status: true,
        resident: {
          select: {
            houseId: true,
            house: {
              select: {
                houseNumber: true,
              },
            },
          },
        },
      },
    });
    
    if (!user || user.status !== 'ACTIVE') return null;

    const currentUser: SessionUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      houseId: user.resident?.houseId,
      houseNumber: user.resident?.house?.houseNumber,
    };
    // Cache and return
    cacheCurrentUser(token.sessionId, currentUser);
    return currentUser;
  } catch (error) {
    console.error('Error saat verifikasi user:', error);
    return null;
  }
}

// Set session cookie
export async function setSessionCookie(sessionId: string, userId: string, role: UserRole): Promise<void> {
  const cookieStore = await cookies();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_EXPIRY_DAYS);

  const signedSession = await signSessionToken({
    sessionId,
    userId,
    role,
  });
  
  cookieStore.set(SESSION_COOKIE_NAME, signedSession, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: expiresAt,
    path: '/',
  });
}

// Clear session cookie
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

// Check if user has permission
export function hasPermission(userRole: UserRole, requiredRoles: UserRole[]): boolean {
  return requiredRoles.includes(userRole);
}

// Role hierarchy for permission checks
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  ADMIN: 100,
  PENGELOLA: 75,
  SATPAM: 50,
  WARGA: 25,
};

export function hasRoleOrHigher(userRole: UserRole, minimumRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minimumRole];
}

// Login function
export async function login(username: string, password: string): Promise<{ success: boolean; user?: SessionUser; error?: string }> {
  try {
    const user = await db.user.findUnique({
      where: { username },
      include: {
        resident: {
          include: { house: true }
        }
      }
    });
    
    if (!user) {
      return { success: false, error: 'Username atau password salah' };
    }
    
    if (user.status !== 'ACTIVE') {
      return { success: false, error: 'Akun tidak aktif' };
    }
    
    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      return { success: false, error: 'Username atau password salah' };
    }
    
    const sessionId = await createSession(user.id);
    await setSessionCookie(sessionId, user.id, user.role);

    const currentUser: SessionUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      houseId: user.resident?.houseId,
      houseNumber: user.resident?.house?.houseNumber,
    };

    cacheCurrentUser(sessionId, currentUser);
    
    return {
      success: true,
      user: currentUser
    };
  } catch (error) {
    logger.error('Login error:', error);
    return { success: false, error: 'Terjadi kesalahan sistem' };
  }
}

export function updateActivity(sessionId: string): void {
  const session = sessions.get(sessionId);
  if (session) {
    session.lastActivity = Date.now();
  }
}

// Logout function
export async function logout(): Promise<void> {
  try {
    const cookieStore = await cookies();
    const signedSession = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    const token = signedSession ? await verifySessionToken(signedSession) : null;
    
    if (token) {
      await deleteSession(token.sessionId);
      currentUsers.delete(token.sessionId);
    }
    
    await clearSessionCookie();
  } catch (error) {
    logger.error('Logout error:', error);
  }
}
