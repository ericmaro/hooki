FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Install dependencies
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy application source
COPY . .

RUN pnpm run build

# Expose port and start application
EXPOSE 5004

ENV PORT=5004

CMD ["node", "dist/server/index.mjs"]
