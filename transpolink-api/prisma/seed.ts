import { PrismaClient, UserRole, UserStatus, VehicleType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const rounds = parseInt(process.env.BCRYPT_ROUNDS ?? '12', 10);
  const adminHash = await bcrypt.hash('Admin@2025', rounds);
  const driverHash = await bcrypt.hash('Driver@2025', rounds);
  const customerHash = await bcrypt.hash('Customer@2025', rounds);

  await prisma.user.upsert({
    where: { email: 'admin@transpolink.dev' },
    update: {},
    create: {
      email: 'admin@transpolink.dev',
      phone: '+923000000000',
      passwordHash: adminHash,
      fullName: 'Site Admin',
      role: UserRole.admin,
      status: UserStatus.active,
    },
  });

  const customer = await prisma.user.upsert({
    where: { email: 'customer@transpolink.dev' },
    update: {},
    create: {
      email: 'customer@transpolink.dev',
      phone: '+923000000001',
      passwordHash: customerHash,
      fullName: 'Demo Customer',
      role: UserRole.customer,
      status: UserStatus.active,
    },
  });

  const driverUser = await prisma.user.upsert({
    where: { email: 'driver@transpolink.dev' },
    update: {},
    create: {
      email: 'driver@transpolink.dev',
      phone: '+923000000002',
      passwordHash: driverHash,
      fullName: 'Demo Driver',
      role: UserRole.driver,
      status: UserStatus.active,
      driver: {
        create: {
          licenseNumber: 'LHR-001',
          licenseExpiry: new Date('2030-01-01'),
          trucks: {
            create: {
              type: VehicleType.mini_truck,
              plateNumber: 'LEH-1234',
              capacityKg: 800,
              make: 'Suzuki',
              model: 'Ravi',
              year: 2022,
              isPrimary: true,
            },
          },
        },
      },
    },
  });

  console.log('Seeded users:', {
    admin: 'admin@transpolink.dev / Admin@2025',
    customer: customer.email + ' / Customer@2025',
    driver: driverUser.email + ' / Driver@2025',
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
