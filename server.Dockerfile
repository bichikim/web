FROM node:14-slim

WORKDIR /usr/src/app

COPY ./server ./

RUN yarn install --production

CMD yarn run start


