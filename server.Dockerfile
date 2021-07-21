FROM node:14-slim

WORKDIR /usr/src/app

COPY ./server ./

RUN ls -R
RUN yarn install --production
RUN yarn run build

CMD yarn run start


