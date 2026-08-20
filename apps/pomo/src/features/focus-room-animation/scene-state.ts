import type {PActivity, PGaze, PTime} from './eye-animation-controller'
import type {PViseme} from '../lip-sync'
import type {PixiLayerSceneDefinition} from './layer-scene'
import type {PSceneMotionInput, PSceneMotionMode} from './scene-motion'
import type {PSceneStyle} from './scene-style'

export interface PSceneState {
  readonly activity: PActivity
  readonly depthSource: string
  readonly gaze: PGaze
  readonly layerScene: PixiLayerSceneDefinition | null
  readonly motionInput?: PSceneMotionInput
  readonly motionMode?: PSceneMotionMode
  readonly sceneStyle?: PSceneStyle
  readonly source: string
  readonly time: PTime
  readonly viseme: PViseme
}

export interface PSceneRendererOptions {
  readonly onLoadingChange?: (isLoading: boolean) => void
  readonly onMotionInputChange?: (motionInput: PSceneMotionInput) => void
}
