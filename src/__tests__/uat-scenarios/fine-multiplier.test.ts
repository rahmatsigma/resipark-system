
import { calculateFine } from "../../lib/rules";
import { db } from "../../lib/db";

// Mock the db module
jest.mock("../../lib/db", () => ({
  db: {
    violation: {
      count: jest.fn(),
    },
  },
}));

describe("UAT Scenario 4: Uji Coba Multiplier Denda", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should not multiply fine for the 1st violation (recentViolations = 0)", async () => {
    (db.violation.count as jest.Mock).mockResolvedValue(0);

    const result = await calculateFine("vehicle-1", "PARKIR_AREA_SALAH");

    expect(result.multiplier).toBe(1);
    expect(result.totalFine).toBe(50000); // Base fine for PARKIR_AREA_SALAH
    expect(db.violation.count).toHaveBeenCalledTimes(1);
  });

  it("should multiply fine by 2 for the 3rd violation (recentViolations = 2)", async () => {
    (db.violation.count as jest.Mock).mockResolvedValue(2);

    const result = await calculateFine("vehicle-1", "PARKIR_AREA_SALAH");

    expect(result.multiplier).toBe(2);
    expect(result.totalFine).toBe(100000); // 50000 * 2
  });

  it("should multiply fine by 3 for the 5th violation (recentViolations = 4)", async () => {
    (db.violation.count as jest.Mock).mockResolvedValue(4);

    const result = await calculateFine("vehicle-1", "PARKIR_AREA_SALAH");

    expect(result.multiplier).toBe(3);
    expect(result.totalFine).toBe(150000); // 50000 * 3
  });

  it("should apply 3x multiplier for > 5th violation (e.g. recentViolations = 6)", async () => {
    (db.violation.count as jest.Mock).mockResolvedValue(6);

    const result = await calculateFine("vehicle-1", "PARKIR_AREA_SALAH");

    expect(result.multiplier).toBe(3);
    expect(result.totalFine).toBe(150000);
  });
});
