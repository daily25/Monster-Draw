FROM node:20-slim AS build

WORKDIR /app

# Copy package files
COPY package.json ./
COPY shared/package.json shared/
COPY client/package.json client/
COPY server/package.json server/

# Install all dependencies
RUN npm install

# Copy source
COPY shared/ shared/
COPY client/ client/
COPY server/ server/

# Build shared types, then client and server
RUN npm run build

# Production stage
FROM node:20-slim

WORKDIR /app

COPY --from=build /app/package.json ./
COPY --from=build /app/shared/package.json shared/
COPY --from=build /app/server/package.json server/
COPY --from=build /app/client/package.json client/

# Install production deps only
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/shared/dist shared/dist
COPY --from=build /app/server/dist server/dist
COPY --from=build /app/client/dist client/dist

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["node", "server/dist/index.js"]
