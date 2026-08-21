import type {PixiSceneLayerDefinition, PixiSceneMotion} from './layer-scene-definition'

export const getLayerMotions = (layer: PixiSceneLayerDefinition) => {
  if (layer.motion !== undefined) {
    return [layer.motion]
  }

  return layer.motions ?? []
}

export const getMotionEffects = (motion: PixiSceneMotion) => {
  switch (motion.kind) {
    case 'pivot-rotation':
      return motion.pixelPush ?? []
    case 'pixel-oscillation':
      return motion.effects
    case 'looping-translation':
    case 'opacity-pulse':
    case 'opacity-twinkle':
    case 'translation':
    case 'visibility-cycle':
      return []
    default: {
      const exhaustiveMotion: never = motion
      throw new Error(`Unsupported scene motion: ${String(exhaustiveMotion)}`)
    }
  }
}
