import {createMethodDecorator, ResolverData, UnauthorizedError} from 'type-graphql'
import {isEqual} from 'lodash'

export type PromiseOrNot<T> = Promise<T> | T

export type SelfIdGetter = (resolverData: ResolverData) =>
  PromiseOrNot<Record<string, string> | undefined>

export const defaultFromAuthDataGetter = (resolverData: ResolverData<Record<string, any>>) => {
  const {context} = resolverData
  const {self} = context.auth ?? {}
  return self ? {...self} : self
}

export interface SelfAuthorizedOptions {
  /**
   * @default false
   */
  allowEmptyId?: boolean
  /**
   * @default
   * @param context
   */
  fromAuthDataGetter?: (resolverData: ResolverData<Record<string, any>>) =>
    PromiseOrNot<Record<string, string> | undefined>
}

export default function SelfAuthorized(selfIdGetter: SelfIdGetter, options: SelfAuthorizedOptions = {}): any {
  const {
    allowEmptyId = false,
    fromAuthDataGetter = defaultFromAuthDataGetter,
  } = options
  return createMethodDecorator(async (resolverData, next) => {
    const idMatcher = await selfIdGetter(resolverData)
    const authIdData = await fromAuthDataGetter(resolverData)

    if (!authIdData) {
      return next()
    }

    if (allowEmptyId && !idMatcher) {
      return next()
    }

    if (!idMatcher) {
      throw new UnauthorizedError()
    }

    if (isEqual(authIdData, idMatcher)) {
      return next()
    }

    throw new UnauthorizedError()
  })
}
