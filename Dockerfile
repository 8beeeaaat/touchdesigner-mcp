FROM node:24-slim AS build

WORKDIR /app

ARG TD_WEB_SERVER_URL=${TD_WEB_SERVER_URL}

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

# Expose stdio for MCP communication
CMD ["node", "dist/index.js", "--stdio"]
