import type {Container, Texture} from 'pixi.js'

import type {PixiLayerScene, PixiLayerSceneDefinition} from './layer-scene'
import type {TextureLease} from './texture-leases'

export interface PreparedScene {
  readonly depthTexture: Texture
  readonly layerScene: PixiLayerScene | null
  readonly scene: Container
  readonly snapshotSafe: boolean
  readonly textures: readonly TextureLease[]
}

export interface StartPreparedTransitionOptions {
  readonly depthSource: string
  readonly layerSceneId: string | null
  readonly prepared: PreparedScene
  readonly source: string
  readonly version: number
}

export const destroySceneTree = (scene: Container | null, layerScene: PixiLayerScene | null) => {
  if (layerScene === null) {
    scene?.destroy()
  } else {
    layerScene.destroy()
  }
}

export const isSceneSnapshotSafe = (definition: PixiLayerSceneDefinition | null) =>
  definition === null || definition.layers.every((layer) => layer.maskSource === undefined)
