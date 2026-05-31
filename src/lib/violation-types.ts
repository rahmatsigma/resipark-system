import { db, type ViolationTypeCode } from './db';
import { FINE_RULES } from './rules';

const VIOLATION_TYPE_DEFINITIONS: Record<ViolationTypeCode, {
  name: string;
  description: string;
  baseFine: number;
}> = {
  PARKIR_AREA_SALAH: {
    name: 'Parkir di Luar Area yang Ditentukan',
    description: 'Kendaraan parkir di area yang bukan tempat parkir resmi',
    baseFine: FINE_RULES.BASE_FINES.PARKIR_AREA_SALAH,
  },
  PARKIR_JALUR_DARURAT: {
    name: 'Parkir di Jalur Darurat',
    description: 'Kendaraan menghalangi jalur akses darurat',
    baseFine: FINE_RULES.BASE_FINES.PARKIR_JALUR_DARURAT,
  },
  OVER_TIME: {
    name: 'Parkir Melebihi Batas Waktu',
    description: 'Parkir tamu melebihi durasi yang diizinkan',
    baseFine: FINE_RULES.BASE_FINES.OVER_TIME,
  },
  MERUSAK_FASILITAS: {
    name: 'Merusak Fasilitas Parkir',
    description: 'Kendaraan merusak fasilitas area parkir',
    baseFine: FINE_RULES.BASE_FINES.MERUSAK_FASILITAS,
  },
  LAIN_LAIN: {
    name: 'Pelanggaran Lain-lain',
    description: 'Pelanggaran lain yang tidak tercantum',
    baseFine: FINE_RULES.BASE_FINES.LAIN_LAIN,
  },
};

export function normalizeViolationTypeCode(code: string): ViolationTypeCode | null {
  const normalizedCode = code.trim().toUpperCase();

  if (normalizedCode in VIOLATION_TYPE_DEFINITIONS) {
    return normalizedCode as ViolationTypeCode;
  }

  return null;
}

export async function getOrCreateViolationType(code: string) {
  const normalizedCode = normalizeViolationTypeCode(code);

  if (!normalizedCode) {
    return null;
  }

  const existingViolationType = await db.violationType.findUnique({
    where: { code: normalizedCode },
  });

  if (existingViolationType) {
    return existingViolationType;
  }

  const definition = VIOLATION_TYPE_DEFINITIONS[normalizedCode];

  return db.violationType.upsert({
    where: { code: normalizedCode },
    update: {
      name: definition.name,
      description: definition.description,
      baseFine: definition.baseFine,
      isActive: true,
    },
    create: {
      code: normalizedCode,
      name: definition.name,
      description: definition.description,
      baseFine: definition.baseFine,
      isActive: true,
    },
  });
}