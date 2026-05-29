-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.access_records (
  id text NOT NULL,
  vehicleId text NOT NULL,
  entryTime timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  exitTime timestamp without time zone,
  slotNumber text,
  areaId text,
  operatorId text NOT NULL,
  status USER-DEFINED NOT NULL DEFAULT 'ACTIVE'::"AccessStatus",
  createdAt timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT access_records_pkey PRIMARY KEY (id),
  CONSTRAINT access_records_vehicleId_fkey FOREIGN KEY (vehicleId) REFERENCES public.vehicles(id),
  CONSTRAINT access_records_areaId_fkey FOREIGN KEY (areaId) REFERENCES public.parking_areas(id),
  CONSTRAINT access_records_operatorId_fkey FOREIGN KEY (operatorId) REFERENCES public.users(id)
);
CREATE TABLE public.activity_logs (
  id text NOT NULL,
  userId text,
  action text NOT NULL,
  module text NOT NULL,
  description text NOT NULL,
  ipAddress text,
  details text,
  createdAt timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT activity_logs_pkey PRIMARY KEY (id),
  CONSTRAINT activity_logs_userId_fkey FOREIGN KEY (userId) REFERENCES public.users(id)
);
CREATE TABLE public.blacklists (
  id text NOT NULL,
  vehicleId text NOT NULL,
  reason text NOT NULL,
  blacklistType USER-DEFINED NOT NULL DEFAULT 'TEMPORARY'::"BlacklistType",
  startDate timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  endDate timestamp without time zone,
  addedBy text NOT NULL,
  status USER-DEFINED NOT NULL DEFAULT 'ACTIVE'::"BlacklistStatus",
  createdAt timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt timestamp without time zone NOT NULL,
  CONSTRAINT blacklists_pkey PRIMARY KEY (id),
  CONSTRAINT blacklists_vehicleId_fkey FOREIGN KEY (vehicleId) REFERENCES public.vehicles(id),
  CONSTRAINT blacklists_addedBy_fkey FOREIGN KEY (addedBy) REFERENCES public.users(id)
);
CREATE TABLE public.guest_accesses (
  id text NOT NULL,
  accessRecordId text NOT NULL,
  hostHouseId text NOT NULL,
  purpose text NOT NULL,
  maxDurationHours integer NOT NULL DEFAULT 8,
  expiredAt timestamp without time zone,
  createdAt timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT guest_accesses_pkey PRIMARY KEY (id),
  CONSTRAINT guest_accesses_accessRecordId_fkey FOREIGN KEY (accessRecordId) REFERENCES public.access_records(id),
  CONSTRAINT guest_accesses_hostHouseId_fkey FOREIGN KEY (hostHouseId) REFERENCES public.houses(id)
);
CREATE TABLE public.houses (
  id text NOT NULL,
  houseNumber text NOT NULL,
  address text,
  block text,
  status USER-DEFINED NOT NULL DEFAULT 'OCCUPIED'::"HouseStatus",
  createdAt timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt timestamp without time zone NOT NULL,
  CONSTRAINT houses_pkey PRIMARY KEY (id)
);
CREATE TABLE public.parking_areas (
  id text NOT NULL,
  name text NOT NULL,
  type USER-DEFINED NOT NULL DEFAULT 'MAIN'::"ParkingAreaType",
  capacity integer NOT NULL,
  motorSlots integer NOT NULL DEFAULT 0,
  mobilSlots integer NOT NULL DEFAULT 0,
  currentOccupancy integer NOT NULL DEFAULT 0,
  currentMotor integer NOT NULL DEFAULT 0,
  currentMobil integer NOT NULL DEFAULT 0,
  status USER-DEFINED NOT NULL DEFAULT 'AVAILABLE'::"ParkingAreaStatus",
  createdAt timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt timestamp without time zone NOT NULL,
  CONSTRAINT parking_areas_pkey PRIMARY KEY (id)
);
CREATE TABLE public.parking_slots (
  id text NOT NULL,
  areaId text NOT NULL,
  slotNumber text NOT NULL,
  slotType USER-DEFINED NOT NULL DEFAULT 'MOTOR'::"SlotType",
  status USER-DEFINED NOT NULL DEFAULT 'AVAILABLE'::"ParkingSlotStatus",
  vehicleId text,
  occupiedAt timestamp without time zone,
  createdAt timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt timestamp without time zone NOT NULL,
  CONSTRAINT parking_slots_pkey PRIMARY KEY (id),
  CONSTRAINT parking_slots_areaId_fkey FOREIGN KEY (areaId) REFERENCES public.parking_areas(id),
  CONSTRAINT parking_slots_vehicleId_fkey FOREIGN KEY (vehicleId) REFERENCES public.vehicles(id)
);
CREATE TABLE public.payments (
  id text NOT NULL,
  violationId text NOT NULL,
  amount double precision NOT NULL,
  paymentMethod text NOT NULL,
  status USER-DEFINED NOT NULL DEFAULT 'PENDING'::"PaymentStatus",
  transactionId text,
  paidAt timestamp without time zone,
  createdAt timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT payments_pkey PRIMARY KEY (id),
  CONSTRAINT payments_violationId_fkey FOREIGN KEY (violationId) REFERENCES public.violations(id)
);
CREATE TABLE public.residents (
  id text NOT NULL,
  userId text NOT NULL,
  houseId text NOT NULL,
  relationship USER-DEFINED NOT NULL DEFAULT 'OWNER'::"ResidentRelation",
  registeredAt timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT residents_pkey PRIMARY KEY (id),
  CONSTRAINT residents_userId_fkey FOREIGN KEY (userId) REFERENCES public.users(id),
  CONSTRAINT residents_houseId_fkey FOREIGN KEY (houseId) REFERENCES public.houses(id)
);
CREATE TABLE public.users (
  id text NOT NULL,
  username text NOT NULL,
  password text NOT NULL,
  email text NOT NULL,
  fullName text NOT NULL,
  phone text,
  role USER-DEFINED NOT NULL DEFAULT 'WARGA'::"UserRole",
  status USER-DEFINED NOT NULL DEFAULT 'ACTIVE'::"UserStatus",
  lastLogin timestamp without time zone,
  createdAt timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt timestamp without time zone NOT NULL,
  CONSTRAINT users_pkey PRIMARY KEY (id)
);
CREATE TABLE public.vehicles (
  id text NOT NULL,
  platNumber text NOT NULL,
  vehicleType USER-DEFINED NOT NULL DEFAULT 'MOTOR'::"VehicleType",
  brand text NOT NULL,
  color text NOT NULL,
  category USER-DEFINED NOT NULL DEFAULT 'WARGA'::"VehicleCategory",
  status USER-DEFINED NOT NULL DEFAULT 'ACTIVE'::"VehicleStatus",
  houseId text,
  userId text,
  registeredAt timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt timestamp without time zone NOT NULL,
  CONSTRAINT vehicles_pkey PRIMARY KEY (id),
  CONSTRAINT vehicles_houseId_fkey FOREIGN KEY (houseId) REFERENCES public.houses(id),
  CONSTRAINT vehicles_userId_fkey FOREIGN KEY (userId) REFERENCES public.users(id)
);
CREATE TABLE public.violation_types (
  id text NOT NULL,
  code USER-DEFINED NOT NULL,
  name text NOT NULL,
  description text,
  baseFine double precision NOT NULL,
  isActive boolean NOT NULL DEFAULT true,
  createdAt timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT violation_types_pkey PRIMARY KEY (id)
);
CREATE TABLE public.violations (
  id text NOT NULL,
  vehicleId text NOT NULL,
  violationTypeId text NOT NULL,
  description text,
  baseFine double precision NOT NULL,
  totalFine double precision NOT NULL,
  multiplier integer NOT NULL DEFAULT 1,
  status USER-DEFINED NOT NULL DEFAULT 'PENDING'::"ViolationStatus",
  recordedBy text NOT NULL,
  violationDate timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  paidAt timestamp without time zone,
  createdAt timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT violations_pkey PRIMARY KEY (id),
  CONSTRAINT violations_vehicleId_fkey FOREIGN KEY (vehicleId) REFERENCES public.vehicles(id),
  CONSTRAINT violations_violationTypeId_fkey FOREIGN KEY (violationTypeId) REFERENCES public.violation_types(id),
  CONSTRAINT violations_recordedBy_fkey FOREIGN KEY (recordedBy) REFERENCES public.users(id)
);
