import {
  checkAutoBlacklist,
  isVehicleBlacklisted,
  calculateFine,
} from "../../lib/rules";
import { db } from "../../lib/db";

// Mock the db module
jest.mock("../../lib/db", () => ({
  db: {
    violation: {
      aggregate: jest.fn(),
      count: jest.fn(),
    },
    blacklist: {
      findFirst: jest.fn(),
    },
  },
}));

/**
 * UAT Sprint 6: Skenario Pembebasan Blacklist (End-to-End)
 *
 * Siklus penuh:
 *  (1) Buat pelanggaran sampai kendaraan masuk blacklist.
 *  (2) Coba akses masuk Satpam -> pastikan ditolak.
 *  (3) Lakukan pembayaran denda sampai lunas.
 *  (4) Coba akses masuk Satpam lagi -> pastikan sekarang kendaraan diizinkan masuk.
 */
describe("UAT Sprint 6: Skenario Pembebasan Blacklist (End-to-End)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TAHAP 1: Pembuatan Pelanggaran & Pemicu Auto-Blacklist
  // ─────────────────────────────────────────────────────────────────────────

  describe("Tahap 1: Pembuatan Pelanggaran & Auto-Blacklist", () => {
    it("harus menghitung denda dengan benar untuk pelanggaran PARKIR_AREA_SALAH pertama (multiplier 1x)", async () => {
      // Pelanggaran pertama: belum ada riwayat
      (db.violation.count as jest.Mock).mockResolvedValue(0);

      const result = await calculateFine("B1234ABC", "PARKIR_AREA_SALAH");

      expect(result.baseFine).toBe(50000);
      expect(result.multiplier).toBe(1);
      expect(result.totalFine).toBe(50000);
    });

    it("harus menerapkan multiplier 2x pada pelanggaran ke-3 dalam 30 hari", async () => {
      // 2 pelanggaran sebelumnya sudah ada → pelanggaran ke-3 kena 2x
      (db.violation.count as jest.Mock).mockResolvedValue(2);

      const result = await calculateFine("B1234ABC", "PARKIR_AREA_SALAH");

      expect(result.multiplier).toBe(2);
      expect(result.totalFine).toBe(100000);
    });

    it("harus menerapkan multiplier 3x pada pelanggaran ke-5 dalam 30 hari", async () => {
      // 4 pelanggaran sebelumnya sudah ada → pelanggaran ke-5 kena 3x
      (db.violation.count as jest.Mock).mockResolvedValue(4);

      const result = await calculateFine("B1234ABC", "PARKIR_AREA_SALAH");

      expect(result.multiplier).toBe(3);
      expect(result.totalFine).toBe(150000);
    });

    it("harus men-trigger auto-blacklist (AUTO_VIOLATION) setelah 5 pelanggaran dalam 3 bulan", async () => {
      // Tidak ada denda lama yang belum dibayar
      (db.violation.aggregate as jest.Mock).mockResolvedValue({
        _count: 0,
        _sum: { totalFine: 0 },
      });
      // Sudah 5 pelanggaran dalam 3 bulan → blacklist otomatis
      (db.violation.count as jest.Mock).mockResolvedValue(5);

      const result = await checkAutoBlacklist("B1234ABC");

      expect(result.shouldBlacklist).toBe(true);
      expect(result.blacklistType).toBe("AUTO_VIOLATION");
      expect(result.reason).toContain("5 pelanggaran");
      expect(result.duration).toBe(30); // Diblokir 30 hari
    });

    it("harus men-trigger auto-blacklist (AUTO_DENDA) jika ada denda belum dibayar > 30 hari", async () => {
      // Ada denda PENDING yang sudah lewat 30 hari
      (db.violation.aggregate as jest.Mock).mockResolvedValue({
        _count: 1,
        _sum: { totalFine: 150000 },
      });
      // Pelanggaran dalam 3 bulan kurang dari 5 (denda lama lebih dulu diperiksa)
      (db.violation.count as jest.Mock).mockResolvedValue(0);

      const result = await checkAutoBlacklist("B1234ABC");

      expect(result.shouldBlacklist).toBe(true);
      expect(result.blacklistType).toBe("AUTO_DENDA");
      expect(result.reason).toContain("30 hari");
      expect(result.duration).toBeUndefined(); // Permanen sampai lunas
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TAHAP 2: Satpam Coba Akses → Ditolak (Kendaraan Masih di Blacklist)
  // ─────────────────────────────────────────────────────────────────────────

  describe("Tahap 2: Akses Masuk Satpam Ditolak (Kendaraan di Blacklist)", () => {
    it("harus menolak akses kendaraan yang masih berstatus blacklist ACTIVE (tanpa tanggal kedaluwarsa / permanen)", async () => {
      (db.blacklist.findFirst as jest.Mock).mockResolvedValue({
        id: "bl-001",
        vehicleId: "B1234ABC",
        status: "ACTIVE",
        reason: "Denda belum dibayar selama > 30 hari (Rp 150.000)",
        endDate: null, // Permanen
      });

      const result = await isVehicleBlacklisted("B1234ABC");

      expect(result.isBlacklisted).toBe(true);
      expect(result.reason).toContain("Denda belum dibayar");
      expect(result.blacklistId).toBe("bl-001");
    });

    it("harus menolak akses kendaraan yang berstatus blacklist ACTIVE dengan tanggal kedaluwarsa di masa depan", async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 20); // Masih 20 hari ke depan

      (db.blacklist.findFirst as jest.Mock).mockResolvedValue({
        id: "bl-002",
        vehicleId: "B1234ABC",
        status: "ACTIVE",
        reason: "5 pelanggaran dalam 3 bulan terakhir",
        endDate: futureDate,
      });

      const result = await isVehicleBlacklisted("B1234ABC");

      expect(result.isBlacklisted).toBe(true);
      expect(result.blacklistId).toBe("bl-002");
    });

    it("harus memastikan sistem TIDAK mengizinkan akses selama status blacklist masih ACTIVE", async () => {
      (db.blacklist.findFirst as jest.Mock).mockResolvedValue({
        id: "bl-001",
        vehicleId: "B1234ABC",
        status: "ACTIVE",
        reason: "AUTO_VIOLATION",
        endDate: null,
      });

      const result = await isVehicleBlacklisted("B1234ABC");

      // Satpam melihat alert merah → akses DITOLAK
      expect(result.isBlacklisted).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TAHAP 3: Pembayaran Denda Lunas → Blacklist Diangkat
  // ─────────────────────────────────────────────────────────────────────────

  describe("Tahap 3: Setelah Denda Lunas → Blacklist Diangkat", () => {
    it("harus membebaskan kendaraan dari blacklist setelah pembayaran denda lunas (tidak ada record blacklist ACTIVE)", async () => {
      // Setelah denda dibayar, blacklist entry di-nonaktifkan (INACTIVE / dihapus)
      // Tidak ada blacklist ACTIVE yang ditemukan
      (db.blacklist.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await isVehicleBlacklisted("B1234ABC");

      expect(result.isBlacklisted).toBe(false);
    });

    it("harus memastikan auto-blacklist tidak terpicu lagi jika semua denda sudah lunas", async () => {
      // Setelah pembayaran: tidak ada denda lama PENDING
      (db.violation.aggregate as jest.Mock).mockResolvedValue({
        _count: 0,
        _sum: { totalFine: 0 },
      });
      // Pelanggaran dalam 3 bulan kurang dari 5
      (db.violation.count as jest.Mock).mockResolvedValue(2);

      const result = await checkAutoBlacklist("B1234ABC");

      expect(result.shouldBlacklist).toBe(false);
      expect(result.blacklistType).toBeNull();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TAHAP 4: Satpam Coba Akses Lagi → Diizinkan Masuk
  // ─────────────────────────────────────────────────────────────────────────

  describe("Tahap 4: Akses Masuk Satpam Diizinkan (Setelah Blacklist Diangkat)", () => {
    it("harus mengizinkan akses kendaraan yang sudah bebas dari blacklist", async () => {
      // Blacklist sudah diangkat → tidak ada entri ACTIVE
      (db.blacklist.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await isVehicleBlacklisted("B1234ABC");

      // Satpam melihat status hijau → akses DIIZINKAN
      expect(result.isBlacklisted).toBe(false);
      expect(result.reason).toBeUndefined();
      expect(result.blacklistId).toBeUndefined();
    });

    it("harus memastikan kendaraan yang blacklist-nya sudah EXPIRED tidak diblokir", async () => {
      // Entri blacklist sudah kedaluwarsa (endDate di masa lalu) → tidak dikembalikan oleh query
      (db.blacklist.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await isVehicleBlacklisted("B1234ABC");

      expect(result.isBlacklisted).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // EDGE CASES: Skenario Batas & Kondisi Khusus
  // ─────────────────────────────────────────────────────────────────────────

  describe("Edge Cases: Skenario Batas & Kondisi Khusus", () => {
    it("tidak boleh men-trigger blacklist jika jumlah pelanggaran tepat 4 (satu di bawah threshold)", async () => {
      (db.violation.aggregate as jest.Mock).mockResolvedValue({
        _count: 0,
        _sum: { totalFine: 0 },
      });
      (db.violation.count as jest.Mock).mockResolvedValue(4); // Tepat di bawah threshold 5

      const result = await checkAutoBlacklist("B1234ABC");

      expect(result.shouldBlacklist).toBe(false);
      expect(result.blacklistType).toBeNull();
    });

    it("harus men-trigger blacklist AUTO_DENDA hanya jika total denda > 0 (bukan jika _count > 0 tapi totalFine = 0)", async () => {
      // _count > 0 tapi totalFine = 0 (seharusnya tidak blacklist)
      (db.violation.aggregate as jest.Mock).mockResolvedValue({
        _count: 1,
        _sum: { totalFine: 0 },
      });
      (db.violation.count as jest.Mock).mockResolvedValue(2);

      const result = await checkAutoBlacklist("B1234ABC");

      // totalFine = 0 → tidak di-blacklist karena kondisi: _count > 0 && totalFine > 0
      expect(result.shouldBlacklist).toBe(false);
    });

    it("harus memprioritaskan AUTO_DENDA di atas AUTO_VIOLATION jika keduanya terpenuhi", async () => {
      // Kedua kondisi terpenuhi: ada denda lama DAN 5+ pelanggaran
      (db.violation.aggregate as jest.Mock).mockResolvedValue({
        _count: 2,
        _sum: { totalFine: 200000 },
      });
      (db.violation.count as jest.Mock).mockResolvedValue(6);

      const result = await checkAutoBlacklist("B1234ABC");

      // AUTO_DENDA diperiksa lebih dulu → blacklistType harus AUTO_DENDA
      expect(result.shouldBlacklist).toBe(true);
      expect(result.blacklistType).toBe("AUTO_DENDA");
    });

    it("harus mengembalikan isBlacklisted = false jika vehicleId tidak terdaftar di blacklist sama sekali", async () => {
      (db.blacklist.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await isVehicleBlacklisted("KENDARAAN_BARU_999");

      expect(result.isBlacklisted).toBe(false);
    });
  });
});
