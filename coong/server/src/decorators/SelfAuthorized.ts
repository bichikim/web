import {createMethodDecorator, ResolverData, UnauthorizedError} from 'type-graphql'
import {isEqual} from 'lodash'
import {MayPromise} from '@winter-love/utils'

export type SelfIdGetter = (resolverData: ResolverData) =>
  MayPromise<Record<string, string> | undefined>

export const defaultSelfDataGetter = (resolverData: ResolverData<Record<string, any>>) => {
  const {context} = resolverData
  const {self, isSelf = false} = context.auth ?? {}
  if (!isSelf) {
    return
  }
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
  selfDataGetter?: (resolverData: ResolverData<Record<string, any>>) =>
    MayPromise<Record<string, string> | undefined>
}

export default function SelfAuthorized(selfIdGetter: SelfIdGetter, options: SelfAuthorizedOptions = {}): any {
  const {
    allowEmptyId = false,
    selfDataGetter = defaultSelfDataGetter,
  } = options
  return createMethodDecorator(async (resolverData, next) => {
    const idMatcher = await selfIdGetter(resolverData)
    const authIdData = await selfDataGetter(resolverData)

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

