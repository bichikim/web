import {PrismaClient} from '@prisma/client'
import {ApolloServer} from 'apollo-server'
import {Context} from 'apollo-server-core'
import {buildSchema} from 'type-graphql'
import {AuthChecker} from 'type-graphql/dist/interfaces'
import {NonEmptyArray} from 'type-graphql/dist/interfaces/NonEmptyArray'

const prisma = new PrismaClient()

export interface ServerStartOptions {
  port?: number
}

export interface ServerPrePareOptions {
  authChecker?: AuthChecker
  playground?: boolean
  // eslint-disable-next-line @typescript-eslint/ban-types
  resolvers?: NonEmptyArray<Function> | NonEmptyArray<string>
}

export const prepare = async (options: ServerPrePareOptions = {}) => {
  const {
    playground,
    resolvers,
    authChecker,
  } = options

  if (!resolvers) {
    throw new Error('require resolvers')
  }

  const schema = await buildSchema({
    authChecker,
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
