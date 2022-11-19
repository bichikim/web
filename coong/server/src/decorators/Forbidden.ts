import {Context} from 'src/context'
import {createMethodDecorator, ResolverData, UnauthorizedError} from 'type-graphql'

export type ForbiddenResolver<Context extends Record<string, any>> = (
  resolverData: ResolverData<Context>,
) => Promise<boolean> | boolean

export function Forbidden(resolver?: ForbiddenResolver<Context>): any {
  return createMethodDecorator<Context>((resolverData, next) => {
    if (!resolver) {
      throw new UnauthorizedError()
    }

    if (resolver(resolverData)) {
      throw new UnauthorizedError()
    }

    return next()
  })
}
