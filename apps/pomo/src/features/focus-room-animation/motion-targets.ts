import type {PixiSceneMotion, PixiScenePoint} from './layer-scene-definition'

const ORIGIN = {x: 0, y: 0}

export const getMotionTarget = (motion: PixiSceneMotion, direction: 1 | -1) => {
  if (motion.kind !== 'translation') {
    return ORIGIN
  }

  if ('targets' in motion) {
    return motion.targets[0] ?? ORIGIN
  }

  return direction === 1 ? motion.distance : ORIGIN
}

export const getNextMotionTarget = (
  motion: PixiSceneMotion,
  currentTarget: PixiScenePoint,
  direction: 1 | -1,
  random: () => number,
) => {
  if (motion.kind !== 'translation' || !('targets' in motion)) {
    return getMotionTarget(motion, direction)
  }

  const candidates = motion.targets.filter(
    (target) => target.x !== currentTarget.x || target.y !== currentTarget.y,
  )
  const index = Math.min(candidates.length - 1, Math.floor(random() * candidates.length))

  return candidates[index]
}
