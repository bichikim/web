FROM node:14-slim

WORKDIR /usr/src/app

COPY ./server ./

RUN ls -R

EXPOSE 8080

CMD yarn run start


