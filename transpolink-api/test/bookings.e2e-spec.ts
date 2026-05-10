/**
 * Bookings API e2e — covers TC-API-009..023 + TC-EDGE-007/009
 */
import { INestApplication } from '@nestjs/common';
import request = require('supertest');
import { buildTestApp, API } from './utils/app';
import { resetDb, disconnectDb, getPrisma } from './utils/db';
import {
  registerCustomer,
  registerDriver,
  validBookingBody,
  auth,
} from './utils/factories';

describe('Bookings (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  afterAll(async () => {
    await app.close();
    await disconnectDb();
  });

  beforeEach(async () => {
    await resetDb();
  });

  // ---- Creation ----

  // TC-API-009
  it('TC-API-009: customer creates a booking → 201 status pending', async () => {
    const cust = await registerCustomer(app);
    const res = await request(app.getHttpServer())
      .post(`${API}/bookings`)
      .set(auth(cust.accessToken))
      .send(validBookingBody())
      .expect(201);
    expect(res.body.status).toBe('pending');
    expect(res.body.referenceCode).toMatch(/^TPL-/);
    expect(res.body.customerId).toBe(cust.id);
  });

  // TC-API-010
  it('TC-API-010: invalid latitude → 400', async () => {
    const cust = await registerCustomer(app);
    await request(app.getHttpServer())
      .post(`${API}/bookings`)
      .set(auth(cust.accessToken))
      .send(validBookingBody({ pickup: { address: 'X', lat: 999, lng: 67 } }))
      .expect(400);
  });

  // TC-API-011
  it('TC-API-011: invalid vehicleType → 400', async () => {
    const cust = await registerCustomer(app);
    await request(app.getHttpServer())
      .post(`${API}/bookings`)
      .set(auth(cust.accessToken))
      .send(validBookingBody({ vehicleType: 'spaceship' }))
      .expect(400);
  });

  // TC-EDGE-007
  it('TC-EDGE-007: pickup == dropoff → 400 or distance 0 rejected', async () => {
    const cust = await registerCustomer(app);
    const sameSpot = { address: 'Same', lat: 24.86, lng: 67.0 };
    const res = await request(app.getHttpServer())
      .post(`${API}/bookings`)
      .set(auth(cust.accessToken))
      .send(validBookingBody({ pickup: sameSpot, dropoff: sameSpot }));
    expect([400, 422]).toContain(res.status);
  });

  it('TC-API-008b: driver cannot create a booking (role guard) → 403', async () => {
    const drv = await registerDriver(app);
    await request(app.getHttpServer())
      .post(`${API}/bookings`)
      .set(auth(drv.accessToken))
      .send(validBookingBody())
      .expect(403);
  });

  // ---- Listing ----

  // TC-API-012
  it('TC-API-012: GET /bookings paginated', async () => {
    const cust = await registerCustomer(app);
    for (let i = 0; i < 3; i++) {
      await request(app.getHttpServer())
        .post(`${API}/bookings`)
        .set(auth(cust.accessToken))
        .send(validBookingBody());
    }
    const res = await request(app.getHttpServer())
      .get(`${API}/bookings`)
      .set(auth(cust.accessToken))
      .expect(200);
    expect(res.body).toHaveProperty('items');
    expect(res.body).toHaveProperty('total');
    expect(res.body).toHaveProperty('page');
    expect(res.body.items.length).toBeGreaterThanOrEqual(3);
  });

  // TC-API-013
  it('TC-API-013: GET /bookings/:id returns own booking', async () => {
    const cust = await registerCustomer(app);
    const created = await request(app.getHttpServer())
      .post(`${API}/bookings`)
      .set(auth(cust.accessToken))
      .send(validBookingBody());
    const res = await request(app.getHttpServer())
      .get(`${API}/bookings/${created.body.id}`)
      .set(auth(cust.accessToken))
      .expect(200);
    expect(res.body.id).toBe(created.body.id);
  });

  // TC-API-014
  it('TC-API-014: another customer cannot view this booking → 403', async () => {
    const cust1 = await registerCustomer(app);
    const cust2 = await registerCustomer(app);
    const created = await request(app.getHttpServer())
      .post(`${API}/bookings`)
      .set(auth(cust1.accessToken))
      .send(validBookingBody());
    await request(app.getHttpServer())
      .get(`${API}/bookings/${created.body.id}`)
      .set(auth(cust2.accessToken))
      .expect((res: { status: number }) => {
        expect([403, 404]).toContain(res.status);
      });
  });

  // TC-API-015
  it('TC-API-015: GET /bookings/available returns nearby pending booking to driver', async () => {
    const cust = await registerCustomer(app);
    // pickup near Karachi center
    await request(app.getHttpServer())
      .post(`${API}/bookings`)
      .set(auth(cust.accessToken))
      .send(validBookingBody({
        pickup: { address: 'Pickup', lat: 24.8607, lng: 67.0011 },
      }));
    const drv = await registerDriver(app, {
      lat: 24.86,
      lng: 67.001,
      truckType: 'mini_truck',
      online: true,
    });
    const res = await request(app.getHttpServer())
      .get(`${API}/bookings/available`)
      .set(auth(drv.accessToken))
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('TC-API-015b: out-of-range driver receives empty list', async () => {
    const cust = await registerCustomer(app);
    await request(app.getHttpServer())
      .post(`${API}/bookings`)
      .set(auth(cust.accessToken))
      .send(validBookingBody({
        pickup: { address: 'Pickup', lat: 24.8607, lng: 67.0011 },
      }));
    const drv = await registerDriver(app, {
      lat: 31.5497,
      lng: 74.3436,
      truckType: 'mini_truck',
      online: true,
    });
    const res = await request(app.getHttpServer())
      .get(`${API}/bookings/available`)
      .set(auth(drv.accessToken))
      .expect(200);
    expect(res.body).toEqual([]);
  });

  // ---- Lifecycle ----

  async function bootBookingAndDriver() {
    const cust = await registerCustomer(app);
    const drv = await registerDriver(app, {
      lat: 24.8607,
      lng: 67.0011,
      truckType: 'mini_truck',
      online: true,
    });
    const created = await request(app.getHttpServer())
      .post(`${API}/bookings`)
      .set(auth(cust.accessToken))
      .send(validBookingBody());
    return { cust, drv, booking: created.body };
  }

  // TC-API-016
  it('TC-API-016: driver accepts booking → 200, status accepted', async () => {
    const { drv, booking } = await bootBookingAndDriver();
    const res = await request(app.getHttpServer())
      .patch(`${API}/bookings/${booking.id}/accept`)
      .set(auth(drv.accessToken))
      .send({})
      .expect(200);
    expect(res.body.status).toBe('accepted');
    expect(res.body.driverId).toBeTruthy();
  });

  // TC-EDGE-009 / TC-DRV-022
  it('TC-EDGE-009: second driver accepting an already-accepted booking → 4xx', async () => {
    const { booking, drv } = await bootBookingAndDriver();
    const drv2 = await registerDriver(app, {
      lat: 24.86,
      lng: 67.0,
      truckType: 'mini_truck',
      online: true,
    });
    await request(app.getHttpServer())
      .patch(`${API}/bookings/${booking.id}/accept`)
      .set(auth(drv.accessToken))
      .send({})
      .expect(200);
    await request(app.getHttpServer())
      .patch(`${API}/bookings/${booking.id}/accept`)
      .set(auth(drv2.accessToken))
      .send({})
      .expect((res: { status: number }) => {
        expect([400, 409]).toContain(res.status);
      });
  });

  // TC-API-017
  it('TC-API-017: arrive transitions accepted → arrived', async () => {
    const { drv, booking } = await bootBookingAndDriver();
    await request(app.getHttpServer())
      .patch(`${API}/bookings/${booking.id}/accept`)
      .set(auth(drv.accessToken))
      .send({})
      .expect(200);
    const res = await request(app.getHttpServer())
      .patch(`${API}/bookings/${booking.id}/arrive`)
      .set(auth(drv.accessToken))
      .expect(200);
    expect(res.body.status).toBe('arrived');
  });

  // TC-API-018
  it('TC-API-018: start transitions arrived → in_progress', async () => {
    const { drv, booking } = await bootBookingAndDriver();
    await request(app.getHttpServer())
      .patch(`${API}/bookings/${booking.id}/accept`)
      .set(auth(drv.accessToken))
      .send({});
    await request(app.getHttpServer())
      .patch(`${API}/bookings/${booking.id}/arrive`)
      .set(auth(drv.accessToken));
    const res = await request(app.getHttpServer())
      .patch(`${API}/bookings/${booking.id}/start`)
      .set(auth(drv.accessToken))
      .expect(200);
    expect(res.body.status).toBe('in_progress');
  });

  // TC-API-019
  it('TC-API-019: complete transitions in_progress → completed', async () => {
    const { drv, booking } = await bootBookingAndDriver();
    for (const step of ['accept', 'arrive', 'start']) {
      const req = request(app.getHttpServer())
        .patch(`${API}/bookings/${booking.id}/${step}`)
        .set(auth(drv.accessToken));
      if (step === 'accept') req.send({});
      await req;
    }
    const res = await request(app.getHttpServer())
      .patch(`${API}/bookings/${booking.id}/complete`)
      .set(auth(drv.accessToken))
      .expect(200);
    expect(res.body.status).toBe('completed');
  });

  // TC-API-020
  it('TC-API-020: customer cancels pending booking → cancelled', async () => {
    const cust = await registerCustomer(app);
    const created = await request(app.getHttpServer())
      .post(`${API}/bookings`)
      .set(auth(cust.accessToken))
      .send(validBookingBody());
    const res = await request(app.getHttpServer())
      .patch(`${API}/bookings/${created.body.id}/cancel`)
      .set(auth(cust.accessToken))
      .send({ reason: 'changed mind' })
      .expect(200);
    expect(res.body.status).toBe('cancelled');
    expect(res.body.cancellationReason).toBe('changed mind');
  });

  // TC-API-021 / TC-CUST-018
  it('TC-API-021: resend rebroadcasts pending booking', async () => {
    const cust = await registerCustomer(app);
    const created = await request(app.getHttpServer())
      .post(`${API}/bookings`)
      .set(auth(cust.accessToken))
      .send(validBookingBody());
    const before = new Date(created.body.updatedAt).getTime();
    await new Promise((r) => setTimeout(r, 30));
    const res = await request(app.getHttpServer())
      .post(`${API}/bookings/${created.body.id}/resend`)
      .set(auth(cust.accessToken))
      .expect((r: { status: number }) => {
        expect([200, 201]).toContain(r.status);
      });
    expect(new Date(res.body.updatedAt).getTime()).toBeGreaterThan(before);
  });

  // TC-API-022
  it('TC-API-022: resend on accepted booking → 400', async () => {
    const { cust, drv, booking } = await bootBookingAndDriver();
    await request(app.getHttpServer())
      .patch(`${API}/bookings/${booking.id}/accept`)
      .set(auth(drv.accessToken))
      .send({});
    await request(app.getHttpServer())
      .post(`${API}/bookings/${booking.id}/resend`)
      .set(auth(cust.accessToken))
      .expect((res: { status: number }) => {
        expect([400, 409]).toContain(res.status);
      });
  });

  // TC-API-023
  it('TC-API-023: starting before arriving is rejected', async () => {
    const { drv, booking } = await bootBookingAndDriver();
    await request(app.getHttpServer())
      .patch(`${API}/bookings/${booking.id}/accept`)
      .set(auth(drv.accessToken))
      .send({});
    await request(app.getHttpServer())
      .patch(`${API}/bookings/${booking.id}/start`)
      .set(auth(drv.accessToken))
      .expect((res: { status: number }) => {
        expect([400, 409]).toContain(res.status);
      });
  });

  // TC-CUST-019
  it('TC-CUST-019: cancel returns cancellationReason persisted', async () => {
    const cust = await registerCustomer(app);
    const created = await request(app.getHttpServer())
      .post(`${API}/bookings`)
      .set(auth(cust.accessToken))
      .send(validBookingBody());
    await request(app.getHttpServer())
      .patch(`${API}/bookings/${created.body.id}/cancel`)
      .set(auth(cust.accessToken))
      .send({ reason: 'test cancel' })
      .expect(200);
    const prisma = getPrisma();
    const row = await prisma.booking.findUnique({ where: { id: created.body.id } });
    expect(row?.status).toBe('cancelled');
    expect(row?.cancellationReason).toBe('test cancel');
  });
});
