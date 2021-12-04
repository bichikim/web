FROM node:16

WORKDIR /usr/src/app

COPY ./coong/client ./

RUN ls -R
RUN npm install --production

EXPOSE 8080

CMD npm run start


