import {inject, InjectionKey, provide, Ref, ref, watchEffect} from 'vue'

const DEFAULT_THEME_NAME = 'light-theme'

export const ThemeNameKeySymbol = Symbol('theme-name-key')

export const ThemeNameKey: InjectionKey<Ref<string>> = ThemeNameKeySymbol

export const provideThemeName = (defaultThemeName: string = DEFAULT_THEME_NAME) => {
  const themeName = ref(defaultThemeName)

  provide(ThemeNameKey, themeName)

  return themeName
}

export const useThemeName = () => {
  return inject(ThemeNameKey, () => ref(DEFAULT_THEME_NAME), true)
}

export const useTheme = (defaultThemeName: string = DEFAULT_THEME_NAME) => {
  const themeName = provideThemeName(defaultThemeName)

  watchEffect((onCleanup) => {
    document.body.classList.add(themeName.value)
    onCleanup(() => {
      document.body.classList.remove(themeName.value)
    })
  })

  return themeName
}
