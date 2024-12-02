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
    emitSchemaFile,
    optionCache: env.optionCache,
    playground: isPlayGround,
    resolvers: [...prismaResolvers, ...resolvers],
  })
}
bootstrap()
  .then((result) => {
    return start(result, {context, port: env.port})
  })
  .then((result) => {
    console.info(`Server is running, GraphQL Playground available at ${result}`)
  })
