import {createEffect, onCleanup, untrack} from 'solid-js'
import type {ViewerPort} from './types'
import {useViewerSettings} from './use-viewer-settings'
import {LocaleContext} from './locale/context'
import {SViewerWorkspace} from './SViewerWorkspace'

interface SCodeViewerProps {
  readonly port: ViewerPort
}
export const SCodeViewer = (props: SCodeViewerProps) => {
  const port = untrack(() => props.port)
  const settings = useViewerSettings({environment: globalThis, port})
  const root = document.documentElement
  const previous = root.lang
  createEffect(() => {
    root.lang = settings.language()
  })
  onCleanup(() => {
    root.lang = previous
  })
  return (
    <LocaleContext.Provider value={settings.language}>
      <SViewerWorkspace port={port} settings={settings} />
    </LocaleContext.Provider>
  )
}
