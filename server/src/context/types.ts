import {ExpressContext} from 'apollo-server-express'

export type ContextFunction<ReturnType extends Record<string, unknown>> = (expressContext: ExpressContext) =>
  Promise<ReturnType> | ReturnType
