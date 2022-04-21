import {inject, InjectionKey, provide, reactive} from 'vue'

export const createLayout = () => {
  return reactive({
    isMagicAuthLink: false,
    isOpenAuth: false,
  })
}

export type LayoutContext = ReturnType<typeof createLayout>

export const LAYOUT_KEY: InjectionKey<LayoutContext> = Symbol('layout-key')

export const useDefaultLayout = () => {
  return inject(LAYOUT_KEY, () => createLayout(), true)
}

export const provideDefaultLayout = () => {
  const context = createLayout()
  provide(LAYOUT_KEY, context)
  return context
}
