import {Authorized, buildSchema, NonEmptyArray} from 'type-graphql'
import {ApolloServer} from 'apollo-server'
import {Context} from 'apollo-server-core'
import {AnyFunction} from '@winter-love/utils'
import path from 'path'
import {PrismaClient} from '@prisma/client'
import {applyResolversEnhanceMap, ResolversEnhanceMap} from '@generated/type-graphql'

/**
 * @see https://github.com/MichalLytek/typegraphql-prisma
 */
const resolversEnhanceMap: ResolversEnhanceMap = {
  User: {
    updateUser: [Authorized()],
  },
}

applyResolversEnhanceMap(resolversEnhanceMap)

const prisma = new PrismaClient()

export interface ServerStartOptions {
  port?: number
}

export interface ServerPrePareOptions {
  playground?: boolean
  resolvers?: NonEmptyArray<string> | NonEmptyArray<AnyFunction>
}

export const prepare = async (options: ServerPrePareOptions = {}) => {
  const {
    playground,
    resolvers = [path.join(__dirname, 'resolvers/**/*.resolver.{ts,js}')],
  } = options
  const schema = await buildSchema({
    resolvers,
  })

  const server = new ApolloServer({
    context: (): Context => ({prisma}),
    playground,
    schema,
  })

  return {
    schema,
    server,
  }
}

export const start = (server: ApolloServer, options: ServerStartOptions = {}) => {
  const {
    port,
  } = options

  return server.listen(port)
}
