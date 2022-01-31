import {inject, InjectionKey, provide, reactive, ref} from 'vue'

export const createLayout = () => {
  return reactive({
    isMagicAuthLink: false,
    showVideoBackground: true,
  })
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
