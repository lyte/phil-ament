# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build
RUN npm prune --omit=dev

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
LABEL org.opencontainers.image.title="Phil-ament" \
      org.opencontainers.image.description="Self-hosted filament inventory" \
      org.opencontainers.image.authors="futuristicvlad" \
      org.opencontainers.image.source="https://github.com/lyte/phil-ament" \
      org.opencontainers.image.licenses="MIT" \
      org.opencontainers.image.url="https://github.com/lyte/phil-ament"
COPY --from=build /app/build ./build
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/LICENSE ./LICENSE
COPY --from=build /app/src/lib/server/catalog/NOTICE ./src/lib/server/catalog/NOTICE
COPY --from=build /app/src/lib/server/catalog/catalog-data.json ./src/lib/server/catalog/catalog-data.json
RUN mkdir -p /data
EXPOSE 3000
VOLUME /data
HEALTHCHECK --interval=30s --timeout=5s --start-period=25s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "build/index.js"]
