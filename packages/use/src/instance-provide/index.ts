import {ComponentPublicInstance, DirectiveBinding, InjectionKey} from 'vue'

export const useInstanceProvide = <T>(
  key: string | symbol | InjectionKey<T>,
  instance?: ComponentPublicInstance | null,
  defaultValue?: T,
) => {
  if (!instance) {
    return
  }

  const internalInstance: any = instance?.$

  const {provides} = internalInstance

  return provides?.[key as any] ?? defaultValue
}

export const useDirectiveProvide = <T>(
  key: string | symbol | InjectionKey<T>,
  binding: DirectiveBinding,
  defaultValue?: T,
) => {
  return useInstanceProvide(key, binding.instance, defaultValue)
}
