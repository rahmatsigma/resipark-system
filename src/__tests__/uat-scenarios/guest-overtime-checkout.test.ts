import {
  calculateOvertimeFine,
  calculateFine,
  FINE_RULES,
} from "../../lib/rules";
import { db } from "../../lib/db";

// Mock the db module (dibutuhkan oleh calculateFine untuk cek riwayat pelanggaran)
jest.mock("../../lib/db", () => ({
  db: {
    violation: {
      count: jest.fn(),
    },
  },
}));

/**
 * UAT Sprint 7: Pengujian Batas Waktu Tamu (Overtime)
 *
 * Simulasi skenario:
 *  - Tamu check-in ke area parkir.
 *  - Tamu melebihi batas waktu maksimal 8 jam.
 *  - Tamu check-out di pos Satpam.
 *  - Pastikan fungsi denda overtime otomatis teraplikasi saat check-out.
 */
describe("UAT Sprint 7: Pengujian Batas Waktu Tamu (Overtime)", () => {
  // Batas waktu maksimal tamu berdasarkan aturan sistem
  const MAX_GUEST_HOURS = FINE_RULES.MAX_GUEST_DURATION_HOURS; // 8 jam
  const RATE_PER_HOUR = FINE_RULES.OVERTIME_RATE_PER_HOUR; // Rp 25.000/jam

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // SKENARIO A: Tamu Keluar TEPAT WAKTU (tidak kena denda)
  // ─────────────────────────────────────────────────────────────────────────

  describe("Skenario A: Tamu Check-Out Tepat Waktu (≤ 8 jam)", () => {
    it("tidak boleh ada denda jika tamu keluar tepat di batas 8 jam", () => {
      const entryTime = new Date("2024-06-01T08:00:00Z");
      const exitTime = new Date("2024-06-01T16:00:00Z"); // Durasi persis 8 jam

      const fine = calculateOvertimeFine(entryTime, exitTime, MAX_GUEST_HOURS);

      expect(fine).toBe(0);
    });

    it("tidak boleh ada denda jika tamu keluar jauh sebelum batas 8 jam (misal 2 jam parkir)", () => {
      const entryTime = new Date("2024-06-01T09:00:00Z");
      const exitTime = new Date("2024-06-01T11:00:00Z"); // Durasi 2 jam

      const fine = calculateOvertimeFine(entryTime, exitTime, MAX_GUEST_HOURS);

      expect(fine).toBe(0);
    });

    it("tidak boleh ada denda jika tamu keluar 1 menit sebelum batas 8 jam", () => {
      const entryTime = new Date("2024-06-01T08:00:00Z");
      const exitTime = new Date("2024-06-01T15:59:00Z"); // 7 jam 59 menit (Math.floor → 479 menit)

      const fine = calculateOvertimeFine(entryTime, exitTime, MAX_GUEST_HOURS);

      expect(fine).toBe(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // SKENARIO B: Tamu Melebihi Batas → Denda Otomatis Teraplikasi
  // ─────────────────────────────────────────────────────────────────────────

  describe("Skenario B: Tamu Melebihi Batas 8 Jam → Denda Otomatis saat Check-Out", () => {
    it("harus mengenakan denda Rp 25.000 jika tamu overtime 1 jam penuh (total 9 jam)", () => {
      const entryTime = new Date("2024-06-01T08:00:00Z");
      const exitTime = new Date("2024-06-01T17:00:00Z"); // Durasi 9 jam → overtime 1 jam

      const fine = calculateOvertimeFine(entryTime, exitTime, MAX_GUEST_HOURS);

      expect(fine).toBe(25000); // 1 jam × Rp 25.000
    });

    it("harus membulatkan ke atas: denda Rp 50.000 jika overtime 1 jam 1 menit (dibulatkan jadi 2 jam)", () => {
      const entryTime = new Date("2024-06-01T08:00:00Z");
      const exitTime = new Date("2024-06-01T17:01:00Z"); // Overtime 1 jam 1 menit → ceil = 2 jam

      const fine = calculateOvertimeFine(entryTime, exitTime, MAX_GUEST_HOURS);

      expect(fine).toBe(50000); // 2 jam × Rp 25.000
    });

    it("harus mengenakan denda Rp 50.000 jika overtime 1 jam 30 menit (dibulatkan jadi 2 jam)", () => {
      const entryTime = new Date("2024-06-01T08:00:00Z");
      const exitTime = new Date("2024-06-01T17:30:00Z"); // Overtime 1 jam 30 menit

      const fine = calculateOvertimeFine(entryTime, exitTime, MAX_GUEST_HOURS);

      expect(fine).toBe(50000); // ceil(1.5) = 2 jam × Rp 25.000
    });

    it("harus mengenakan denda Rp 75.000 jika tamu overtime 3 jam penuh (total 11 jam)", () => {
      const entryTime = new Date("2024-06-01T08:00:00Z");
      const exitTime = new Date("2024-06-01T19:00:00Z"); // Durasi 11 jam → overtime 3 jam

      const fine = calculateOvertimeFine(entryTime, exitTime, MAX_GUEST_HOURS);

      expect(fine).toBe(75000); // 3 jam × Rp 25.000
    });

    it("harus menghitung denda kelipatan dengan benar untuk overtime 5 jam 45 menit (dibulatkan jadi 6 jam)", () => {
      const entryTime = new Date("2024-06-01T08:00:00Z");
      const exitTime = new Date("2024-06-01T21:45:00Z"); // Overtime 5 jam 45 menit

      const fine = calculateOvertimeFine(entryTime, exitTime, MAX_GUEST_HOURS);

      expect(fine).toBe(150000); // ceil(5.75) = 6 jam × Rp 25.000
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // SKENARIO C: Simulasi Check-Out di Pos Satpam (End-to-End Flow)
  // ─────────────────────────────────────────────────────────────────────────

  describe("Skenario C: Simulasi Check-Out Tamu di Pos Satpam", () => {
    it("Satpam check-out tamu yang overtime: sistem harus menampilkan total denda yang benar", () => {
      // Tamu masuk pukul 09:00
      const checkInTime = new Date("2024-06-15T09:00:00Z");
      // Tamu check-out pukul 19:30 (overtime 2 jam 30 menit → dibulatkan jadi 3 jam)
      const checkOutTime = new Date("2024-06-15T19:30:00Z");

      const overtimeFine = calculateOvertimeFine(
        checkInTime,
        checkOutTime,
        MAX_GUEST_HOURS
      );

      // ceil(2.5 jam overtime) = 3 jam → 3 × Rp 25.000
      expect(overtimeFine).toBe(75000);
      expect(overtimeFine).toBeGreaterThan(0); // Sistem wajib menampilkan denda
    });

    it("Satpam check-out tamu yang belum overtime: sistem tidak boleh mengenakan denda", () => {
      const checkInTime = new Date("2024-06-15T09:00:00Z");
      const checkOutTime = new Date("2024-06-15T14:30:00Z"); // 5,5 jam → tidak overtime

      const overtimeFine = calculateOvertimeFine(
        checkInTime,
        checkOutTime,
        MAX_GUEST_HOURS
      );

      expect(overtimeFine).toBe(0); // Tidak ada denda
    });

    it("denda overtime harus dihitung dengan tarif Rp 25.000 per jam (validasi konstanta sistem)", () => {
      // Validasi bahwa tarif denda per jam sesuai aturan
      expect(RATE_PER_HOUR).toBe(25000);
      expect(MAX_GUEST_HOURS).toBe(8);
    });

    it("overtime 1 menit pertama pun harus menghasilkan denda 1 jam penuh (pembulatan ke atas wajib)", () => {
      const checkInTime = new Date("2024-06-15T08:00:00Z");
      // Overtime hanya 1 menit
      const checkOutTime = new Date("2024-06-15T16:01:00Z");

      const overtimeFine = calculateOvertimeFine(
        checkInTime,
        checkOutTime,
        MAX_GUEST_HOURS
      );

      // 1 menit overtime → ceil(1/60) = 1 jam → Rp 25.000
      expect(overtimeFine).toBe(25000);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // SKENARIO D: Denda Overtime sebagai OVER_TIME Violation
  // ─────────────────────────────────────────────────────────────────────────

  describe("Skenario D: Integrasi dengan Sistem Denda Pelanggaran (OVER_TIME)", () => {
    it("calculateFine untuk OVER_TIME harus mengembalikan base fine Rp 25.000 tanpa multiplier (pelanggaran pertama)", async () => {
      (db.violation.count as jest.Mock).mockResolvedValue(0);

      const result = await calculateFine("TAMU-B5678XYZ", "OVER_TIME");

      expect(result.baseFine).toBe(25000);
      expect(result.multiplier).toBe(1);
      expect(result.totalFine).toBe(25000);
    });

    it("calculateFine untuk OVER_TIME harus menerapkan multiplier 2x pada pelanggaran ke-3", async () => {
      (db.violation.count as jest.Mock).mockResolvedValue(2); // 2 pelanggaran sebelumnya

      const result = await calculateFine("TAMU-B5678XYZ", "OVER_TIME");

      expect(result.baseFine).toBe(25000);
      expect(result.multiplier).toBe(2);
      expect(result.totalFine).toBe(50000);
    });

    it("denda overtime dari calculateOvertimeFine harus konsisten dengan base fine OVER_TIME dari calculateFine", async () => {
      (db.violation.count as jest.Mock).mockResolvedValue(0); // Pelanggaran pertama

      const entryTime = new Date("2024-06-01T08:00:00Z");
      const exitTime = new Date("2024-06-01T17:00:00Z"); // Overtime 1 jam

      const overtimeFine = calculateOvertimeFine(entryTime, exitTime, MAX_GUEST_HOURS);
      const violationFine = await calculateFine("TAMU-B5678XYZ", "OVER_TIME");

      // Keduanya harus sama untuk 1 jam overtime (base fine OVER_TIME = rate per jam)
      expect(overtimeFine).toBe(violationFine.baseFine);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // SKENARIO E: Edge Cases Batas Waktu
  // ─────────────────────────────────────────────────────────────────────────

  describe("Skenario E: Edge Cases Batas Waktu", () => {
    it("harus menghasilkan denda 0 jika waktu check-out sama persis dengan waktu check-in (durasi 0)", () => {
      const sameTime = new Date("2024-06-01T10:00:00Z");

      const fine = calculateOvertimeFine(sameTime, sameTime, MAX_GUEST_HOURS);

      expect(fine).toBe(0);
    });

    it("harus menghitung dengan benar untuk tamu yang parkir melewati tengah malam (cross-day)", () => {
      const entryTime = new Date("2024-06-01T20:00:00Z"); // Masuk jam 20:00
      const exitTime = new Date("2024-06-02T06:00:00Z");  // Keluar jam 06:00 besok (10 jam)

      // Durasi 10 jam → overtime 2 jam
      const fine = calculateOvertimeFine(entryTime, exitTime, MAX_GUEST_HOURS);

      expect(fine).toBe(50000); // 2 jam × Rp 25.000
    });

    it("harus menghasilkan denda 0 untuk durasi parkir tepat 7 jam 59 menit 59 detik", () => {
      const entryTime = new Date("2024-06-01T08:00:00.000Z");
      // 7 jam 59 menit 59 detik = 28799 detik → Math.floor(28799/60) = 479 menit
      const exitTime = new Date("2024-06-01T15:59:59.000Z");

      const fine = calculateOvertimeFine(entryTime, exitTime, MAX_GUEST_HOURS);

      // 479 menit < 480 menit (8 jam) → tidak overtime
      expect(fine).toBe(0);
    });

    it("batas waktu layanan (service) 2 jam harus menghasilkan denda lebih cepat dari tamu reguler", () => {
      const entryTime = new Date("2024-06-01T10:00:00Z");
      const exitTime = new Date("2024-06-01T13:00:00Z"); // 3 jam

      const guestFine = calculateOvertimeFine(
        entryTime,
        exitTime,
        MAX_GUEST_HOURS // 8 jam → tidak overtime
      );
      const serviceFine = calculateOvertimeFine(
        entryTime,
        exitTime,
        FINE_RULES.MAX_SERVICE_DURATION_HOURS // 2 jam → overtime 1 jam
      );

      expect(guestFine).toBe(0);       // Tamu reguler belum overtime
      expect(serviceFine).toBe(25000); // Service sudah overtime 1 jam
    });
  });
});
