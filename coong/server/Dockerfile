FROM node:17

WORKDIR /usr/src/app

COPY ./ ./

RUN npm i -g pnpm
RUN npm install
RUN npm run build

EXPOSE 8080

CMD npm run start


