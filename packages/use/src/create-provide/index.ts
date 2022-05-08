import {inject, InjectionKey, provide} from 'vue-demi'
import {freeze, MayFunction, toValue, UnFunction} from '@winter-love/utils'

export const createProvide = <T extends MayFunction<unknown>>(data: T, name?: string) => {

  const key: InjectionKey<UnFunction<T>> = Symbol(process.env.NODE_ENV === 'development' ? name : undefined)

  return freeze({
    inject: () => {
      return inject<UnFunction<T>>(key)
    },
    injectKey: key,
    provide: () => {
      const _data = toValue(data)
      return provide(key, _data)
    },
  })
}
