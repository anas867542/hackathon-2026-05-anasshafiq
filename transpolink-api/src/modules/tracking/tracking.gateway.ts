import { Logger, UsePipes, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { BookingStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DriverLocationDto } from './dto/driver-location.dto';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { TrackingEvents } from './events';

interface AuthSocket extends Socket {
  data: {
    userId: string;
    role: UserRole;
    driverId?: string | null;
  };
}

const DB_WRITE_INTERVAL_MS = 3000;
const LIVE_STATUSES: BookingStatus[] = [
  BookingStatus.accepted,
  BookingStatus.arrived,
  BookingStatus.in_progress,
];

@WebSocketGateway({
  namespace: '/realtime',
  cors: {
    origin: (process.env.CORS_ORIGIN ?? 'http://localhost:3000')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
    credentials: true,
  },
})
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
export class TrackingGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(TrackingGateway.name);

  /** Per-driver throttle: last DB write timestamp (ms since epoch). */
  private readonly lastDbWriteAt = new Map<string, number>();

  /** Per-driver: last broadcast position + timestamp — used to skip redundant WS emits. */
  private readonly lastBroadcast = new Map<string, { lat: number; lng: number; t: number }>();
  private static readonly MIN_BROADCAST_METERS = 10;
  private static readonly MIN_BROADCAST_MS = 2_000;

  /** Per-IP auth attempts: timestamps within the last 60s. */
  private readonly authAttempts = new Map<string, number[]>();
  private static readonly AUTH_WINDOW_MS = 60_000;
  private static readonly AUTH_MAX_PER_WINDOW = 10;

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  afterInit() {
    this.logger.log('Tracking gateway initialised at /realtime');
  }

  private rateLimitOrThrow(ip: string) {
    const now = Date.now();
    const cutoff = now - TrackingGateway.AUTH_WINDOW_MS;
    const recent = (this.authAttempts.get(ip) ?? []).filter((t) => t > cutoff);
    if (recent.length >= TrackingGateway.AUTH_MAX_PER_WINDOW) {
      throw new WsException('Too many connection attempts');
    }
    recent.push(now);
    this.authAttempts.set(ip, recent);
  }

  // =========================================================
  // Auth: validate JWT in handshake → join role-scoped rooms
  // =========================================================
  async handleConnection(client: AuthSocket) {
    const ip =
      (client.handshake.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ||
      client.handshake.address ||
      'unknown';

    try {
      this.rateLimitOrThrow(ip);

      const token =
        (client.handshake.auth?.token as string | undefined) ??
        (client.handshake.headers.authorization ?? '').replace(/^Bearer\s+/i, '');

      if (!token) throw new WsException('Missing token');

      const payload = await this.jwt.verifyAsync<JwtPayload>(token, {
        secret: this.config.getOrThrow('JWT_ACCESS_SECRET'),
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: { driver: { select: { id: true } } },
      });
      if (!user) throw new WsException('User not found');

      client.data.userId = user.id;
      client.data.role = user.role;
      client.data.driverId = user.driver?.id ?? null;

      client.join(`user:${user.id}`);
      if (client.data.driverId) {
        client.join(`driver:${client.data.driverId}`);
        this.logger.log(`Connected ${user.id} (${user.role})  socket=${client.id}  joined driver:${client.data.driverId}`);
      } else {
        this.logger.log(`Connected ${user.id} (${user.role})  socket=${client.id}  driverId=null — no driver room joined`);
      }
    } catch (e) {
      this.logger.warn(`Reject connection: ${(e as Error).message}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: AuthSocket) {
    if (client.data?.userId) {
      this.logger.log(`Disconnected ${client.data.userId}  socket=${client.id}`);
    }
  }

  // =========================================================
  // Customer / driver join a booking room for live updates
  // =========================================================
  @SubscribeMessage(TrackingEvents.BookingSubscribe)
  async subscribeBooking(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() body: { bookingId: string },
  ) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: body.bookingId },
      select: { id: true, customerId: true, driverId: true },
    });
    if (!booking) throw new WsException('Booking not found');

    const allowed =
      client.data.role === UserRole.admin ||
      booking.customerId === client.data.userId ||
      // Explicit null guard: both being null must NOT grant access
      (booking.driverId != null &&
        client.data.driverId != null &&
        booking.driverId === client.data.driverId);

    if (!allowed) throw new WsException('Forbidden');

    client.join(`booking:${booking.id}`);
    return { ok: true, room: `booking:${booking.id}` };
  }

  @SubscribeMessage(TrackingEvents.BookingUnsubscribe)
  unsubscribeBooking(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() body: { bookingId: string },
  ) {
    client.leave(`booking:${body.bookingId}`);
    return { ok: true };
  }

  // =========================================================
  // Driver pushes GPS — every few seconds
  //  • Always rebroadcast to the booking room (real-time)
  //  • Persist to DB at most every DB_WRITE_INTERVAL_MS
  // =========================================================
  @SubscribeMessage(TrackingEvents.DriverLocation)
  async driverLocation(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() body: DriverLocationDto,
  ) {
    if (client.data.role !== UserRole.driver || !client.data.driverId) {
      throw new WsException('Driver only');
    }
    const driverId = client.data.driverId;

    const booking = await this.prisma.booking.findUnique({
      where: { id: body.bookingId },
      select: { driverId: true, status: true },
    });
    if (!booking) throw new WsException('Booking not found');
    if (booking.driverId !== driverId) throw new WsException('Not your booking');
    if (!LIVE_STATUSES.includes(booking.status)) {
      throw new WsException(`Booking not in a trackable state (${booking.status})`);
    }

    const now = Date.now();
    const last = this.lastDbWriteAt.get(driverId) ?? 0;
    if (now - last >= DB_WRITE_INTERVAL_MS) {
      this.lastDbWriteAt.set(driverId, now);
      const ts = new Date(now);
      // fire-and-forget; do not block fan-out on a slow DB
      Promise.all([
        this.prisma.driver.update({
          where: { id: driverId },
          data: { currentLat: body.lat, currentLng: body.lng, lastLocationAt: ts },
        }),
        this.prisma.tripLocation.create({
          data: {
            bookingId: body.bookingId,
            driverId,
            lat: body.lat,
            lng: body.lng,
            speedKmh: body.speedKmh ?? null,
            heading: body.heading ?? null,
            recordedAt: ts,
          },
        }),
      ]).catch((e) => this.logger.error(`Persist location failed for ${driverId}`, e));
    }

    // Skip broadcast if the driver hasn't moved meaningfully AND we emitted recently.
    // Deduplicates redundant WS messages when GPS polling fires faster than movement.
    const prev = this.lastBroadcast.get(driverId);
    const movedFar = !prev || TrackingGateway.haversineMeters(prev, body) >= TrackingGateway.MIN_BROADCAST_METERS;
    const timeGate = !prev || (now - prev.t) >= TrackingGateway.MIN_BROADCAST_MS;

    if (movedFar || timeGate) {
      this.lastBroadcast.set(driverId, { lat: body.lat, lng: body.lng, t: now });
      this.server.to(`booking:${body.bookingId}`).emit(TrackingEvents.BookingDriverLocation, {
        bookingId: body.bookingId,
        lat: body.lat,
        lng: body.lng,
        speedKmh: body.speedKmh,
        heading: body.heading,
        at: new Date(now).toISOString(),
      });
    }

    return { ok: true };
  }

  private static haversineMeters(
    a: { lat: number; lng: number },
    b: { lat: number; lng: number },
  ): number {
    const R = 6_371_000;
    const toRad = (n: number) => (n * Math.PI) / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const x =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(x));
  }

  // =========================================================
  // Server-side helpers used by other modules (BookingsService).
  // =========================================================
  emitBookingStatus(bookingId: string, status: string, extra: Record<string, unknown> = {}) {
    this.server
      .to(`booking:${bookingId}`)
      .emit(TrackingEvents.BookingStatus, {
        bookingId,
        status,
        at: new Date().toISOString(),
        ...extra,
      });
  }

  notifyDriver<T>(driverId: string, event: string, payload: T) {
    this.server.to(`driver:${driverId}`).emit(event, payload);
  }

  notifyUser<T>(userId: string, event: string, payload: T) {
    this.server.to(`user:${userId}`).emit(event, payload);
  }

  notifyDrivers<T>(driverIds: string[], event: string, payload: T) {
    if (driverIds.length === 0) return;
    driverIds.forEach(async (id) => {
      const room = `driver:${id}`;
      const sockets = await this.server.in(room).fetchSockets();
      this.logger.log(`Emitting ${event} to room ${room} — ${sockets.length} socket(s) connected`);
    });
    this.server.to(driverIds.map((id) => `driver:${id}`)).emit(event, payload);
  }

  /**
   * Force-join all sockets currently in user:{userId} room into driver:{driverId} room.
   * Called when a driver goes online via REST so that even if the initial WebSocket
   * connection happened before the driver profile existed, the room join is corrected.
   */
  async ensureDriverInRoom(userId: string, driverId: string) {
    const sockets = await this.server.in(`user:${userId}`).fetchSockets();
    this.logger.log(`ensureDriverInRoom: user=${userId} driverId=${driverId} sockets=${sockets.length}`);
    for (const s of sockets) {
      await s.join(`driver:${driverId}`);
    }
  }
}
