FROM node:16

WORKDIR /usr/src/app

COPY ./ ./

RUN npm i -g pnpm
RUN pnpm install --prod

EXPOSE 3000

CMD pnpm run start:ssr


