import {defineContext, MaybeRef, resolveRef} from '@winter-love/use'
import {updateElementClasses} from '@winter-love/utils'
import {reactive, ref, ToRef, toRef} from 'vue'

export interface ThemeContext {
  theme: string
}
const [injectContext, provideContext, THEME_CONTEXT] = defineContext<ThemeContext>()

export {THEME_CONTEXT}

export const useTheme = (): ToRef<string> => {
  const theme = injectContext()

  return toRef(theme, 'theme')
}

export const provideTheme = (element: MaybeRef<HTMLElement | string>) => {
  const elementRef = resolveRef(element)
  const theme = ref()

  const context = reactive({theme})

  provideContext(context)

  watchEffect(
    () => {
      updateElementClasses(elementRef.value, [theme.value])
    },
    {flush: 'post'},
  )
  onScopeDispose(() => {
    updateElementClasses(elementRef.value)
  })

  return context
}
