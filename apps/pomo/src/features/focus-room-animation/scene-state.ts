import type {PActivity, PGaze, PTime} from './eye-animation-controller'
import type {PixiLayerSceneDefinition} from './layer-scene'
import type {PSceneMotionInput, PSceneMotionMode} from './scene-motion'

export interface PSceneState {
  readonly activity: PActivity
  readonly depthSource: string
  readonly gaze: PGaze
  readonly layerScene: PixiLayerSceneDefinition | null
  readonly motionInput?: PSceneMotionInput
  readonly motionMode?: PSceneMotionMode
  readonly source: string
  readonly time: PTime
}

export interface PSceneRendererOptions {
  readonly onLoadingChange?: (isLoading: boolean) => void
  readonly onMotionInputChange?: (motionInput: PSceneMotionInput) => void
}
