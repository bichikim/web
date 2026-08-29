import type {PixiLayerSceneDefinition} from './layer-scene-definition'
import {getLayerMotions, getMotionEffects} from './motion-definition'

export const getSceneMaskSources = (definition: PixiLayerSceneDefinition): readonly string[] => [
  ...new Set([
    ...definition.layers.flatMap((layer) => [
      ...(layer.maskSource === undefined ? [] : [layer.maskSource]),
      ...(layer.statePixelPush?.effect.kind === 'masked-pixel-push'
        ? [layer.statePixelPush.effect.maskSource]
        : []),
      ...getLayerMotions(layer).flatMap((motion) =>
        getMotionEffects(motion).flatMap((effect) =>
          effect.kind === 'masked-pixel-push' ? [effect.maskSource] : [],
        ),
      ),
    ]),
    ...(definition.effects ?? []).map((effect) => effect.maskSource),
  ]),
]
