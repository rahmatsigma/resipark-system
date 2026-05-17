
import { checkAutoBlacklist } from "../../lib/rules";
import { db } from "../../lib/db";

// Mock the db module
jest.mock("../../lib/db", () => ({
  db: {
    violation: {
      aggregate: jest.fn(),
      count: jest.fn(),
    },
  },
}));

describe("UAT Scenario: Uji Coba Sistem Auto-Blacklist & Blokir Akses", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should not blacklist if vehicle has less than 5 violations and no unpaid old fines", async () => {
    (db.violation.aggregate as jest.Mock).mockResolvedValue({
      _count: 0,
      _sum: { totalFine: 0 },
    });
    (db.violation.count as jest.Mock).mockResolvedValue(4); // 4 violations

    const result = await checkAutoBlacklist("vehicle-1");

    expect(result.shouldBlacklist).toBe(false);
    expect(result.blacklistType).toBeNull();
  });

  it("should blacklist vehicle (Akses Ditolak) if it reaches 5 violations", async () => {
    (db.violation.aggregate as jest.Mock).mockResolvedValue({
      _count: 0,
      _sum: { totalFine: 0 },
    });
    (db.violation.count as jest.Mock).mockResolvedValue(5); // 5 violations

    const result = await checkAutoBlacklist("vehicle-1");

    expect(result.shouldBlacklist).toBe(true);
    expect(result.blacklistType).toBe("AUTO_VIOLATION");
    expect(result.reason).toContain("5 pelanggaran");
    expect(result.duration).toBe(30); // Blocked for 30 days
  });

  it("should show red alert / reject access when testing Satpam 'Akses Masuk' on blacklisted plate", async () => {
    // This simulates the behavior where the API returns shouldBlacklist = true 
    // causing the frontend to show the red alert (Akses Ditolak).
    (db.violation.aggregate as jest.Mock).mockResolvedValue({
      _count: 0,
      _sum: { totalFine: 0 },
    });
    (db.violation.count as jest.Mock).mockResolvedValue(6); // > 5 violations

    const result = await checkAutoBlacklist("vehicle-1");

    expect(result.shouldBlacklist).toBe(true);
    expect(result.blacklistType).toBe("AUTO_VIOLATION");
  });
});
