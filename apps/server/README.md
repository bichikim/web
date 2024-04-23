# Server

// under construction
https://back.coong.io

<!-- version flag a -->

## Hot to start (development)

use docker compose (*under construction) to set server environment

run dev scripts

## ENV
db url
```dotenv
DATABASE_URL=mongodb+srv://ser..
```

Setting jwt key
```dotenv
JWT_KEY=dev-jwt-key
```

## setting mongodb for development

run docker-compose:up

docker exec -it server-mongodb-1 bash

mongosh admin -u root -p foo-bar

use data

db.creatUser({user: "bichi", pwd: "foo-bar", roles: ["readWrite"]})

show users 

DATABASE_URL=mongodb://root:foo-bar@localhost:27017/data?authSource=admin

refer to https://haneenmahdin.medium.com/set-up-mongodb-prisma-with-docker-c8c2f28e85de

### Refer to

graphql N plus 1 problem

https://dev.to/lagoni/how-to-solve-the-n-plus-1-problem-in-graphql-with-prisma-and-apollo-5923