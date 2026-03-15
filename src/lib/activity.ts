import { db } from './db';
import { headers } from 'next/headers';

export interface ActivityLogData {
  userId?: string | null;
  action: string;
  module: string;
  description: string;
  details?: Record<string, unknown>;
}

export async function logActivity(data: ActivityLogData): Promise<void> {
  try {
    const headersList = await headers();
    const ipAddress = headersList.get('x-forwarded-for') || 
                      headersList.get('x-real-ip') || 
                      'unknown';

    await db.activityLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        module: data.module,
        description: data.description,
        ipAddress: ipAddress,
        details: data.details ? JSON.stringify(data.details) : null,
      }
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}

// Predefined activity types
export const ACTIVITY_TYPES = {
  // Auth activities
  LOGIN: { action: 'LOGIN', module: 'AUTH' },
  LOGOUT: { action: 'LOGOUT', module: 'AUTH' },
  LOGIN_FAILED: { action: 'LOGIN_FAILED', module: 'AUTH' },
  
  // Vehicle activities
  VEHICLE_CREATE: { action: 'CREATE', module: 'VEHICLE' },
  VEHICLE_UPDATE: { action: 'UPDATE', module: 'VEHICLE' },
  VEHICLE_DELETE: { action: 'DELETE', module: 'VEHICLE' },
  
  // Access activities
  ACCESS_ENTRY: { action: 'ENTRY', module: 'ACCESS' },
  ACCESS_EXIT: { action: 'EXIT', module: 'ACCESS' },
  ACCESS_BLOCKED: { action: 'BLOCKED', module: 'ACCESS' },
  
  // Violation activities
  VIOLATION_CREATE: { action: 'CREATE', module: 'VIOLATION' },
  VIOLATION_PAY: { action: 'PAY', module: 'VIOLATION' },
  VIOLATION_WAIVE: { action: 'WAIVE', module: 'VIOLATION' },
  
  // Blacklist activities
  BLACKLIST_ADD: { action: 'ADD', module: 'BLACKLIST' },
  BLACKLIST_REMOVE: { action: 'REMOVE', module: 'BLACKLIST' },
  
  // Guest activities
  GUEST_REGISTER: { action: 'REGISTER', module: 'GUEST' },
  GUEST_EXTEND: { action: 'EXTEND', module: 'GUEST' },
  
  // User activities
  USER_CREATE: { action: 'CREATE', module: 'USER' },
  USER_UPDATE: { action: 'UPDATE', module: 'USER' },
  USER_DELETE: { action: 'DELETE', module: 'USER' },
} as const;
