# The staging image: the built app with its full dependencies, so the same image also runs
# the migrations (drizzle-kit) and the demo seed (tsx). See docker-compose.prod.yml.
FROM node:22-slim

ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
RUN chown node:node /app
USER node

COPY --chown=node:node package.json package-lock.json ./
RUN npm ci

COPY --chown=node:node . .
RUN npm run build

ENV NODE_ENV=production PORT=3000
EXPOSE 3000
# Migrations run on every start; they're a no-op when the database is current.
CMD ["sh", "-c", "npx drizzle-kit migrate && exec npx next start"]
