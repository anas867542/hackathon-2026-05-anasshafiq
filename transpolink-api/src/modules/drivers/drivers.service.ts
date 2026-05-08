import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DriverStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { FindNearbyDto } from './dto/find-nearby.dto';
import { DriverOnboardingDto } from './dto/onboarding.dto';

@Injectable()
export class DriversService {
  constructor(private prisma: PrismaService) {}

  /**
   * Driver onboarding — upserts the Driver row tied to the authenticated user.
   * Creates it on first submission, updates it on resubmission (e.g., after rejection).
   */
  async submitOnboarding(userId: string, dto: DriverOnboardingDto) {
    try {
      return await this.prisma.driver.upsert({
        where: { userId },
        create: {
          userId,
          licenseNumber: dto.licenseNumber,
          licenseExpiry: new Date(dto.licenseExpiry),
          cnicNumber: dto.cnicNumber,
          licenseDocUrl: dto.licenseDocUrl,
        },
        update: {
          licenseNumber: dto.licenseNumber,
          licenseExpiry: new Date(dto.licenseExpiry),
          cnicNumber: dto.cnicNumber,
          licenseDocUrl: dto.licenseDocUrl,
          docStatus: 'pending',
        },
        select: {
          id: true,
          licenseNumber: true,
          licenseExpiry: true,
          cnicNumber: true,
          licenseDocUrl: true,
          docStatus: true,
          status: true,
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('License or CNIC already registered to another driver');
      }
      throw e;
    }
  }

  async getMe(driverId: string) {
    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
      include: {
        user: { select: { fullName: true, email: true, phone: true, avatarUrl: true } },
        trucks: true,
      },
    });
    if (!driver) throw new NotFoundException('Driver profile not found');
    return driver;
  }

  async setAvailability(driverId: string, dto: UpdateAvailabilityDto) {
    return this.prisma.driver.update({
      where: { id: driverId },
      data: {
        status: dto.status,
        currentLat: dto.lat,
        currentLng: dto.lng,
        lastLocationAt: dto.lat && dto.lng ? new Date() : undefined,
      },
      select: { id: true, status: true, currentLat: true, currentLng: true, lastLocationAt: true },
    });
  }

  async updateLocation(driverId: string, dto: UpdateLocationDto) {
    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
      select: { status: true },
    });
    if (!driver) throw new NotFoundException('Driver not found');
    if (driver.status === DriverStatus.offline) {
      throw new ForbiddenException('Go online before sending location updates');
    }

    return this.prisma.driver.update({
      where: { id: driverId },
      data: {
        currentLat: dto.lat,
        currentLng: dto.lng,
        lastLocationAt: new Date(),
      },
      select: { id: true, currentLat: true, currentLng: true, lastLocationAt: true },
    });
  }

  /**
   * Naive "nearby" using Haversine in raw SQL.
   * Production would use Redis GEO for low-latency matching.
   */
  async findNearby(dto: FindNearbyDto) {
    const radius = dto.radiusKm ?? 5;
    // Optional truck-type filter — only include drivers with an active truck
    // of the requested vehicle type.
    const vehicleFilter = dto.vehicleType
      ? Prisma.sql`AND EXISTS (
          SELECT 1 FROM trucks t
          WHERE t.driver_id = d.id
            AND t.is_active = TRUE
            AND t.type = ${dto.vehicleType}::"VehicleType"
        )`
      : Prisma.empty;

    const rows = await this.prisma.$queryRaw<
      Array<{
        id: string;
        full_name: string;
        rating_avg: number;
        distance_km: number;
        current_lat: number;
        current_lng: number;
      }>
    >(Prisma.sql`
      SELECT *
      FROM (
        SELECT d.id,
               u.full_name,
               d.rating_avg,
               d.current_lat,
               d.current_lng,
               (6371 * acos(
                 cos(radians(${dto.lat})) * cos(radians(d.current_lat)) *
                 cos(radians(d.current_lng) - radians(${dto.lng})) +
                 sin(radians(${dto.lat})) * sin(radians(d.current_lat))
               ))::numeric(8,2) AS distance_km
        FROM drivers d
        JOIN users   u ON u.id = d.user_id
        WHERE d.status = 'online'
          AND d.current_lat IS NOT NULL
          AND d.current_lng IS NOT NULL
          ${vehicleFilter}
      ) candidates
      WHERE distance_km <= ${radius}
      ORDER BY distance_km ASC
      LIMIT 20
    `);

    return rows.map((r) => ({
      id: r.id,
      fullName: r.full_name,
      ratingAvg: Number(r.rating_avg),
      distanceKm: Number(r.distance_km),
      // Positions are fuzzed to ~1 km to protect driver privacy on the discovery endpoint.
      // Exact coordinates are only shared with the assigned customer after a booking is accepted.
      lat: Math.round(Number(r.current_lat) * 100) / 100,
      lng: Math.round(Number(r.current_lng) * 100) / 100,
    }));
  }
}
