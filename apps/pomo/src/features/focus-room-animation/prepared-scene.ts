import type {Container, Texture} from 'pixi.js'

import type {PixiLayerScene} from './layer-scene'
import type {TextureLease} from './texture-leases'

export interface PreparedScene {
  readonly depthTexture: Texture
  readonly layerScene: PixiLayerScene | null
  readonly scene: Container
  readonly textures: readonly TextureLease[]
}
