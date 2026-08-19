# Multi-stage build. Both stages keep the pnpm WORKSPACE layout intact
# (pnpm-workspace.yaml + both apps' package.json at their real relative
# paths) rather than copying a single package.json into a flat /app —
# pnpm-lock.yaml is a workspace-wide lockfile with an `importers` entry per
# app, and --frozen-lockfile fails if the on-disk layout doesn't match it.
#
# The runtime stage does its OWN fresh `pnpm install --prod`, rather than
# copying node_modules from the build stage: pnpm's default node_modules is
# a tree of symlinks into a content-addressable store, which does not
# survive being copied into a different image layer. Installing again here,
# scoped to production deps only, is the correct — and standard — way to
# avoid that.

FROM node:22-alpine AS build
WORKDIR /workspace
RUN corepack enable

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN pnpm install --frozen-lockfile --filter api...

COPY apps/api apps/api
RUN pnpm --filter api build

FROM node:22-alpine AS runtime
WORKDIR /workspace
RUN corepack enable
ENV NODE_ENV=production

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN pnpm install --prod --frozen-lockfile --filter api... --ignore-scripts

COPY --from=build /workspace/apps/api/dist apps/api/dist
COPY --from=build /workspace/apps/api/db apps/api/db

# Runs as the image's built-in non-root `node` user rather than root —
# nothing in this service needs elevated privileges, and a compromised
# dependency shouldn't get more than it needs.
USER node

WORKDIR /workspace/apps/api
EXPOSE 3000
CMD ["node", "dist/main.js"]
