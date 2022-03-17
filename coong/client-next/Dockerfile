FROM node:16

WORKDIR /usr/src/app

COPY dist ./dist
COPY package.json ./

RUN npm install --prod

EXPOSE 3000

CMD npm run start:ssr


