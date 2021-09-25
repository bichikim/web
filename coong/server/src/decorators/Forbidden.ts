import {createMethodDecorator, ResolverData, UnauthorizedError} from 'type-graphql'

export type ForbiddenResolver<Context extends Record<string, any>> =
  (resolverData: ResolverData<Context>, self: unknown | undefined) => Promise<boolean> | boolean

export type ForbiddenSelfDataGetter<Self> = (resolverData: ResolverData) => Self

export const forbiddenDefaultSelfDataGetter = ({context}) => context.auth.self

export function Forbidden<Context extends Record<string, any>, Self>(
  resolver?: ForbiddenResolver<Context>,
  selfDataGetter: ForbiddenSelfDataGetter<Self> = forbiddenDefaultSelfDataGetter,
): any {
  return createMethodDecorator<Context>((resolverData, next) => {
    if (!resolver) {
      throw new UnauthorizedError()
    }

    if (resolver(resolverData, selfDataGetter(resolverData))) {
      throw new UnauthorizedError()
    }

    return next()
  })
}
