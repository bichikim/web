FROM node:16

WORKDIR /usr/src/app

COPY dist ./coong/client/dist
COPY package.json ./coong/client
COPY package.json ./
COPY ../../pnpm-lock.yaml ./
COPY ../../pnpm-workspace.yaml ./

RUN npm i -g pnpm
RUN pnpm install --prod

EXPOSE 3000

CMD pnpm run start:@coong/client:ssr


