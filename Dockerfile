# Stage 1: Builder
FROM node:22-alpine AS builder

RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY tsconfig.json ./
COPY prisma ./prisma
COPY src ./src

RUN npx prisma generate
RUN npm run build

# Stage 2: Runner
FROM node:22-alpine AS runner

ENV NODE_ENV=production

RUN apk add --no-cache openssl

WORKDIR /app

RUN addgroup -g 1001 -S nodejs && adduser -S expressjs -u 1001

COPY package*.json ./

RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client

USER expressjs

EXPOSE 5000

CMD ["node", "dist/server.js"]
