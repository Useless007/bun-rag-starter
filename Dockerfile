# Use the official Bun image as a base
FROM oven/bun:1

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json, bun.lock, and tsconfig.json to the working directory
COPY package.json bun.lock tsconfig.json ./

# Install dependencies
RUN bun install

# Copy the rest of the application code
COPY . .

# The command to run the application
CMD ["bun", "run", "deepseek-example.ts"]
