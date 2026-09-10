# Keystone Admin UI container (Railway / Render / Fly).
#
# The Admin UI is a generated Next.js pages-router app that Keystone runs behind
# Express via a Next custom server, so it cannot be deployed to Vercel. The
# public marketing site deploys separately to Vercel from this same repo and
# talks to the same database.
FROM node:22-slim

RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./

# --ignore-scripts: `postinstall` runs `keystone postinstall`, which needs
# keystone.ts and keystone/** — not copied in yet at this layer.
RUN npm ci --ignore-scripts

COPY . .

# Builds .keystone/admin (a full Next build — allow a few minutes and >=2GB RAM)
RUN npx keystone build
RUN npx prisma generate

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Migrations are applied here, on the long-lived process — never from Vercel.
CMD ["sh", "-c", "npx prisma migrate deploy && npx keystone start"]
