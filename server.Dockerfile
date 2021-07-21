FROM node:14

WORKDIR /usr/src/app

COPY ./server ./

RUN ls -R
RUN yarn install
RUN yarn run generate

EXPOSE 8080

CMD yarn run start


