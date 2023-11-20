FROM node:19

WORKDIR /usr/src/app

COPY ./ ./

RUN npm run build
RUN npm install --prod

EXPOSE 8080

CMD npm run start


