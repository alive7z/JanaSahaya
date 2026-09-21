FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 4000

# schema + migrations + seed run at first boot; server starts after DB is healthy.
CMD ["sh", "-c", "node src/db/setup.js && node server.js"]