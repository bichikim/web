import {createMethodDecorator, ResolverData} from 'type-graphql'
import {defaultSelfDataGetter, SelfDataGetter} from './Forbidden'

export type Injection<Context extends Record<string, any>, Self> =
  (resolverData: ResolverData<Context>, self: Self) => unknown

export const Author = <Context extends Record<string, any>, Self>(
  injection: Injection<Context, Self>,
  selfDataGetter: SelfDataGetter<Self> = defaultSelfDataGetter,
) => {
  return createMethodDecorator<Context>((resolverData, next) => {
    injection(resolverData, selfDataGetter(resolverData))
    console.log(resolverData.args)
    return next()
  })
}

export default Author
