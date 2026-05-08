-- CreateTable
CREATE TABLE "trip_locations" (
    "id"          UUID         NOT NULL DEFAULT gen_random_uuid(),
    "booking_id"  UUID         NOT NULL,
    "driver_id"   UUID         NOT NULL,
    "lat"         DECIMAL(10,7) NOT NULL,
    "lng"         DECIMAL(10,7) NOT NULL,
    "speed_kmh"   DOUBLE PRECISION,
    "heading"     DOUBLE PRECISION,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trip_locations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "trip_locations_booking_id_recorded_at_idx" ON "trip_locations"("booking_id", "recorded_at");

-- CreateIndex
CREATE INDEX "trip_locations_driver_id_recorded_at_idx" ON "trip_locations"("driver_id", "recorded_at");

-- AddForeignKey
ALTER TABLE "trip_locations" ADD CONSTRAINT "trip_locations_booking_id_fkey"
    FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_locations" ADD CONSTRAINT "trip_locations_driver_id_fkey"
    FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
