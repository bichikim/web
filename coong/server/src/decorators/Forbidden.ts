import {createMethodDecorator, ResolverData, UnauthorizedError} from 'type-graphql'

export type ForbiddenResolver<Context extends Record<string, any>> =
  (resolverData: ResolverData<Context>, self: unknown | undefined) => Promise<boolean> | boolean

export type SelfDataGetter<Self> = (resolverData: ResolverData) => Self

export const defaultSelfDataGetter = ({context}) => context.auth.self

export default function Forbidden<Context extends Record<string, any>, Self>(
  resolver?: ForbiddenResolver<Context>,
  selfDataGetter: SelfDataGetter<Self> = defaultSelfDataGetter,
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
