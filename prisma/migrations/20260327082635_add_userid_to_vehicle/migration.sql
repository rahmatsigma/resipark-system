-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_parking_areas" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'MAIN',
    "capacity" INTEGER NOT NULL,
    "motorSlots" INTEGER NOT NULL DEFAULT 0,
    "mobilSlots" INTEGER NOT NULL DEFAULT 0,
    "currentOccupancy" INTEGER NOT NULL DEFAULT 0,
    "currentMotor" INTEGER NOT NULL DEFAULT 0,
    "currentMobil" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_parking_areas" ("capacity", "createdAt", "currentOccupancy", "id", "name", "status", "type", "updatedAt") SELECT "capacity", "createdAt", "currentOccupancy", "id", "name", "status", "type", "updatedAt" FROM "parking_areas";
DROP TABLE "parking_areas";
ALTER TABLE "new_parking_areas" RENAME TO "parking_areas";
CREATE TABLE "new_parking_slots" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "areaId" TEXT NOT NULL,
    "slotNumber" TEXT NOT NULL,
    "slotType" TEXT NOT NULL DEFAULT 'MOTOR',
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "vehicleId" TEXT,
    "occupiedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "parking_slots_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "parking_areas" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "parking_slots_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_parking_slots" ("areaId", "createdAt", "id", "occupiedAt", "slotNumber", "status", "updatedAt", "vehicleId") SELECT "areaId", "createdAt", "id", "occupiedAt", "slotNumber", "status", "updatedAt", "vehicleId" FROM "parking_slots";
DROP TABLE "parking_slots";
ALTER TABLE "new_parking_slots" RENAME TO "parking_slots";
CREATE UNIQUE INDEX "parking_slots_areaId_slotNumber_key" ON "parking_slots"("areaId", "slotNumber");
CREATE TABLE "new_vehicles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "platNumber" TEXT NOT NULL,
    "vehicleType" TEXT NOT NULL DEFAULT 'MOTOR',
    "brand" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'WARGA',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "houseId" TEXT,
    "userId" TEXT,
    "registeredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "vehicles_houseId_fkey" FOREIGN KEY ("houseId") REFERENCES "houses" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "vehicles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_vehicles" ("brand", "category", "color", "houseId", "id", "platNumber", "registeredAt", "status", "updatedAt", "vehicleType") SELECT "brand", "category", "color", "houseId", "id", "platNumber", "registeredAt", "status", "updatedAt", "vehicleType" FROM "vehicles";
DROP TABLE "vehicles";
ALTER TABLE "new_vehicles" RENAME TO "vehicles";
CREATE UNIQUE INDEX "vehicles_platNumber_key" ON "vehicles"("platNumber");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
