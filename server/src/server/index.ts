import {ApolloServer} from 'apollo-server'
import {ContextFunction} from 'apollo-server-core'
import {buildSchema} from 'type-graphql'
import {AuthChecker} from 'type-graphql/dist/interfaces'
import {NonEmptyArray} from 'type-graphql/dist/interfaces/NonEmptyArray'

export interface ServerStartOptions {
  port?: number
}

export interface ServerPrePareOptions {
  authChecker?: AuthChecker
  context?: ContextFunction
  playground?: boolean
  // eslint-disable-next-line @typescript-eslint/ban-types
  resolvers?: NonEmptyArray<Function> | NonEmptyArray<string>
}

export const prepare = async (options: ServerPrePareOptions = {}) => {
  const {
    resolvers,
    authChecker,
    context,
  } = options

  if (!resolvers) {
    return 'needs resolvers'
  }

  const schema = await buildSchema({
    authChecker,
    resolvers,
  })

  const server = new ApolloServer({
    context,
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
