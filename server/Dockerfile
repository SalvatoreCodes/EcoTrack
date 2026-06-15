# EcoTrack backend — portable container (Hugging Face Spaces / any Docker host).
# Build context = this server/ directory.
FROM node:20-alpine

WORKDIR /app

# Install deps first (layer cache)
COPY package.json package-lock.json* ./
RUN npm install --omit=dev

# App source
COPY . .

ENV NODE_ENV=production
# HF Spaces proxies to app_port 7860 (see README front-matter).
# Server reads process.env.PORT; default it to 7860 here.
ENV PORT=7860
EXPOSE 7860

CMD ["node", "index.mjs"]
