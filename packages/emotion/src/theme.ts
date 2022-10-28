import {getCurrentInstance, inject, InjectionKey} from 'vue'

export interface Theme {
  [key: string]: any
}

export const EMOTION_THEME_CONTEXT: InjectionKey<Theme> = Symbol('emotion-theme')

export const useTheme = (theme: Theme = {}) => {
  const instance = getCurrentInstance()
  const props = instance?.props ?? {}

  if (props.theme) {
    return props.theme as Theme
  }

  return inject(EMOTION_THEME_CONTEXT, theme)
}
