import {ApolloServer} from 'apollo-server'
import {ContextFunction} from 'apollo-server-core'
import {buildSchema, PrintSchemaOptions} from 'type-graphql'
import {AuthChecker} from 'type-graphql/dist/interfaces'
import {NonEmptyArray} from 'type-graphql/dist/interfaces/NonEmptyArray'

export interface EmitSchemaFileOptions extends Partial<PrintSchemaOptions> {
  path?: string
}

export interface ServerStartOptions {
  port?: number
}

export interface ServerPrePareOptions<Context> {
  authChecker?: AuthChecker<Context>
  context?: ContextFunction
  emitSchemaFile?: string | boolean | EmitSchemaFileOptions
  playground?: boolean
  // eslint-disable-next-line @typescript-eslint/ban-types
  resolvers?: NonEmptyArray<Function> | NonEmptyArray<string>
}

export const prepare = async <Context>(options: ServerPrePareOptions<Context> = {}) => {
  const {
    resolvers,
    authChecker,
    context,
    emitSchemaFile,
  } = options

  if (!resolvers) {
    return 'needs resolvers'
  }

  const schema = await buildSchema({
    authChecker,
    emitSchemaFile,
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
