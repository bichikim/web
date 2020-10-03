import {Theme} from 'styled-system'
import {App} from 'vue'

export const themeSym = Symbol('theme')

interface createThemeReturnType {
  install(app: App): void
}

export const createTheme = <T extends Theme = Theme>(theme: T): createThemeReturnType => {
  return {
    install(app: App) {
      app.provide(themeSym, theme)
    },
  }
}

export default createTheme
