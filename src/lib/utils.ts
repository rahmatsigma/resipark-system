import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Merge Tailwind classes
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format currency to Indonesian Rupiah
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Format date to Indonesian format
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

// Format datetime to Indonesian format
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

// Format duration in hours and minutes
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours === 0) {
    return `${mins} menit`;
  }
  if (mins === 0) {
    return `${hours} jam`;
  }
  return `${hours} jam ${mins} menit`;
}

// Calculate duration between two dates in minutes
export function calculateDuration(start: Date, end: Date): number {
  return Math.floor((end.getTime() - start.getTime()) / (1000 * 60));
}

// Get relative time (e.g., "2 jam yang lalu")
export function getRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Baru saja';
  if (diffMins < 60) return `${diffMins} menit yang lalu`;
  if (diffHours < 24) return `${diffHours} jam yang lalu`;
  if (diffDays < 7) return `${diffDays} hari yang lalu`;
  return formatDate(d);
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

// Format plat number to standard format
export function formatPlatNumber(plat: string): string {
  return plat.toUpperCase().trim();
}

// Generate random color for avatar
export function getAvatarColor(name: string): string {
  const colors = [
    'bg-red-500',
    'bg-orange-500',
    'bg-amber-500',
    'bg-yellow-500',
    'bg-lime-500',
    'bg-green-500',
    'bg-emerald-500',
    'bg-teal-500',
    'bg-cyan-500',
    'bg-sky-500',
    'bg-blue-500',
    'bg-indigo-500',
    'bg-violet-500',
    'bg-purple-500',
    'bg-fuchsia-500',
    'bg-pink-500',
    'bg-rose-500',
  ];
  
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
}

// Get initials from name
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// Role display names
export const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrator',
  SATPAM: 'Satpam',
  WARGA: 'Warga',
  PENGELOLA: 'Pengelola',
};

// Vehicle type display names
export const VEHICLE_TYPE_LABELS: Record<string, string> = {
  MOTOR: 'Sepeda Motor',
  SEDAN: 'Sedan',
  MINIBUS: 'Minibus',
  PICKUP: 'Pickup',
  TRUK: 'Truk',
};

// Vehicle category display names
export const VEHICLE_CATEGORY_LABELS: Record<string, string> = {
  WARGA: 'Warga',
  TAMU: 'Tamu',
  SERVICE: 'Service',
  DELIVERY: 'Delivery',
};

// Violation type labels
export const VIOLATION_LABELS: Record<string, string> = {
  PARKIR_AREA_SALAH: 'Parkir di Luar Area',
  PARKIR_JALUR_DARURAT: 'Parkir di Jalur Darurat',
  OVER_TIME: 'Melebihi Batas Waktu',
  MERUSAK_FASILITAS: 'Merusak Fasilitas',
  LAIN_LAIN: 'Lain-lain',
};

// Status colors for badges
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-800',
    INACTIVE: 'bg-gray-100 text-gray-800',
    BLACKLISTED: 'bg-red-100 text-red-800',
    PENDING: 'bg-yellow-100 text-yellow-800',
    PAID: 'bg-green-100 text-green-800',
    WAIVED: 'bg-blue-100 text-blue-800',
    COMPLETED: 'bg-green-100 text-green-800',
    AVAILABLE: 'bg-green-100 text-green-800',
    OCCUPIED: 'bg-yellow-100 text-yellow-800',
    FULL: 'bg-red-100 text-red-800',
    MAINTENANCE: 'bg-gray-100 text-gray-800',
    REMOVED: 'bg-gray-100 text-gray-800',
    EXPIRED: 'bg-red-100 text-red-800',
    PERMANENT: 'bg-red-100 text-red-800',
    TEMPORARY: 'bg-yellow-100 text-yellow-800',
    AUTO_DENDA: 'bg-orange-100 text-orange-800',
    AUTO_VIOLATION: 'bg-orange-100 text-orange-800',
  };
  
  return colors[status] || 'bg-gray-100 text-gray-800';
}
