FROM node:16

WORKDIR /usr/src/app

COPY ./ ./

RUN yarn install --prod

EXPOSE 3000

CMD pnpm run start:ssr


