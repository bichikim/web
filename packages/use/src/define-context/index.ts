import {inject, provide} from 'vue'
import {MaybeFunction, NotFunction, toValue} from '@winter-love/utils'

export const CONTEXT_KEY = Symbol('context-key')

export interface ProvideContext<T extends NotFunction> {
  (props?: MaybeFunction<T>): T
  [CONTEXT_KEY]?: string | symbol
}

export interface InjectContextOptions {
  consume?: boolean
  createIfEmpty?: boolean
}

export interface InjectContext<T> {
  (options?: InjectContextOptions): T
  [CONTEXT_KEY]?: string | symbol
}

export type DefineContextResult<T extends NotFunction> = [
  InjectContext<T>,
  ProvideContext<T>,
  string | symbol,
]

export const defineContext = <T extends NotFunction>(
  props?: MaybeFunction<T>,
  key?: string | symbol,
): DefineContextResult<T> => {
  const _props = props
  const _key = key ?? Symbol()

  const injectContext = Object.assign(
    (options: InjectContextOptions = {}): T => {
      const {createIfEmpty, consume} = options
      const context = inject(_key, () => (createIfEmpty ? toValue(_props) : null), true)
      if (consume) {
        provide(_key, null)
      }
      return context
    },
    {[CONTEXT_KEY]: _key},
  )

  const provideContext = Object.assign(
    (props?: MaybeFunction<T>): T => {
      const valueProps = props ? toValue(props) : undefined
      const context = valueProps ?? toValue(_props)
      provide(_key, context)
      return context
    },
    {[CONTEXT_KEY]: _key},
  )

  return [injectContext, provideContext, _key]
}

export const preferParentContext = <T extends NotFunction>(
  provide: ProvideContext<T>,
  _key?: string | symbol,
) => {
  const key = _key ?? provide[CONTEXT_KEY]

  if (!key) {
    throw new Error('No context key provided')
  }

  return (props?: T) => {
    const parentContext = inject(key, null)
    if (parentContext) {
      return parentContext
    }
    return provide(props)
  }
}
