import { UserRole, VehicleType, VehicleCategory, VehicleStatus, AccessStatus, ViolationStatus, BlacklistStatus, BlacklistType } from '@/lib/db';

export type { VehicleType, SlotType } from '@/lib/db';

// User types
export interface UserSession {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: UserRole;
  houseId?: string;
  houseNumber?: string;
}

// Vehicle types
export interface VehicleWithOwner {
  id: string;
  platNumber: string;
  vehicleType: VehicleType;
  brand: string;
  color: string;
  category: VehicleCategory;
  status: VehicleStatus;
  houseId: string | null;
  house?: {
    id: string;
    houseNumber: string;
    block: string;
  } | null;
  registeredAt: Date;
}

// Access record types
export interface AccessRecordWithDetails {
  id: string;
  vehicleId: string;
  vehicle: {
    platNumber: string;
    vehicleType: VehicleType;
    brand: string;
    color: string;
    category: VehicleCategory;
    house?: {
      houseNumber: string;
    } | null;
  };
  entryTime: Date;
  exitTime: Date | null;
  slotNumber: string | null;
  area?: {
    id: string;
    name: string;
    type: string;
  } | null;
  status: AccessStatus;
  guestAccess?: {
    purpose: string;
    maxDurationHours: number;
    expiredAt: Date | null;
    hostHouse: {
      houseNumber: string;
    };
  } | null;
}

// Violation types
export interface ViolationWithDetails {
  id: string;
  vehicle: {
    platNumber: string;
    brand: string;
    color: string;
  } | null;
  violationType: {
    code: string;
    name: string;
    baseFine: number;
  } | null;
  description: string | null;
  baseFine: number;
  totalFine: number;
  multiplier: number;
  status: ViolationStatus;
  violationDate: Date;
  paidAt: Date | null;
  createdAt: Date;
}

// Blacklist types
export interface BlacklistWithVehicle {
  id: string;
  vehicle: {
    platNumber: string;
    brand: string;
    color: string;
  } | null;
  reason: string;
  blacklistType: BlacklistType;
  startDate: Date;
  endDate: Date | null;
  status: BlacklistStatus;
  createdAt: Date;
  updatedAt: Date;
}

// Dashboard stats
export interface DashboardStats {
  today: {
    totalEntries: number;
    totalExits: number;
    currentParked: number;
    guests: number;
  };
  parking: {
    main: {
      capacity: number;
      occupied: number;
      percentage: number;
    };
    guest: {
      capacity: number;
      occupied: number;
      percentage: number;
    };
  };
  violations: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    pendingFines: number;
    totalUnpaid: number;
  };
  vehicles: {
    total: number;
    active: number;
    blacklisted: number;
  };
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

// Pagination types
export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
