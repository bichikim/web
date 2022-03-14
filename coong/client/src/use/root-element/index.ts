import {defineComponent, getCurrentInstance, h, inject, InjectionKey, provide, Ref, ref, UnwrapRef} from 'vue'

export const STORE_KEY: InjectionKey<Ref> = Symbol('hydrate-store')

const restoreHydrate = () => {
  //
}

export const useWriteEl = () => {
  console.log('foo')
  const instance = getCurrentInstance()
  if (!instance) {
    return
  }
  instance.attrs.foo = 'foo'
  console.log(instance.attrs)
}

export const useHydrate = <T>(initValue?: T): Ref<UnwrapRef<T> | undefined> => {
  const valueRef = ref<T | undefined>(initValue)
  provide(STORE_KEY, valueRef)
  return valueRef
}

export const HydrateStore = defineComponent({
  setup() {
    const valueRef = inject(STORE_KEY, ref())
    return () => (
      h('data', {style: {display: 'none'}}, valueRef.value)
    )
  },
})
