FROM node:24-slim AS build

WORKDIR /app

# Install Java runtime (required for OpenAPI Generator)
RUN apt-get update && \
  apt-get install -y --no-install-recommends default-jre-headless && \
  apt-get clean && \
  rm -rf /var/lib/apt/lists/*

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code and build the application
COPY . .
RUN npm run build

# Prepare startup helper for stdio/http selection
RUN chmod +x docker/start.sh

CMD ["./docker/start.sh"]
