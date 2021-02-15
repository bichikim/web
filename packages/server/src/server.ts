import express from 'express'
import {graphqlHTTP} from 'express-graphql'
import {buildSchema} from 'graphql'
import expressPlayground from 'graphql-playground-middleware-express'

export interface CreateGraphqlHandlerOptions {
  /**
   * @default false
   */
  graphiql?: boolean,
}

export const createGraphqlHandler = (options: CreateGraphqlHandlerOptions) => {
  const {graphiql = false} = options

  const schema = buildSchema(`
  type Query {
    hello: String
  }
`)

  // the root provides a resolver function for each API endpoint
  const rootValue = {
    hello: () => {
      return 'Hello world!'
    },
  }

  return graphqlHTTP({
    schema,
    rootValue,
    graphiql,
  })
}

export type PlaygroundOption = boolean | string

export const readPlaygroundOption = (playground?: PlaygroundOption) => {
  if (playground === true) {
    return '/'
  }

  if (typeof playground === 'string') {
    return playground
  }
}

export interface CreateServerOptions extends CreateGraphqlHandlerOptions {
  endpoint?: string
  playground?: PlaygroundOption
}

export const createServer = (options: CreateServerOptions = {}) => {
  const {endpoint = '/graphql', playground, ...rest} = options
  const graphqlHandler = createGraphqlHandler(rest)
  const app = express()

  app.use(endpoint, graphqlHandler)

  const _playground = readPlaygroundOption(playground)

  if (_playground) {
    app.use(_playground, expressPlayground({endpoint}))
  }

  const start = (port: number = 4000) => {
    return app.listen(port)
  }

  return {
    start,
  }
}
