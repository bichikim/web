import {inject, InjectionKey, provide, ref} from 'vue'

export const createLayout = () => {
  const showVideoBackground = ref(true)
  return {
    showVideoBackground,
  }
}

export type LayoutContext = ReturnType<typeof createLayout>

export const LAYOUT_KEY: InjectionKey<LayoutContext> = Symbol('layout-key')

export const useLayout = () => {
  return inject(LAYOUT_KEY, () => createLayout(), true)
}

export const provideLayout = () => {
  const context = createLayout()
  provide(LAYOUT_KEY, context)
  return context
}
