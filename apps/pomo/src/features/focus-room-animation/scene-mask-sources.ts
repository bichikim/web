import type {PixiLayerSceneDefinition} from './layer-scene-definition'
import {getLayerMotions, getMotionEffects} from './motion-definition'

function* iterateSceneMaskSources(definition: PixiLayerSceneDefinition): Generator<string> {
  for (const layer of definition.layers) {
    if (layer.maskSource !== undefined) {
      yield layer.maskSource
    }

    const stateEffect = layer.statePixelPush?.effect
    if (stateEffect?.kind === 'masked-pixel-push') {
      yield stateEffect.maskSource
    }

    for (const motion of getLayerMotions(layer)) {
      for (const effect of getMotionEffects(motion)) {
        if (effect.kind === 'masked-pixel-push') {
          yield effect.maskSource
        }
      }
    }
  }

  for (const effect of definition.effects ?? []) {
    yield effect.maskSource
  }
}

export const getSceneMaskSources = (definition: PixiLayerSceneDefinition): readonly string[] => [
  ...new Set(iterateSceneMaskSources(definition)),
]
