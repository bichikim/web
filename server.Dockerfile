FROM node:14

WORKDIR /usr/src/app

COPY ./coong/server ./

RUN ls -R
RUN yarn install
RUN yarn run generate
RUN yarn install --production

EXPOSE 8080

CMD yarn run start


