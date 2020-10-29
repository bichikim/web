import {Theme} from 'styled-system'
import {App, inject, Plugin} from 'vue'

export const themeSym = Symbol('theme')

export const useTheme = (): Theme => {
  return inject(themeSym, {})
}

export const createTheme = <T extends Theme = Theme>(theme: T): Plugin => {
  return {
    install(app: App) {
      app.provide(themeSym, theme)
    },
  }
}

export default createTheme
