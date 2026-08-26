import focusedHairTipsMaskImage from './assets/layers/day-writing-focused/hair-tips-mask.webp'
import dayUserHairTipsMaskImage from './assets/layers/day-reading-user/hair-tips-mask.webp'
import nightUserHairTipsMaskImage from './assets/layers/night-reading-user/hair-tips-mask.webp'
import type {PixiScenePushEffect} from './layer-scene-definition'
import type {PSceneId} from './scene-catalog'

export const HAIR_TIPS_PIXEL_PUSH = [
  {
    distance: {x: -4, y: 1.25},
    kind: 'masked-pixel-push',
    maskSource: focusedHairTipsMaskImage,
  },
] satisfies readonly PixiScenePushEffect[]

const DAY_USER_HAIR_TIPS_PIXEL_PUSH = [
  {
    distance: {x: -4, y: 1.25},
    kind: 'masked-pixel-push',
    maskSource: dayUserHairTipsMaskImage,
  },
] satisfies readonly PixiScenePushEffect[]

const NIGHT_USER_HAIR_TIPS_PIXEL_PUSH = [
  {
    distance: {x: -4, y: 1.25},
    kind: 'masked-pixel-push',
    maskSource: nightUserHairTipsMaskImage,
  },
] satisfies readonly PixiScenePushEffect[]

export const getHairTipsPixelPush = (sceneId: PSceneId): readonly PixiScenePushEffect[] => {
  if (sceneId.endsWith('-focused')) {
    return HAIR_TIPS_PIXEL_PUSH
  }

  if (sceneId.startsWith('day-')) {
    return DAY_USER_HAIR_TIPS_PIXEL_PUSH
  }

  return NIGHT_USER_HAIR_TIPS_PIXEL_PUSH
}
