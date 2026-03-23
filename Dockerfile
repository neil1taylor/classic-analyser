FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
RUN apk add --no-cache python3
WORKDIR /app
COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/server/dist ./server/dist
COPY --from=builder --chown=node:node /app/src/services/migration/data ./src/services/migration/data
COPY --from=builder --chown=node:node /app/scripts/mdl-to-json.py ./scripts/mdl-to-json.py
COPY --from=builder --chown=node:node /app/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
RUN chown -R node:node /app
EXPOSE 8080
USER node
ENV NODE_ENV=production
CMD ["node", "server/dist/index.js"]
