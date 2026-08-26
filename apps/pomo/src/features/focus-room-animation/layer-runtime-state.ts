import type {Container, Filter} from 'pixi.js'

import type {OpacityTwinkleState} from './opacity-twinkle'
import type {PushFilter} from './push-filter-factory'
import type {
  PixiSceneLayerDefinition,
  PixiSceneMotion,
  PixiScenePoint,
} from './layer-scene-definition'

export interface MotionState {
  currentTarget: PixiScenePoint
  direction: 1 | -1
  elapsedSeconds: number
  nextTarget: PixiScenePoint
  travelSeconds: number
  twinkleState?: OpacityTwinkleState
}

export interface MotionInstance {
  readonly definition: PixiSceneMotion
  enabled: boolean
  readonly pixelPushFilters: readonly PushFilter[]
  readonly state: MotionState
}

export interface LayerInstance {
  readonly container: Container
  readonly definition: PixiSceneLayerDefinition
  readonly layerMaskFilter: Filter | null
  readonly motions: readonly MotionInstance[]
  readonly sprite: Container
  readonly statePixelPushFilter: PushFilter | null
}
