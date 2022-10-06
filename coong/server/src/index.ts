/* eslint-disable @typescript-eslint/ban-types */
import 'reflect-metadata'
import {resolvers as prismaResolvers} from 'src/prisma'
import {prepare, start} from 'src/server'
import authChecker from './auth'
import context from './context'
import './prisma/enhance'
import resolvers from './resolvers'
import {env} from './env'

const isPlayGround = env.nodeEnv === 'development'
const emitSchemaFile = env.nodeEnv === 'development' ? 'schema.graphql' : false

const bootstrap = async () => {
  return prepare({
    authChecker,
    context,
    emitSchemaFile,
    optionCache: env.optionCache,
    playground: isPlayGround,
    resolvers: [...prismaResolvers, ...resolvers],
  })
}
// eslint-disable-next-line @typescript-eslint/no-floating-promises
bootstrap()
  .then((result) => {
    return start(result, {port: env.port})
  })
  .then((result) => {
    console.log(`Server is running, GraphQL Playground available at ${result}`)
  })
  .catch((error) => {
    console.error(error)
  })
