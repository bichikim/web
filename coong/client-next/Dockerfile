FROM node:16

WORKDIR /usr/src/app

COPY dist ./dist
COPY package.json ./

RUN yarn install --prod

EXPOSE 3000

CMD yarn run start:ssr


