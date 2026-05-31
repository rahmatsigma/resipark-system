-- Improve dashboard and list query performance with targeted indexes.

CREATE INDEX IF NOT EXISTS "users_role_status_idx" ON "users" ("role", "status");
CREATE INDEX IF NOT EXISTS "users_createdAt_idx" ON "users" ("createdAt");

CREATE INDEX IF NOT EXISTS "houses_block_houseNumber_idx" ON "houses" ("block", "houseNumber");
CREATE INDEX IF NOT EXISTS "houses_status_idx" ON "houses" ("status");

CREATE INDEX IF NOT EXISTS "residents_houseId_idx" ON "residents" ("houseId");

CREATE INDEX IF NOT EXISTS "vehicles_userId_status_idx" ON "vehicles" ("userId", "status");
CREATE INDEX IF NOT EXISTS "vehicles_status_registeredAt_idx" ON "vehicles" ("status", "registeredAt");
CREATE INDEX IF NOT EXISTS "vehicles_houseId_idx" ON "vehicles" ("houseId");
CREATE INDEX IF NOT EXISTS "vehicles_category_status_idx" ON "vehicles" ("category", "status");

CREATE INDEX IF NOT EXISTS "parking_areas_type_status_idx" ON "parking_areas" ("type", "status");

CREATE INDEX IF NOT EXISTS "parking_slots_areaId_status_slotType_idx" ON "parking_slots" ("areaId", "status", "slotType");
CREATE INDEX IF NOT EXISTS "parking_slots_vehicleId_idx" ON "parking_slots" ("vehicleId");

CREATE INDEX IF NOT EXISTS "access_records_entryTime_idx" ON "access_records" ("entryTime");
CREATE INDEX IF NOT EXISTS "access_records_exitTime_idx" ON "access_records" ("exitTime");
CREATE INDEX IF NOT EXISTS "access_records_status_idx" ON "access_records" ("status");
CREATE INDEX IF NOT EXISTS "access_records_vehicleId_status_idx" ON "access_records" ("vehicleId", "status");
CREATE INDEX IF NOT EXISTS "access_records_status_entryTime_idx" ON "access_records" ("status", "entryTime");
CREATE INDEX IF NOT EXISTS "access_records_status_exitTime_idx" ON "access_records" ("status", "exitTime");

CREATE INDEX IF NOT EXISTS "guest_accesses_hostHouseId_idx" ON "guest_accesses" ("hostHouseId");

CREATE INDEX IF NOT EXISTS "violations_vehicleId_status_idx" ON "violations" ("vehicleId", "status");
CREATE INDEX IF NOT EXISTS "violations_status_violationDate_idx" ON "violations" ("status", "violationDate");
CREATE INDEX IF NOT EXISTS "violations_violationDate_idx" ON "violations" ("violationDate");
CREATE INDEX IF NOT EXISTS "violations_recordedBy_idx" ON "violations" ("recordedBy");

CREATE INDEX IF NOT EXISTS "blacklists_status_idx" ON "blacklists" ("status");
CREATE INDEX IF NOT EXISTS "blacklists_addedBy_idx" ON "blacklists" ("addedBy");

CREATE INDEX IF NOT EXISTS "activity_logs_createdAt_idx" ON "activity_logs" ("createdAt");
CREATE INDEX IF NOT EXISTS "activity_logs_userId_createdAt_idx" ON "activity_logs" ("userId", "createdAt");
