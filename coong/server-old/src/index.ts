/* eslint-disable @typescript-eslint/ban-types */
import 'reflect-metadata'
import {resolvers as prismaResolvers} from 'src/generated/type-graphql'
import {prepare, start} from 'src/server'
import {NonEmptyArray} from 'type-graphql'
import authChecker from './auth'
import context from './context'
import './prisma/enhance'
import resolvers from './resolvers'

const DEFAULT_PORT = 8080

const isPlayGround = process.env.NODE_ENV === 'development'
const emitSchemaFile = process.env.NODE_ENV === 'development' ? '.schema.gql' : false
const port = Number(process.env.PORT ?? DEFAULT_PORT)

const bootstrap = async () => {
  const result = await prepare({
    authChecker,
    context,
    emitSchemaFile,
    playground: isPlayGround,
    resolvers: [...prismaResolvers, ...resolvers] as NonEmptyArray<Function>,
  })

  if (typeof result === 'string') {
    return result
  }

  const {server} = result

  return start(server, {
    port,
  })
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
bootstrap().then((result) => {
  if (typeof result === 'string') {
    console.error(result)
    return
  }

  const {url} = result

  console.log(`Server is running, GraphQL Playground available at ${url}`)
})
