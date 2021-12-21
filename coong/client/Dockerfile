FROM node:16

WORKDIR /usr/src/app

COPY ./ ./

RUN npm i -g pnpm
RUN pnpm install
RUN pnpm run build
RUN pnpm install --prod

EXPOSE 8080

CMD pnpm run start


