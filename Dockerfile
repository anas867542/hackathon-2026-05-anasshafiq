# ─── Stage 1: production dependencies ────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY transpolink-api/package.json transpolink-api/package-lock.json ./
RUN npm ci --omit=dev

# ─── Stage 2: builder (compile TS + generate Prisma client) ───────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY transpolink-api/package.json transpolink-api/package-lock.json ./
RUN npm ci
COPY transpolink-api/ .
RUN npx prisma generate
RUN npm run build

# ─── Stage 3: runner (lean production image) ──────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Production node_modules from the deps stage
COPY --from=deps /app/node_modules ./node_modules
# Override Prisma generated client with the one built in builder stage
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
# Prisma CLI + engines (needed at runtime for `prisma migrate deploy`)
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
# Compiled NestJS output
COPY --from=builder /app/dist ./dist
# Prisma schema needed for prisma migrate deploy
COPY --from=builder /app/prisma ./prisma
COPY transpolink-api/package.json ./

# Run as non-root
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget -qO- http://localhost:4000/api/v1/health || exit 1

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
