import { db, ViolationTypeCode } from './db';

// Fine calculation rules
export const FINE_RULES = {
  // Base fines for each violation type (in Rupiah)
  BASE_FINES: {
    PARKIR_AREA_SALAH: 50000,
    PARKIR_JALUR_DARURAT: 100000,
    OVER_TIME: 25000, // per hour
    MERUSAK_FASILITAS: 0, // determined by damage
    LAIN_LAIN: 25000,
  },
  
  // Multiplier rules
  MULTIPLIER: {
    // 3rd violation in 30 days: 2x
    THIRD_VIOLATION: { threshold: 2, multiplier: 2 },
    // 5th violation in 30 days: 3x
    FIFTH_VIOLATION: { threshold: 4, multiplier: 3 },
  },
  
  // Guest overtime rate per hour
  OVERTIME_RATE_PER_HOUR: 25000,
  
  // Max guest parking duration in hours
  MAX_GUEST_DURATION_HOURS: 8,
  
  // Max service/delivery duration in hours
  MAX_SERVICE_DURATION_HOURS: 2,
};

// Vehicle quota per house
export const VEHICLE_QUOTA_PER_HOUSE = 2;

// Parking capacity thresholds
export const CAPACITY_THRESHOLDS = {
  WARNING: 90, // 90% capacity - show warning
  FULL: 100,   // 100% capacity - redirect to overflow
};

// Calculate fine with multiplier based on violation history
export async function calculateFine(
  vehicleId: string,
  violationType: ViolationTypeCode,
  customAmount?: number
): Promise<{ baseFine: number; multiplier: number; totalFine: number }> {
  // Get base fine
  let baseFine = FINE_RULES.BASE_FINES[violationType] || 25000;
  
  // For custom amount (MERUSAK_FASILITAS)
  if (violationType === 'MERUSAK_FASILITAS' && customAmount) {
    baseFine = customAmount;
  }
  
  // Get violation count in last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const recentViolations = await db.violation.count({
    where: {
      vehicleId,
      violationDate: {
        gte: thirtyDaysAgo,
      },
    },
  });
  
  // Calculate multiplier
  let multiplier = 1;
  if (recentViolations >= FINE_RULES.MULTIPLIER.FIFTH_VIOLATION.threshold) {
    multiplier = FINE_RULES.MULTIPLIER.FIFTH_VIOLATION.multiplier;
  } else if (recentViolations >= FINE_RULES.MULTIPLIER.THIRD_VIOLATION.threshold) {
    multiplier = FINE_RULES.MULTIPLIER.THIRD_VIOLATION.multiplier;
  }
  
  const totalFine = baseFine * multiplier;
  
  return { baseFine, multiplier, totalFine };
}

// Calculate overtime fine for guests
export function calculateOvertimeFine(
  entryTime: Date,
  exitTime: Date,
  maxDurationHours: number
): number {
  const durationMinutes = Math.floor(
    (exitTime.getTime() - entryTime.getTime()) / (1000 * 60)
  );
  const maxDurationMinutes = maxDurationHours * 60;
  const overtimeMinutes = Math.max(0, durationMinutes - maxDurationMinutes);
  const overtimeHours = Math.ceil(overtimeMinutes / 60);
  
  return overtimeHours * FINE_RULES.OVERTIME_RATE_PER_HOUR;
}

// Check if vehicle should be auto-blacklisted
export async function checkAutoBlacklist(vehicleId: string): Promise<{
  shouldBlacklist: boolean;
  reason: string;
  blacklistType: 'AUTO_DENDA' | 'AUTO_VIOLATION' | null;
  duration?: number; // days, null for permanent
}> {
  // Check unpaid fines > 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const unpaidOldFines = await db.violation.aggregate({
    where: {
      vehicleId,
      status: 'PENDING',
      violationDate: {
        lt: thirtyDaysAgo,
      },
    },
    _sum: {
      totalFine: true,
    },
    _count: true,
  });
  
  if (unpaidOldFines._count > 0 && (unpaidOldFines._sum.totalFine || 0) > 0) {
    return {
      shouldBlacklist: true,
      reason: `Denda belum dibayar selama > 30 hari (Rp ${unpaidOldFines._sum.totalFine?.toLocaleString('id-ID')})`,
      blacklistType: 'AUTO_DENDA',
      duration: undefined, // Permanent until paid
    };
  }
  
  // Check 5 violations in 3 months
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  
  const recentViolations = await db.violation.count({
    where: {
      vehicleId,
      violationDate: {
        gte: threeMonthsAgo,
      },
    },
  });
  
  if (recentViolations >= 5) {
    return {
      shouldBlacklist: true,
      reason: `${recentViolations} pelanggaran dalam 3 bulan terakhir`,
      blacklistType: 'AUTO_VIOLATION',
      duration: 30, // 30 days
    };
  }
  
  return {
    shouldBlacklist: false,
    reason: '',
    blacklistType: null,
  };
}

// Check vehicle quota for a house
export async function checkVehicleQuota(houseId: string): Promise<{
  available: boolean;
  current: number;
  max: number;
}> {
  const currentCount = await db.vehicle.count({
    where: {
      houseId,
      status: 'ACTIVE',
    },
  });
  
  return {
    available: currentCount < VEHICLE_QUOTA_PER_HOUSE,
    current: currentCount,
    max: VEHICLE_QUOTA_PER_HOUSE,
  };
}

// Check parking capacity
export async function checkParkingCapacity(areaId: string): Promise<{
  available: boolean;
  current: number;
  capacity: number;
  percentage: number;
}> {
  const area = await db.parkingArea.findUnique({
    where: { id: areaId },
  });
  
  if (!area) {
    return { available: false, current: 0, capacity: 0, percentage: 0 };
  }
  
  const percentage = Math.round((area.currentOccupancy / area.capacity) * 100);
  
  return {
    available: area.currentOccupancy < area.capacity,
    current: area.currentOccupancy,
    capacity: area.capacity,
    percentage,
  };
}

// Get available parking slot
export async function getAvailableSlot(areaId: string): Promise<string | null> {
  const slot = await db.parkingSlot.findFirst({
    where: {
      areaId,
      status: 'AVAILABLE',
    },
  });
  
  return slot?.id || null;
}

// Check if vehicle is blacklisted
export async function isVehicleBlacklisted(vehicleId: string): Promise<{
  isBlacklisted: boolean;
  reason?: string;
  blacklistId?: string;
}> {
  const blacklist = await db.blacklist.findFirst({
    where: {
      vehicleId,
      status: 'ACTIVE',
      OR: [
        { endDate: null }, // Permanent
        { endDate: { gt: new Date() } }, // Not expired
      ],
    },
  });
  
  if (blacklist) {
    return {
      isBlacklisted: true,
      reason: blacklist.reason,
      blacklistId: blacklist.id,
    };
  }
  
  return { isBlacklisted: false };
}

// Validate plat number format (Indonesian format)
export function validatePlatNumber(plat: string): { valid: boolean; error?: string } {
  const trimmed = plat.trim().toUpperCase();
  
  if (!trimmed) {
    return { valid: false, error: 'Plat nomor harus diisi' };
  }
  
  // Format: 1-2 letters, space, 1-4 digits, space, 0-3 letters
  const platRegex = /^[A-Z]{1,2}\s?\d{1,4}\s?[A-Z]{0,3}$/;
  
  if (!platRegex.test(trimmed)) {
    return { valid: false, error: 'Format plat nomor tidak valid (contoh: B 1234 ABC)' };
  }
  
  return { valid: true };
}
