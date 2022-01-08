import {createMethodDecorator, ResolverData, UnauthorizedError} from 'type-graphql'
import {isMatch} from 'lodash'
import {MayPromise} from '@winter-love/utils'

export interface SelfData {
  data?: Record<string, string>
  isSelf
}

export type SelfAuthorizedSelfIdGetter<Context> = (resolverData: ResolverData<Context>) =>
  MayPromise<Record<string, any> | Array<Record<string, any>> | undefined>

const defaultSelfDataGetter = (resolverData: ResolverData<Record<string, any>>): SelfData => {
  const {context} = resolverData
  const {self, isSelf = false} = context.auth ?? {}
  return {
    data: self ? {...self} : self,
    isSelf,
  }
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
    MayPromise<SelfData>
}

export function SelfAuthorized<Context>(
  selfIdGetter: SelfAuthorizedSelfIdGetter<Context>,
  options: SelfAuthorizedOptions = {},
): any {
  const {
    allowEmptyId = false,
    selfDataGetter = defaultSelfDataGetter,
  } = options
  return createMethodDecorator<Context>(async (resolverData, next) => {
    const idMatcher = await selfIdGetter(resolverData)
    const {isSelf, data: authIdData} = await selfDataGetter(resolverData)

    if (!isSelf) {
      return next()
    }

    if (!authIdData) {
      return new UnauthorizedError()
    }

    if (allowEmptyId && !idMatcher) {
      return next()
    }

    if (!idMatcher) {
      throw new UnauthorizedError()
    }

    if (Array.isArray(idMatcher)) {
      const result = idMatcher.every((matcher) => {
        return isMatch(authIdData, matcher)
      })
      if (result) {
        return next()
      }
      throw new UnauthorizedError()
    }

    if (isMatch(authIdData, idMatcher)) {
      return next()
    }

    throw new UnauthorizedError()
  })
}

