'use client';

import { io, Socket } from 'socket.io-client';
import { session } from '@/lib/auth/session';

let socket: Socket | null = null;

/**
 * Single shared Socket.io connection per browser tab.
 * - Reconnects automatically with exponential back-off.
 * - Before each reconnect attempt the latest access token is pulled from
 *   localStorage so a silent HTTP-layer JWT refresh is honoured by the WS
 *   layer too (avoids a stale-token disconnect loop).
 */
export function getSocket(token: string): Socket {
  const url = process.env.NEXT_PUBLIC_API_WS_URL ?? 'http://localhost:4000';

  if (socket) {
    // Keep auth fresh; socket.io's built-in reconnect loop will pick it up.
    // Never destroy and recreate — that orphans all listeners registered by hooks.
    socket.auth = { token };
    return socket;
  }

  socket = io(`${url}/realtime`, {
    auth: { token },
    transports: ['websocket'],  // skip polling-upgrade handshake; saves a round trip
    reconnection: true,
    reconnectionAttempts: 15,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 8000,
  });

  // Refresh JWT before every reconnect so an expired access token doesn't
  // permanently block re-authentication on the server.
  socket.io.on('reconnect_attempt', () => {
    const fresh = session.getAccessToken();
    if (fresh && socket) socket.auth = { token: fresh };
  });

  socket.on('connect_error', (err) => {
    // eslint-disable-next-line no-console
    console.warn('[socket] connect_error', err.message);
  });

  return socket;
}

export function disconnectSocket() {
  socket?.removeAllListeners();
  socket?.disconnect();
  socket = null;
}
