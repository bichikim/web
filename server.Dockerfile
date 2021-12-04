FROM node:16

WORKDIR /usr/src/app

COPY ./coong/server ./

RUN ls -R
RUN pnpm install --prod --ignore-scripts

EXPOSE 8080

CMD pnpm run start


