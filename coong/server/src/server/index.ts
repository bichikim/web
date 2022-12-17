import {ClassFunction} from '@winter-love/utils'
import {ApolloServer, ContextFunction} from '@apollo/server'
import {ExpressContextFunctionArgument, expressMiddleware} from '@apollo/server/express4'
import express, {Express} from 'express'
import {GraphQLSchema} from 'graphql'
import {json} from 'body-parser'
import http, {Server} from 'http'
import cors from 'cors'
import {AuthChecker, buildSchema, NonEmptyArray, PrintSchemaOptions} from 'type-graphql'

const DEFAULT_POST = 8080

export interface EmitSchemaFileOptions extends Partial<PrintSchemaOptions> {
  path?: string
}

export interface ServerStartOptions {
  context?: ContextFunction<[ExpressContextFunctionArgument]>
  port?: number
}

export interface ServerPrePareOptions<Context, Role = any> {
  authChecker?: AuthChecker<Context, Role>
  emitSchemaFile?: string | boolean | EmitSchemaFileOptions
  optionCache?: boolean
  playground?: boolean
  resolvers?: NonEmptyArray<ClassFunction> | NonEmptyArray<string>
}

export interface PrepareResult {
  app: Express
  httpServer: Server
  schema: GraphQLSchema
  server: ApolloServer
}

export const prepare = async <Context, Role>(
  options: ServerPrePareOptions<Context, Role> = {},
): Promise<PrepareResult> => {
  const app = express()
  const httpServer = http.createServer(app)
  const {resolvers, authChecker, emitSchemaFile, optionCache} = options

  if (!resolvers) {
    throw new Error('needs resolvers')
  }

  const schema = await buildSchema({
    authChecker,
    emitSchemaFile,
    resolvers,
  })

  const server = new ApolloServer({
    cache: 'bounded',
    csrfPrevention: true,
    // plugins: [
    //   //
    //   ApolloServerPluginDrainHttpServer({httpServer}),
    //   ApolloServerPluginLandingPageLocalDefault({embed: true}),
    // ],
    schema,
  })
  app.use(
    cors({
      maxAge: 86_400,
      preflightContinue: true,
    }),
  )
  app.use(json())

  if (optionCache) {
    app.use((req, res, next) => {
      if (req.method === 'OPTIONS') {
        res.setHeader('Cache-Control', 'public, max-age=86400')
        // No Vary required: cors sets it already set automatically
        res.end()
      } else {
        next()
      }
    })
  }

  app.get('/', (req, res) => {
    res.send('Welcome to my graphql api')
  })

  return {
    app,
    httpServer,
    schema,
    server,
  }
}

export const start = async (
  serverResult: PrepareResult,
  options: ServerStartOptions = {},
): Promise<string> => {
  const {port, context} = options
  const {httpServer, server, app} = serverResult
  await server.start()
  app.use('/graphql', expressMiddleware(server, {context}))
  return new Promise<string>((resolve) => {
    httpServer.listen({port: port ?? DEFAULT_POST}, () => {
      resolve(`http://localhost:${port}`)
    })
  })
}
