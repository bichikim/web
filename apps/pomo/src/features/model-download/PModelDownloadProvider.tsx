import {createContext, type JSX, onCleanup, untrack, useContext} from 'solid-js'

import {
  createModelDownloadController,
  type ModelDownloadController,
  type ModelDownloadRuntime,
} from './controller'
import {createModelAssetManager, type ModelAssetManager} from './asset-manager'

export interface PModelDownloadProviderProps {
  readonly children: JSX.Element
  readonly runtime?: ModelDownloadRuntime
}

const ModelDownloadContext = createContext<ModelDownloadController>()
const ModelAssetContext = createContext<ModelAssetManager>()

export const PModelDownloadProvider = (props: PModelDownloadProviderProps) => {
  const runtime = untrack(() => props.runtime)
  const controller = createModelDownloadController(runtime)
  const assets = createModelAssetManager({controller})
  onCleanup(controller.dispose)

  return (
    <ModelDownloadContext.Provider value={controller}>
      <ModelAssetContext.Provider value={assets}>{props.children}</ModelAssetContext.Provider>
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

export const useModelAssetManager = () => {
  const context = useContext(ModelAssetContext)

  if (context === undefined) {
    throw new Error('useModelAssetManager must be used inside PModelDownloadProvider.')
  }

  return context
}
