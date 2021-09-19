import {createMethodDecorator, ResolverData, UnauthorizedError} from 'type-graphql'

export type ForbiddenResolver =
  (resolverData: ResolverData) => Promise<boolean> | boolean

export default function Forbidden(resolver?: ForbiddenResolver): any {
  return createMethodDecorator((resolverData, next) => {
    if (!resolver) {
      throw new UnauthorizedError()
    }

    if (!resolver(resolverData)) {
      throw new UnauthorizedError()
    }

    return next()
  })
}
