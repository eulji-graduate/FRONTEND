# syntax=docker/dockerfile:1

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* 는 클라이언트 번들에 박히므로 빌드 시점에 주입해야 한다.
ARG NEXT_PUBLIC_KAKAO_MAP_KEY
ARG NEXT_PUBLIC_USE_MOCK=false
ENV NEXT_PUBLIC_KAKAO_MAP_KEY=$NEXT_PUBLIC_KAKAO_MAP_KEY
ENV NEXT_PUBLIC_USE_MOCK=$NEXT_PUBLIC_USE_MOCK

RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV TZ=Asia/Seoul

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# ⚠️ standalone 빌드는 서버 코드만 담는다 — public/(favicon·정적 이미지 등)은
#    Next.js가 번들에 안 넣어서 여기서 따로 복사해야 한다(공식 문서 명시 사항).
#    빠지면 존재하지 않는 게 아니라 전부 404로 죽는다(#663 — og-landing.png 재현).
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# BACKEND_API_URL 등 서버 전용 런타임 값은 여기서 굽지 않는다 — `docker run --env-file`로 주입한다.
CMD ["node", "server.js"]
