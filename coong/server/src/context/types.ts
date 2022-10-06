import {ExpressContext} from 'apollo-server-express'

export type ContextFunction<ReturnType extends Record<string, any>> = (
  expressContext: ExpressContext,
) => Promise<ReturnType> | ReturnType
