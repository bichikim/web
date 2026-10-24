import {createContext} from 'solid-js'
import type {ModelDownloadController} from './controller'
import type {ModelAssetManager} from './asset-manager'

export const ModelDownloadContext = createContext<ModelDownloadController>()
export const ModelAssetContext = createContext<ModelAssetManager>()
