import {Context} from 'src/context'
import {createMethodDecorator, ResolverData} from 'type-graphql'

export type ForbiddenResolver<Context extends Record<string, any>> = (
  resolverData: ResolverData<Context>,
) => Promise<boolean> | boolean

export function Forbidden(resolver?: ForbiddenResolver<Context>): any {
  return createMethodDecorator<Context>((resolverData, next) => {
    if (!resolver) {
      // eslint-disable-next-line unicorn/error-message
      throw new Error('unauthorized')
    }

    if (resolver(resolverData)) {
      throw new Error('unauthorized')
    }

    return next()
  })
}
