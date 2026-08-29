import {createContext, type JSX, onCleanup, untrack, useContext} from 'solid-js'

import {
  createModelDownloadController,
  type ModelDownloadController,
  type ModelDownloadRuntime,
} from './controller'

export interface PModelDownloadProviderProps {
  readonly children: JSX.Element
  readonly runtime?: ModelDownloadRuntime
}

const ModelDownloadContext = createContext<ModelDownloadController>()

export const PModelDownloadProvider = (props: PModelDownloadProviderProps) => {
  const runtime = untrack(() => props.runtime)
  const controller = createModelDownloadController(runtime)
  onCleanup(controller.dispose)

  return (
    <ModelDownloadContext.Provider value={controller}>
      {props.children}
    </ModelDownloadContext.Provider>
  )
}

export const useModelDownload = () => {
  const context = useContext(ModelDownloadContext)

  if (context === undefined) {
    throw new Error('useModelDownload must be used inside PModelDownloadProvider.')
  }

  return context
}
