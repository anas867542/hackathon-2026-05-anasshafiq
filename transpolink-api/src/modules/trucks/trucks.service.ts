import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTruckDto } from './dto/create-truck.dto';
import { UpdateTruckDto } from './dto/update-truck.dto';
import { AuthUser } from '../../common/decorators/current-user.decorator';

@Injectable()
export class TrucksService {
  constructor(private prisma: PrismaService) {}

  async create(driverId: string, dto: CreateTruckDto) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        if (dto.isPrimary) {
          await tx.truck.updateMany({
            where: { driverId, isPrimary: true },
            data: { isPrimary: false },
          });
        }
        return tx.truck.create({
          data: {
            driverId,
            type: dto.type,
            plateNumber: dto.plateNumber.toUpperCase().trim(),
            capacityKg: dto.capacityKg,
            capacityVolumeM3: dto.capacityVolumeM3,
            make: dto.make,
            model: dto.model,
            year: dto.year,
            color: dto.color,
            registrationDocUrl: dto.registrationDocUrl,
            insuranceDocUrl: dto.insuranceDocUrl,
            insuranceExpiry: dto.insuranceExpiry ? new Date(dto.insuranceExpiry) : undefined,
            isPrimary: dto.isPrimary ?? false,
          },
        });
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Plate number already registered');
      }
      throw e;
    }
  }

  async findAll(actor: AuthUser, driverId?: string) {
    const where: Prisma.TruckWhereInput =
      actor.role === UserRole.admin && driverId
        ? { driverId }
        : actor.role === UserRole.driver
        ? { driverId: actor.driverId ?? '__none__' }
        : {};

    return this.prisma.truck.findMany({
      where,
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findOne(actor: AuthUser, id: string) {
    const truck = await this.prisma.truck.findUnique({ where: { id } });
    if (!truck) throw new NotFoundException('Truck not found');
    this.assertCanManage(actor, truck.driverId);
    return truck;
  }

  async update(actor: AuthUser, id: string, dto: UpdateTruckDto) {
    const truck = await this.prisma.truck.findUnique({ where: { id } });
    if (!truck) throw new NotFoundException('Truck not found');
    this.assertCanManage(actor, truck.driverId);

    return this.prisma.$transaction(async (tx) => {
      if (dto.isPrimary) {
        await tx.truck.updateMany({
          where: { driverId: truck.driverId, isPrimary: true, NOT: { id } },
          data: { isPrimary: false },
        });
      }
      return tx.truck.update({
        where: { id },
        data: {
          ...dto,
          plateNumber: dto.plateNumber != null ? dto.plateNumber.toUpperCase().trim() : undefined,
          insuranceExpiry: dto.insuranceExpiry ? new Date(dto.insuranceExpiry) : undefined,
        },
      });
    });
  }

  async remove(actor: AuthUser, id: string) {
    const truck = await this.prisma.truck.findUnique({ where: { id } });
    if (!truck) throw new NotFoundException('Truck not found');
    this.assertCanManage(actor, truck.driverId);

    // Soft-deactivate; do not destroy historical references
    return this.prisma.truck.update({
      where: { id },
      data: { isActive: false, isPrimary: false },
    });
  }

  private assertCanManage(actor: AuthUser, ownerDriverId: string) {
    if (actor.role === UserRole.admin) return;
    if (actor.role === UserRole.driver && actor.driverId === ownerDriverId) return;
    throw new ForbiddenException('Cannot manage this truck');
  }
}
