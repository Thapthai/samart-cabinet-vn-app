# ================================
# Multi-stage Dockerfile for NestJS Backend (Smart Cabinet CU - Monolith)
# ================================

# --------------------------------
# Stage 1: Dependencies
# --------------------------------
FROM node:20-alpine AS deps
LABEL stage=deps

WORKDIR /app

COPY package*.json ./
RUN npm install && npm cache clean --force

# --------------------------------
# Stage 2: Builder (Prisma generate + Nest build)
# --------------------------------
FROM node:20-alpine AS builder
LABEL stage=builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client (output: generated/prisma)
RUN npx prisma generate

# ฟอนต์ไทยสำหรับรายงาน PDF — ใส่ THSarabunNew.ttf และ THSarabunNew Bold.ttf ใน backend/fonts/ ก่อน build
RUN mkdir -p src/report/assets/fonts
COPY fonts/ src/report/assets/fonts/

# Build NestJS (output: dist/)
RUN npm run build

# --------------------------------
# Stage 3: Production Runner
# --------------------------------
FROM node:20-alpine AS production
LABEL stage=production

WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

ENV NODE_ENV=production
ENV PORT=4000

# Copy package files and install production deps only (npm install เพื่อไม่พึ่ง lock file ที่อาจไม่ sync)
COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force

# Copy built app and Prisma artifacts
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/generated ./generated
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma

# โลโก้สำหรับรายงาน PDF (3_logo_p-1-fit.png)
COPY --from=builder --chown=nestjs:nodejs /app/public ./public

# โฟลเดอร์สำหรับ multer upload (item.controller)
RUN mkdir -p /app/uploads && chown -R nestjs:nodejs /app/uploads

USER nestjs

EXPOSE 4000

# Health check - API health endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:4000/api/smart-cabinet-cu/v1/health || exit 1

CMD ["node", "dist/src/main.js"]
