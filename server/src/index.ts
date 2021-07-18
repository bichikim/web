import 'reflect-metadata'
import {prepare, start} from 'src/server'
import {Authorized} from 'type-graphql'
import {applyResolversEnhanceMap, resolvers as prismaResolvers, ResolversEnhanceMap} from 'src/generated/type-graphql'
import resolvers from './resolvers'
import authChecker from './auth'

const DEFAULT_PORT = 58162

/**
 * @see https://github.com/MichalLytek/typegraphql-prisma
 */
const resolversEnhanceMap: ResolversEnhanceMap = {
  User: {
    updateUser: [Authorized()],
  },
}

applyResolversEnhanceMap(resolversEnhanceMap)

const bootstrap = async () => {
  const {server} = await prepare({
    authChecker,
    playground: process.env.NODE_ENV === 'development',
    resolvers: [...prismaResolvers, ...resolvers],
  })
  return start(server, {
    port: Number(process.env.PORT ?? DEFAULT_PORT),
  })
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
bootstrap().then(({url}) => {
  console.log(`Server is running, GraphQL Playground available at ${url}`)
})
