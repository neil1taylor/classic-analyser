FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/src/services/migration/data ./src/services/migration/data
COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
EXPOSE 8080
USER node
ENV NODE_ENV=production
CMD ["node", "server/dist/index.js"]
