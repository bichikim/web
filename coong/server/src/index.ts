import 'reflect-metadata'
import {prepare, start} from 'src/server'
import {Authorized} from 'type-graphql'
import {applyResolversEnhanceMap, resolvers as prismaResolvers, ResolversEnhanceMap} from 'src/generated/type-graphql'
import resolvers from './resolvers'
import authChecker from './auth'
import context from './context'

const DEFAULT_PORT = 8080

/**
 * @see https://github.com/MichalLytek/typegraphql-prisma
 */
const resolversEnhanceMap: ResolversEnhanceMap = {
  User: {
    user: [Authorized(['privateUser:read'])],
    findFirstUser: [Authorized(['privateUser:read'])],
    users: [Authorized(['privateUser:read'])],
    createUser: [Authorized(['privateUser:create'])],
    createManyUser: [Authorized(['privateUser:create'])],
    deleteUser: [Authorized(['privateUser:delete'])],
    updateUser: [Authorized(['privateUser:update'])],
    deleteManyUser: [Authorized(['privateUser:delete'])],
    updateManyUser: [Authorized(['privateUser:update'])],
    upsertUser: [Authorized(['privateUser:update', 'privateUser:create'])],
    aggregateUser: [Authorized(['privateUser:read'])],
    groupByUser: [Authorized(['privateUser:read'])],
  },
}

applyResolversEnhanceMap(resolversEnhanceMap)

const bootstrap = async () => {
  const result = await prepare({
    authChecker,
    context,
    playground: process.env.NODE_ENV === 'development',
    resolvers: [...prismaResolvers, ...resolvers],
  })

  if (typeof result === 'string') {
    return result
  }

  const {server} = result

  return start(server, {
    port: Number(process.env.PORT ?? DEFAULT_PORT),
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
