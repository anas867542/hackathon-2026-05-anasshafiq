import { Injectable, Logger } from '@nestjs/common';
import { Prisma, VehicleType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface NearbyDriver {
  driverId: string;
  userId: string;
  fullName: string;
  ratingAvg: number;
  distanceKm: number;
}

@Injectable()
export class MatchingService {
  private readonly logger = new Logger(MatchingService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Find online drivers near a pickup point that own a truck of the requested type.
   * Naive Haversine for MVP; replace with Redis GEO for sub-millisecond lookups.
   */
  async findCandidates(
    pickupLat: number,
    pickupLng: number,
    vehicleType: VehicleType,
    radiusKm = 5,
    limit = 10,
  ): Promise<NearbyDriver[]> {
    // Subquery so we can filter by the computed `distance_km` alias.
    const rows = await this.prisma.$queryRaw<
      Array<{
        driver_id: string;
        user_id: string;
        full_name: string;
        rating_avg: number;
        distance_km: number;
      }>
    >(Prisma.sql`
      SELECT *
      FROM (
        SELECT d.id          AS driver_id,
               u.id          AS user_id,
               u.full_name,
               d.rating_avg,
               (6371 * acos(
                 cos(radians(${pickupLat})) * cos(radians(d.current_lat)) *
                 cos(radians(d.current_lng) - radians(${pickupLng})) +
                 sin(radians(${pickupLat})) * sin(radians(d.current_lat))
               ))::numeric(8,2) AS distance_km
        FROM drivers d
        JOIN users   u ON u.id = d.user_id
        JOIN trucks  t ON t.driver_id = d.id
        WHERE d.status = 'online'
          AND d.current_lat IS NOT NULL
          AND d.current_lng IS NOT NULL
          AND t.type = ${vehicleType}::"VehicleType"
          AND t.is_active = TRUE
      ) candidates
      WHERE distance_km <= ${radiusKm}
      ORDER BY distance_km ASC
      LIMIT ${limit}
    `);

    this.logger.debug(`Matching: ${rows.length} candidates within ${radiusKm}km`);

    return rows.map((r) => ({
      driverId: r.driver_id,
      userId: r.user_id,
      fullName: r.full_name,
      ratingAvg: Number(r.rating_avg),
      distanceKm: Number(r.distance_km),
    }));
  }
}
