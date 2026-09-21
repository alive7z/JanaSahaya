FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY --chown=node:node . .

# Uploads live on the container filesystem (ephemeral on Render — see README).
RUN mkdir -p /app/uploads && chown -R node:node /app/uploads
USER node

# Render injects PORT; 4000 is only the local fallback.
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Schema + migrations + seed run at first boot; the server starts only after the DB is reachable.
CMD ["sh", "-c", "node src/db/setup.js && node server.js"]
