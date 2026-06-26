FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
COPY bot ./bot
RUN npm run bot:build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/bot/dist ./bot/dist
COPY --from=build /app/bot/.env.example ./bot/.env.example
CMD ["node", "bot/dist/index.js"]
