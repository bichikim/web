FROM node:14-slim

WORKDIR /usr/src/app

COPY ./server ./

RUN ls -R
RUN yarn install --production
RUN yarn run generate

EXPOSE 8080

CMD yarn run start


