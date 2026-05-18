# Stage 1: Build the NestJS app
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
# clean install
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Run only the built files (smaller image)
FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
RUN mkdir -p /app/uploads
EXPOSE 3000
CMD ["node", "dist/main.js"]
