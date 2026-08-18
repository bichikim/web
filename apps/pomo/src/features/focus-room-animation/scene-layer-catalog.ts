import {DAY_READING_FOCUSED_LAYER_SCENE} from './day-reading-focused-layer-scene'
import {DAY_WRITING_LAYER_SCENE} from './day-writing-layer-scene'
import {GENERATED_LAYER_SCENES} from './generated-layer-scenes'
import type {PixiLayerSceneDefinition} from './layer-scene'
import type {PSceneId} from './scene-catalog'

/** Resolves the render-only layer definition behind the canvas chunk boundary. */
export const getPSceneLayer = (sceneId: PSceneId): PixiLayerSceneDefinition => {
  switch (sceneId) {
    case 'day-reading-focused':
      return DAY_READING_FOCUSED_LAYER_SCENE
    case 'day-writing-focused':
      return DAY_WRITING_LAYER_SCENE
    default:
      return GENERATED_LAYER_SCENES[sceneId]
  }
}
