FROM node:19 as dependencies

WORKDIR /usr/src/app

COPY ../client ./

RUN npm i -g pnpm
RUN pnpm install --prod

FROM node:19-alpine as runner

WORKDIR /usr/src/app

COPY ../client ./

RUN npm i -g pnpm
COPY --from=dependencies /usr/src/app/coong/client/node_modules ./coong/client/node_modules

EXPOSE 3000

CMD pnpm run start:ssr


