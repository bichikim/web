import {
  computed,
  getCurrentInstance,
  inject,
  InjectionKey,
  Plugin,
  provide,
  reactive,
  ref,
  UnwrapNestedRefs,
  UnwrapRef,
} from 'vue'
import {Data} from './types'
import {patchSafeString} from './patch-safe-string'
import {stringifyJson} from '@winter-love/utils'

const LUGGAGE_KEY: InjectionKey<UnwrapNestedRefs<Data>> = Symbol('luggage')

export const serializer = (data: Data) => {
  return patchSafeString(stringifyJson(data))
}

export type Serializer = typeof serializer

export const renderLuggageToString = (data: Data, _serializer: Serializer = serializer) => {
  return `
    <script>
      window.__LUGGAGE__ = "${_serializer(data)}"
    </script>
  `
}

export const createPlugin = (data: Data) => {
  const luggage = reactive(data)
  const plugin: Plugin = (app) => {
    app.provide(LUGGAGE_KEY, luggage)
  }
  return {
    luggage,
    plugin,
  }
}

export const provideLuggage = (data: Data = {}) => {
  return provide(LUGGAGE_KEY, reactive(data))
}

export const luggageRef = <T>(name: string, value?: T) => {
  const luggage = inject(LUGGAGE_KEY)
  const instance = getCurrentInstance()
  const uid = instance?.uid
  const valueRef = ref<T | undefined>(value)

  const packLuggage = (value: UnwrapRef<T | undefined>) => {
    // tree shacking
    if (import.meta.env.SSR) {
      // eslint-disable-next-line unicorn/no-lonely-if
      if (luggage && typeof uid === 'number') {
        luggage[uid] = value
      }
    }
  }

  if (luggage && typeof uid === 'number') {
    if (import.meta.env.SSR) {
      packLuggage(valueRef.value)
    } else {
      valueRef.value = luggage[uid] as UnwrapRef<T>
    }
  }

  return computed<UnwrapRef<T | undefined>>({
    get() {
      return valueRef.value
    },
    set(value) {
      valueRef.value = value
      packLuggage(value)
    },
  })
}
