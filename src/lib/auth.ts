import { db, User, UserRole } from './db';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { nanoid } from 'nanoid';

const SESSION_COOKIE_NAME = 'parkir_session';
const SESSION_EXPIRY_DAYS = 7;

// Simple in-memory session store (for demo - use Redis in production)
const sessions = new Map<string, { userId: string; expiresAt: Date }>();

export interface SessionUser {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: UserRole;
  houseId?: string;
  houseNumber?: string;
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
  
  sessions.set(sessionId, { userId, expiresAt });
  
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
  
  if (session.expiresAt < new Date()) {
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
export async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    
    if (!sessionId) return null;
    
    const session = await getSession(sessionId);
    if (!session) return null;
    
    const user = await db.user.findUnique({
      where: { id: session.userId },
      include: {
        resident: {
          include: { house: true }
        }
      }
    });
    
    if (!user || user.status !== 'ACTIVE') return null;
    
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      houseId: user.resident?.houseId,
      houseNumber: user.resident?.house?.houseNumber,
    };
  } catch {
    return null;
  }
}

// Set session cookie
export async function setSessionCookie(sessionId: string): Promise<void> {
  const cookieStore = await cookies();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_EXPIRY_DAYS);
  
  cookieStore.set(SESSION_COOKIE_NAME, sessionId, {
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
    await setSessionCookie(sessionId);
    
    return {
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        houseId: user.resident?.houseId,
        houseNumber: user.resident?.house?.houseNumber,
      }
    };
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: 'Terjadi kesalahan sistem' };
  }
}

// Logout function
export async function logout(): Promise<void> {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    
    if (sessionId) {
      await deleteSession(sessionId);
    }
    
    await clearSessionCookie();
  } catch (error) {
    console.error('Logout error:', error);
  }
}
