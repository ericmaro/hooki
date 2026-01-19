FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Install dependencies
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy application source
COPY . .

# Expose port and start application
EXPOSE 5004
CMD ["pnpm", "run", "dev", "--host"]
