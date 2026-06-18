import { calculateOvertimeFine, checkParkingCapacity } from "../../lib/rules";
import { db } from "../../lib/db";

// Mock the db module
jest.mock("../../lib/db", () => ({
  db: {
    parkingArea: {
      findUnique: jest.fn(),
    },
  },
}));

describe("Sprint 3: Validasi Hitungan Overtime & Kapasitas Penuh", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Kapasitas Penuh (Kapasitas 100%)", () => {
    it("harus mengizinkan kendaraan masuk jika kapasitas belum 100%", async () => {
      (db.parkingArea.findUnique as jest.Mock).mockResolvedValue({
        id: "area-1",
        currentOccupancy: 99,
        capacity: 100,
      });

      const result = await checkParkingCapacity("area-1");

      expect(result.available).toBe(true);
      expect(result.percentage).toBe(99);
    });

    it("harus menolak masuk kendaraan tambahan jika kapasitas sudah mencapai batas maksimal 100%", async () => {
      (db.parkingArea.findUnique as jest.Mock).mockResolvedValue({
        id: "area-1",
        currentOccupancy: 100,
        capacity: 100,
      });

      const result = await checkParkingCapacity("area-1");

      expect(result.available).toBe(false); // Sistem menolak masuk (available = false)
      expect(result.percentage).toBe(100);
    });
  });

  describe("Hitungan Overtime Tamu", () => {
    it("tidak boleh ada denda jika tamu keluar sebelum batas waktu maksimal", () => {
      const entryTime = new Date("2024-01-01T10:00:00Z");
      const exitTime = new Date("2024-01-01T12:00:00Z"); // durasi 2 jam
      const maxDurationHours = 8; // maksimal 8 jam

      const fine = calculateOvertimeFine(entryTime, exitTime, maxDurationHours);

      expect(fine).toBe(0);
    });

    it("harus memberikan denda Rp 25.000 untuk keterlambatan 1 jam (telat keluar)", () => {
      const entryTime = new Date("2024-01-01T10:00:00Z");
      const exitTime = new Date("2024-01-01T19:00:00Z"); // durasi 9 jam
      const maxDurationHours = 8; // overtime 1 jam

      const fine = calculateOvertimeFine(entryTime, exitTime, maxDurationHours);

      expect(fine).toBe(25000); // 1 jam * 25000
    });

    it("harus memberikan denda kelipatan Rp 25.000 per jam jika telat keluar lebih dari 1 jam (pembulatan ke atas)", () => {
      const entryTime = new Date("2024-01-01T10:00:00Z");
      const exitTime = new Date("2024-01-01T19:15:00Z"); // durasi 9 jam 15 menit
      const maxDurationHours = 8; // overtime 1 jam 15 menit, dibulatkan jadi 2 jam overtime

      const fine = calculateOvertimeFine(entryTime, exitTime, maxDurationHours);

      expect(fine).toBe(50000); // 2 jam * 25000
    });
  });
});
