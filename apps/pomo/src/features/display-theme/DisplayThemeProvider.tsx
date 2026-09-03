import type {JSX} from 'solid-js'

import {DisplayThemeContext} from './context'
import {useDisplayThemeController} from './use-display-theme'

export interface DisplayThemeProviderProps {
  readonly children?: JSX.Element
}

export const DisplayThemeProvider = (props: DisplayThemeProviderProps) => {
  const controller = useDisplayThemeController()

  return (
    <DisplayThemeContext.Provider value={controller}>{props.children}</DisplayThemeContext.Provider>
  )
}
