
FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
COPY docs ./docs

RUN npm run build

RUN mkdir -p dist/database/migrations && cp -R src/database/migrations/. dist/database/migrations/

FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

EXPOSE 3000

# Start sequence: create DB -> migrate -> seed admin -> start API
CMD ["sh", "-c", "node dist/database/create-db.js \
 && node dist/database/migrate/migrate.js \
 && node dist/database/seed-admin.js \
 && node dist/index.js"]
