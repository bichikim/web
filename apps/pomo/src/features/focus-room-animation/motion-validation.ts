import {getMotionEffects} from './motion-definition'
import type {PixiSceneMotion, PixiScenePixelPush, PixiScenePoint} from './layer-scene-definition'

interface SceneSize {
  readonly height: number
  readonly width: number
}

const MAXIMUM_FADE_EDGE_FRACTION = 0.5
const MAXIMUM_FLASH_CHANCE = 0.5

const isValidPixelPush = (effect: PixiScenePixelPush, scene: SceneSize) => {
  const {region} = effect

  return (
    region.width > 0 &&
    region.height > 0 &&
    effect.featherPixels >= 0 &&
    region.x >= 0 &&
    region.y >= 0 &&
    region.x + region.width <= scene.width &&
    region.y + region.height <= scene.height
  )
}

const hasDistinctPoints = (points: readonly PixiScenePoint[]) =>
  points.length >= 2 && new Set(points.map(({x, y}) => `${x}:${y}`)).size >= 2

export const validateSceneMotion = (layerId: string, motion: PixiSceneMotion, scene: SceneSize) => {
  validateTravel(layerId, motion)
  validateTranslation(layerId, motion)
  validateLoopingTranslation(layerId, motion)
  validateOpacityPulse(layerId, motion)
  validateOpacityTwinkle(layerId, motion)
  validateVisibilityCycle(layerId, motion)
  validateEffects(layerId, motion, scene)
}

export const validateSceneMotions = (
  layerId: string,
  motions: readonly PixiSceneMotion[],
  scene: SceneSize,
) => {
  const opacityMotionCount = motions.filter(affectsSpriteOpacity).length

  if (opacityMotionCount > 1) {
    throw new Error(`Layer cannot define multiple opacity motions: ${layerId}`)
  }

  for (const motion of motions) {
    validateSceneMotion(layerId, motion, scene)
  }
}

const affectsSpriteOpacity = (motion: PixiSceneMotion) =>
  motion.kind === 'opacity-pulse' ||
  motion.kind === 'opacity-twinkle' ||
  (motion.kind === 'looping-translation' && motion.fade !== undefined)

const validateTravel = (layerId: string, motion: PixiSceneMotion) => {
  const {travel} = motion

  if (travel.minimumSeconds <= 0 || travel.maximumSeconds < travel.minimumSeconds) {
    throw new Error(`Invalid motion travel range for layer: ${layerId}`)
  }
}

const validateTranslation = (layerId: string, motion: PixiSceneMotion) => {
  const transitionSeconds =
    motion.kind === 'translation' || motion.kind === 'opacity-pulse'
      ? motion.transitionSeconds
      : undefined

  if (
    transitionSeconds !== undefined &&
    (transitionSeconds <= 0 || transitionSeconds > motion.travel.minimumSeconds)
  ) {
    throw new Error(`Invalid motion transition for layer: ${layerId}`)
  }

  if (motion.kind === 'translation' && 'targets' in motion && !hasDistinctPoints(motion.targets)) {
    throw new Error(`Translation targets must contain distinct positions: ${layerId}`)
  }
}

const validateLoopingTranslation = (layerId: string, motion: PixiSceneMotion) => {
  if (
    motion.kind === 'looping-translation' &&
    motion.from.x === motion.to.x &&
    motion.from.y === motion.to.y
  ) {
    throw new Error(`Looping translation requires distinct positions: ${layerId}`)
  }

  if (
    motion.kind === 'looping-translation' &&
    motion.phase !== undefined &&
    (motion.phase < 0 || motion.phase >= 1)
  ) {
    throw new Error(`Looping translation phase must be in [0, 1): ${layerId}`)
  }

  if (
    motion.kind === 'looping-translation' &&
    motion.fade !== undefined &&
    (motion.fade.edgeFraction <= 0 ||
      motion.fade.edgeFraction > MAXIMUM_FADE_EDGE_FRACTION ||
      motion.fade.minimumOpacity < 0 ||
      motion.fade.minimumOpacity > 1)
  ) {
    throw new Error(`Invalid looping translation fade: ${layerId}`)
  }
}

const validateOpacityPulse = (layerId: string, motion: PixiSceneMotion) => {
  if (motion.kind !== 'opacity-pulse') {
    return
  }

  if (
    motion.minimumOpacity < 0 ||
    motion.maximumOpacity > 1 ||
    motion.minimumOpacity >= motion.maximumOpacity
  ) {
    throw new Error(`Invalid opacity pulse range for layer: ${layerId}`)
  }

  if (motion.phase !== undefined && (motion.phase < 0 || motion.phase >= 1)) {
    throw new Error(`Opacity pulse phase must be in [0, 1): ${layerId}`)
  }
}

const validateOpacityTwinkle = (layerId: string, motion: PixiSceneMotion) => {
  if (motion.kind !== 'opacity-twinkle') {
    return
  }

  if (
    motion.minimumOpacity < 0 ||
    motion.maximumOpacity > 1 ||
    motion.minimumOpacity >= motion.maximumOpacity ||
    motion.flashChance <= 0 ||
    motion.flashChance >= MAXIMUM_FLASH_CHANCE ||
    motion.rise.minimumSeconds <= 0 ||
    motion.rise.maximumSeconds < motion.rise.minimumSeconds ||
    motion.fall.minimumSeconds <= 0 ||
    motion.fall.maximumSeconds < motion.fall.minimumSeconds ||
    motion.flashRise.minimumSeconds <= 0 ||
    motion.flashRise.maximumSeconds < motion.flashRise.minimumSeconds ||
    motion.flashHold.minimumSeconds <= 0 ||
    motion.flashHold.maximumSeconds < motion.flashHold.minimumSeconds ||
    motion.flashFall.minimumSeconds <= 0 ||
    motion.flashFall.maximumSeconds < motion.flashFall.minimumSeconds
  ) {
    throw new Error(`Invalid opacity twinkle configuration for layer: ${layerId}`)
  }
}

const validateVisibilityCycle = (layerId: string, motion: PixiSceneMotion) => {
  if (motion.kind !== 'visibility-cycle') {
    return
  }

  if (motion.visibleFraction <= 0 || motion.visibleFraction > 1) {
    throw new Error(`Visibility cycle fraction must be in (0, 1]: ${layerId}`)
  }

  if (motion.phase !== undefined && (motion.phase < 0 || motion.phase >= 1)) {
    throw new Error(`Visibility cycle phase must be in [0, 1): ${layerId}`)
  }
}

const validateEffects = (layerId: string, motion: PixiSceneMotion, scene: SceneSize) => {
  if (motion.kind === 'pixel-oscillation' && motion.effects.length === 0) {
    throw new Error(`Pixel oscillation requires an effect: ${layerId}`)
  }

  for (const effect of getMotionEffects(motion)) {
    if (effect.kind === 'pixel-push' && !isValidPixelPush(effect, scene)) {
      throw new Error(`Invalid pixel-push region for layer: ${layerId}`)
    }
  }
}
