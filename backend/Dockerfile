# Use the official Bun image as a base
FROM oven/bun:1

# Set the working directory in the container
WORKDIR /usr/src/app

# Install system dependencies for sharp/libvips and Node.js for npm
RUN apt-get update && apt-get install -y \
    libvips-dev \
    python3 \
    build-essential \
    curl \
    git \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Copy package.json, bun.lock, and tsconfig.json to the working directory
COPY package.json bun.lock tsconfig.json ./

# Install dependencies
RUN bun install

# Remove pre-built sharp and rebuild from source for the container's glibc
RUN rm -rf node_modules/@xenova/transformers/node_modules/sharp && \
    cd node_modules/@xenova/transformers && \
    npm install --build-from-source sharp

# Copy the rest of the application code (but preserve the rebuilt sharp)
COPY --chown=bun:bun . .

# Final rebuild to ensure sharp matches runtime environment
RUN cd node_modules/@xenova/transformers && \
    npm rebuild sharp

# The command to run the application
CMD ["bun", "run", "deepseek-example.ts"]
