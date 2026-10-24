import {createContext, useContext} from 'solid-js'

import type {DisplayThemeController} from './model'

export const DisplayThemeContext = createContext<DisplayThemeController>()

/** Reads the root-owned display theme controller. */
export const useDisplayTheme = (): DisplayThemeController => {
  const controller = useContext(DisplayThemeContext)

  if (controller === undefined) {
    throw new Error('DisplayThemeProvider is required')
  }

  return controller
}
