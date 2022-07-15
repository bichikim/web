FROM node:16 as dependencies

WORKDIR /usr/src/app

COPY ./ ./

RUN npm i -g pnpm
RUN pnpm install --prod

FROM node:16-alpine as runner

WORKDIR /usr/src/app

COPY ./ ./

RUN npm i -g pnpm
COPY --from=dependencies /usr/src/app/coong/client/node_modules ./coong/client/node_modules

EXPOSE 3000

CMD pnpm run start:ssr


