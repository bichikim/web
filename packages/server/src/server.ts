import {buildSchema, NonEmptyArray} from 'type-graphql'
import {ApolloServer} from 'apollo-server'
import {AnyFunction} from '@winter-love/utils'
import path from 'path'

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
    schema,
    playground,
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
