# EcoTrack backend — portable container (Koyeb / any Docker host).
# Build context = this server/ directory.
FROM node:20-alpine

WORKDIR /app

# Install deps first (layer cache)
COPY package.json package-lock.json* ./
RUN npm install --omit=dev

# App source
COPY . .

ENV NODE_ENV=production
# Host injects PORT (Koyeb -> 8000). Server reads process.env.PORT.
EXPOSE 8000

CMD ["node", "index.mjs"]
