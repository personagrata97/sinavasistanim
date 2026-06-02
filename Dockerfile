# ==================== BUILD STAGE ====================
FROM node:20-alpine AS builder
WORKDIR /app

# Dependencies
COPY package.json package-lock.json* .npmrc* ./
RUN npm ci --no-audit

# Prisma
COPY prisma ./prisma/
RUN npx prisma generate

# Build
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ==================== PRODUCTION STAGE ====================
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built artifacts
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Uploads directory
RUN mkdir -p uploads && chown nextjs:nodejs uploads

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
