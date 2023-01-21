import {defineContext, MaybeRef, mutRef, resolveRef} from '@winter-love/use'
import {updateElementClasses} from '@winter-love/utils'
import {onScopeDispose, reactive, toRef, ToRef, watchEffect} from 'vue'

export interface ThemeContext {
  theme: string
}

const [injectContext, provideContext, THEME_CONTEXT] = defineContext<ThemeContext>()

export {THEME_CONTEXT}

export const useTheme = (): ToRef<string> => {
  const theme = injectContext()

  return toRef(theme, 'theme')
}

export const provideTheme = (
  element: MaybeRef<HTMLElement | string> = 'body',
  themeName: MaybeRef<string> = 'light-theme',
) => {
  const elementRef = resolveRef(element)
  const theme = mutRef(resolveRef(themeName))

  const context = reactive({theme})

  provideContext(context)

  watchEffect(
    () => {
      updateElementClasses(elementRef.value, theme.value)
    },
    {flush: 'post'},
  )

  onScopeDispose(() => {
    updateElementClasses(elementRef.value)
  })

  return context
}
