# ── Stage 1: Build ──────────────────────────────────────
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci --legacy-peer-deps

COPY . .

# Build args become VITE_ env vars at build time.
#
# CRITICAL: each ARG must be re-exposed as ENV. Docker `ARG` only sets a
# build-time shell variable accessible to RUN as `$VAR_NAME` — it does NOT
# propagate to process.env of child commands. Vite reads process.env at
# build time (via dotenv), so without the ENV step `import.meta.env.VITE_X`
# resolves to undefined and the runtime bundle falls back to the localhost
# defaults defined in src/config/constants.ts — silently breaking chat WS,
# API calls and notifications in every deployed environment.
ARG VITE_API_URL
ARG VITE_WS_URL
ARG VITE_NOTIFICATION_WS_URL
ARG VITE_GOOGLE_CLIENT_ID
ARG VITE_USER_SERVICE_URL
ARG VITE_COLLAB_EDITOR_URL

ENV CI=true \
    VITE_API_URL=$VITE_API_URL \
    VITE_WS_URL=$VITE_WS_URL \
    VITE_NOTIFICATION_WS_URL=$VITE_NOTIFICATION_WS_URL \
    VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID \
    VITE_USER_SERVICE_URL=$VITE_USER_SERVICE_URL \
    VITE_COLLAB_EDITOR_URL=$VITE_COLLAB_EDITOR_URL

RUN npm run build

# ── Stage 2: Serve with nginx ──────────────────────────
FROM nginx:1.27-alpine

# Remove default config
RUN rm /etc/nginx/conf.d/default.conf

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
