import {createEffect, type JSX, onCleanup} from 'solid-js'
import {interfaceLanguage} from '../features/localization'

interface HInterfaceLanguageProps {
  readonly children?: JSX.Element
}

export const HInterfaceLanguage = (props: HInterfaceLanguageProps) => {
  createEffect(() => {
    let active = true
    let unsubscribe: (() => void) | null = null
    interfaceLanguage
      .start()
      .then((dispose) => {
        if (active) {
          unsubscribe = dispose
        } else {
          dispose()
        }
      })
      .catch((cause: unknown) => console.error('Could not initialize interface language', cause))
    onCleanup(() => {
      active = false
      unsubscribe?.()
    })
  })
  createEffect(() => {
    document.documentElement.lang = interfaceLanguage.language()
  })
  return <>{props.children}</>
}
