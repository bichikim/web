import {inject, InjectionKey, provide, reactive, toRefs, ToRefs} from 'vue'

export const createLayout = () => {
  return reactive({
    isMagicAuthLink: false,
  })
}

export type LayoutContext = ReturnType<typeof createLayout>

export const LAYOUT_KEY: InjectionKey<ToRefs<LayoutContext>> = Symbol('layout-key')

export const useLayout = () => {
  return inject(LAYOUT_KEY, () => toRefs(createLayout()), true)
}

export const provideLayout = () => {
  const context = toRefs(createLayout())
  provide(LAYOUT_KEY, context)
  return context
}
