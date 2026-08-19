# Same workspace-layout reasoning as apps/api/Dockerfile — see the comment
# there. This image only needs a production build output, so there is no
# runtime `pnpm install` stage: the compiled static files are copied
# straight into nginx, which has no Node.js dependency at all.

FROM node:22-alpine AS build
WORKDIR /workspace
RUN corepack enable

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN pnpm install --frozen-lockfile --filter web...

COPY apps/web apps/web
RUN pnpm --filter web build

FROM nginx:1.27-alpine AS runtime
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/apps/web/dist/web/browser /usr/share/nginx/html

EXPOSE 80
