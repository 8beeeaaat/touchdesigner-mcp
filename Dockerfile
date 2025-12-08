FROM node:24-slim AS base

WORKDIR /app

# Install Java runtime (required for OpenAPI Generator)
RUN apt-get update && \
  apt-get install -y --no-install-recommends default-jre-headless && \
  apt-get clean && \
  rm -rf /var/lib/apt/lists/*

# Install dependencies separately for better Docker cache reuse
FROM base AS deps
COPY package*.json ./
RUN npm ci

# Build stage
FROM deps AS build
COPY . .
RUN npm run build
RUN chmod +x docker/start.sh

# Development stage with watch mode
FROM deps AS dev
COPY . .
RUN chmod +x docker/start.sh
ENV NODE_ENV=development
CMD ["npm", "run", "dev:docker"]

# Runtime image
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app ./
CMD ["./docker/start.sh"]
