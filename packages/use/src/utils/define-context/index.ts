import {toValue} from '@winter-love/utils'
import {inject, provide} from 'vue'

export const CONTEXT_KEY = Symbol('context-key')

export interface ProvideContext<T> {
  [CONTEXT_KEY]?: string | symbol

  (props?: T): T | null | undefined
}

export interface InjectContextOptions {
  consume?: boolean
  createIfEmpty?: boolean
}

export interface InjectContext<T> {
  [CONTEXT_KEY]?: string | symbol

  (options?: InjectContextOptions): T | null | undefined
}

export type DefineContextResult<T> = [
  InjectContext<T>,
  ProvideContext<T>,
  string | symbol,
]

export function defineContext<T>(
  props?: () => T,
  key?: string | symbol,
): DefineContextResult<T>
export function defineContext<T>(props?: T, key?: string | symbol): DefineContextResult<T>
export function defineContext<T>(
  props?: T,
  key?: string | symbol,
): DefineContextResult<T> {
  const _props = props
  const _key = key ?? Symbol()

  const injectContext = Object.assign(
    (options: InjectContextOptions = {}): T | null | undefined => {
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
    (props?: T): T | null | undefined => {
      const valueProps = props ? toValue(props) : undefined
      const context = valueProps ?? toValue(_props)
      provide(_key, context)
      return context
    },
    {[CONTEXT_KEY]: _key},
  )

  return [injectContext, provideContext, _key]
}

export const preferParentContext = <T>(
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
