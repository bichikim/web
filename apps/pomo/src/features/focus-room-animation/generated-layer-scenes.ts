import type {PSceneId} from './scene-catalog'
import type {PixiLayerSceneDefinition, PixiScenePoint} from './layer-scene'
import {createEyeMotion} from './eye-motion'
import {NIGHT_READING_FAINT_STAR_LAYERS} from './night-reading-faint-star-layers'
import {type PositionedLayerSource, positionNightReadingLayer} from './night-reading-layer-position'
import {NIGHT_READING_STAR_LAYERS} from './night-reading-star-layers'
import {FOCUS_ROOM_PREVIEW_CHANNELS} from './scene-catalog-channels'

import dayReadingUserBase from './assets/layers/day-reading-user/base.webp'
import dayReadingUserEyeIrises from './assets/layers/day-reading-user/eyes.webp'
import dayReadingUserHead from './assets/layers/day-reading-user/head.webp'
import dayReadingUserLeftHand from './assets/layers/day-reading-user/left-hand.webp'
import dayReadingUserRightHand from './assets/layers/day-reading-user/right-hand.webp'
import dayReadingUserReference from './assets/concept-art/day-reading-user-gaze.webp'
import dayTypingFocusedBase from './assets/layers/day-typing-focused/base.webp'
import dayTypingFocusedHead from './assets/layers/day-typing-focused/head.webp'
import dayTypingFocusedLeftHand from './assets/layers/day-typing-focused/left-hand.webp'
import dayTypingFocusedRightHand from './assets/layers/day-typing-focused/right-hand.webp'
import dayTypingFocusedReference from './assets/concept-art/day-typing.webp'
import dayFocusedEyeIrises from './assets/layers/day-reading-focused/eyes.webp'
import dayTypingUserBase from './assets/layers/day-typing-user/base.webp'
import dayTypingUserHead from './assets/layers/day-typing-user/head.webp'
import dayTypingUserLeftHand from './assets/layers/day-typing-user/left-hand.webp'
import dayTypingUserRightHand from './assets/layers/day-typing-user/right-hand.webp'
import dayTypingUserReference from './assets/concept-art/day-typing-user-gaze.webp'
import dayWritingUserBase from './assets/layers/day-writing-user/base.webp'
import dayWritingUserHead from './assets/layers/day-writing-user/head.webp'
import dayWritingUserLeftHand from './assets/layers/day-writing-user/left-hand.webp'
import dayWritingUserRightHand from './assets/layers/day-writing-user/right-hand.webp'
import dayWritingUserReference from './assets/concept-art/day-writing-user-gaze.webp'
import nightReadingFocusedBase from './assets/layers/night-reading-focused/background.webp'
import buildingLights01 from './assets/layers/night-reading-focused/building-lights/01.webp'
import buildingLights02 from './assets/layers/night-reading-focused/building-lights/02.webp'
import buildingLights03 from './assets/layers/night-reading-focused/building-lights/03.webp'
import buildingLights04 from './assets/layers/night-reading-focused/building-lights/04.webp'
import buildingLights05 from './assets/layers/night-reading-focused/building-lights/05.webp'
import buildingLights06 from './assets/layers/night-reading-focused/building-lights/06.webp'
import buildingLights07 from './assets/layers/night-reading-focused/building-lights/07.webp'
import nightReadingFocusedEyeIrises from './assets/layers/night-reading-focused/eyes.webp'
import nightReadingFocusedHead from './assets/layers/night-reading-focused/head.webp'
import nightReadingFocusedLeftHand from './assets/layers/night-reading-focused/left-hand.webp'
import nightReadingFocusedRightHand from './assets/layers/night-reading-focused/right-hand.webp'
import nightReadingFocusedReference from './assets/concept-art/night-reading.webp'
import nightReadingUserBase from './assets/layers/night-reading-user/base.webp'
import nightReadingUserEyeIrises from './assets/layers/night-reading-user/eyes.webp'
import nightReadingUserHead from './assets/layers/night-reading-user/head.webp'
import nightReadingUserLeftHand from './assets/layers/night-reading-user/left-hand.webp'
import nightReadingUserRightHand from './assets/layers/night-reading-user/right-hand.webp'
import nightReadingUserReference from './assets/concept-art/night-reading-user-gaze.webp'
import nightTypingFocusedBase from './assets/layers/night-typing-focused/base.webp'
import nightTypingFocusedHead from './assets/layers/night-typing-focused/head.webp'
import nightTypingFocusedLeftHand from './assets/layers/night-typing-focused/left-hand.webp'
import nightTypingFocusedRightHand from './assets/layers/night-typing-focused/right-hand.webp'
import nightTypingFocusedReference from './assets/concept-art/night-typing.webp'
import nightTypingUserBase from './assets/layers/night-typing-user/base.webp'
import nightTypingUserHead from './assets/layers/night-typing-user/head.webp'
import nightTypingUserLeftHand from './assets/layers/night-typing-user/left-hand.webp'
import nightTypingUserRightHand from './assets/layers/night-typing-user/right-hand.webp'
import nightTypingUserReference from './assets/concept-art/night-typing-user-gaze.webp'
import nightWritingFocusedBase from './assets/layers/night-writing-focused/base.webp'
import nightWritingFocusedHead from './assets/layers/night-writing-focused/head.webp'
import nightWritingFocusedLeftHand from './assets/layers/night-writing-focused/left-hand.webp'
import nightWritingFocusedRightHand from './assets/layers/night-writing-focused/right-hand.webp'
import nightWritingFocusedReference from './assets/concept-art/night-writing.webp'
import nightWritingUserBase from './assets/layers/night-writing-user/base.webp'
import nightWritingUserHead from './assets/layers/night-writing-user/head.webp'
import nightWritingUserLeftHand from './assets/layers/night-writing-user/left-hand.webp'
import nightWritingUserRightHand from './assets/layers/night-writing-user/right-hand.webp'
import nightWritingUserReference from './assets/concept-art/night-writing-user-gaze.webp'

interface SeparatedSceneAssets {
  readonly base: string
  readonly buildingLayers?: readonly PositionedLayerSource[]
  readonly faintStarLayers?: readonly PositionedLayerSource[]
  readonly head: string
  readonly leftHand: string
  readonly reference: string
  readonly rightHand: string
  readonly starLayers?: readonly PositionedLayerSource[]
}

interface SeparatedScenePivots {
  readonly head: PixiScenePoint
  readonly leftHand: PixiScenePoint
  readonly rightHand: PixiScenePoint
}

interface SeparatedSceneEyeLayer {
  readonly motion: ReturnType<typeof createEyeMotion>
  readonly source: string
}
const NIGHT_TYPING_FOCUSED_EYE_ORIGIN_X = -5
const NIGHT_WRITING_FOCUSED_EYE_ORIGIN_X = -4
const NIGHT_BUILDING_LAYERS = [
  positionNightReadingLayer('building-lights-01', buildingLights01),
  positionNightReadingLayer('building-lights-02', buildingLights02),
  positionNightReadingLayer('building-lights-03', buildingLights03),
  positionNightReadingLayer('building-lights-04', buildingLights04),
  positionNightReadingLayer('building-lights-05', buildingLights05),
  positionNightReadingLayer('building-lights-06', buildingLights06),
  positionNightReadingLayer('building-lights-07', buildingLights07),
] as const

const createTranslationEyeLayer = (
  originX = 0,
  source = dayReadingUserEyeIrises,
): SeparatedSceneEyeLayer => ({
  motion: createEyeMotion(originX),
  source,
})

const createSeparatedScene = (
  id: PSceneId,
  assets: SeparatedSceneAssets,
  pivots: SeparatedScenePivots,
  eyeLayer?: SeparatedSceneEyeLayer,
): PixiLayerSceneDefinition => ({
  background: '#17130f',
  height: 941,
  id: `${id}-layers`,
  layers: [
    {id: 'background', source: assets.base},
    ...(assets.starLayers ?? []).map(({position, source}, index) => ({
      id: `sky-star-${index + 1}`,
      motion: {
        fall: {maximumSeconds: 0.6, minimumSeconds: 0.25},
        flashChance: 0.06,
        flashFall: {maximumSeconds: 0.32, minimumSeconds: 0.12},
        flashHold: {maximumSeconds: 0.12, minimumSeconds: 0.04},
        flashRise: {maximumSeconds: 0.14, minimumSeconds: 0.05},
        kind: 'opacity-twinkle' as const,
        maximumOpacity: 1,
        minimumOpacity: 0,
        rise: {maximumSeconds: 0.25, minimumSeconds: 0.1},
        travel: {maximumSeconds: 6, minimumSeconds: 1.5},
      },
      position,
      source,
    })),
    ...(assets.faintStarLayers ?? []).map(({position, source}, index, layers) => ({
      id: `sky-faint-star-${index + 1}`,
      motion: {
        kind: 'opacity-pulse' as const,
        maximumOpacity: 1,
        minimumOpacity: 0,
        phase: (index + 1) / (layers.length + 1),
        transitionSeconds: 1.6,
        travel: {maximumSeconds: 12, minimumSeconds: 3},
      },
      position,
      source,
    })),
    ...(assets.buildingLayers === undefined
      ? []
      : assets.buildingLayers.map(({position, source}, index) => ({
          id: `building-lights-${index + 1}`,
          motion: {
            kind: 'opacity-pulse' as const,
            maximumOpacity: 1,
            minimumOpacity: 0,
            transitionSeconds: 1,
            travel: {maximumSeconds: 12, minimumSeconds: 2},
          },
          position,
          source,
        }))),
    {
      attachmentId: 'eyes',
      channel: FOCUS_ROOM_PREVIEW_CHANNELS.head,
      id: 'head',
      motion: {
        center: pivots.head,
        degrees: 0.5,
        kind: 'pivot-rotation',
        travel: {maximumSeconds: 2.4, minimumSeconds: 1.5},
      },
      source: assets.head,
    },
    ...(eyeLayer === undefined
      ? []
      : [
          {
            channel: FOCUS_ROOM_PREVIEW_CHANNELS.eyes,
            id: 'eye-irises',
            motion: eyeLayer.motion,
            parentAttachmentId: 'eyes',
            source: eyeLayer.source,
          },
        ]),
    {
      channel: FOCUS_ROOM_PREVIEW_CHANNELS.hands,
      id: 'left-hand',
      motion: {
        center: pivots.leftHand,
        degrees: -0.55,
        kind: 'pivot-rotation',
        travel: {maximumSeconds: 1.5, minimumSeconds: 0.9},
      },
      source: assets.leftHand,
    },
    {
      channel: FOCUS_ROOM_PREVIEW_CHANNELS.hands,
      id: 'right-hand',
      motion: {
        center: pivots.rightHand,
        degrees: 0.55,
        kind: 'pivot-rotation',
        travel: {maximumSeconds: 1.5, minimumSeconds: 0.9},
      },
      source: assets.rightHand,
    },
    {
      channel: FOCUS_ROOM_PREVIEW_CHANNELS.reference,
      id: 'reference',
      source: assets.reference,
      visible: false,
    },
  ],
  width: 1672,
})

// AI_NOTE - Each scene owns its pivots so a future asset replacement cannot silently shift another scene.
export const GENERATED_LAYER_SCENES = {
  'day-reading-user': createSeparatedScene(
    'day-reading-user',
    {
      base: dayReadingUserBase,
      head: dayReadingUserHead,
      leftHand: dayReadingUserLeftHand,
      reference: dayReadingUserReference,
      rightHand: dayReadingUserRightHand,
    },
    {head: {x: 1050, y: 425}, leftHand: {x: 735, y: 710}, rightHand: {x: 1060, y: 730}},
    createTranslationEyeLayer(),
  ),
  'day-typing-focused': createSeparatedScene(
    'day-typing-focused',
    {
      base: dayTypingFocusedBase,
      head: dayTypingFocusedHead,
      leftHand: dayTypingFocusedLeftHand,
      reference: dayTypingFocusedReference,
      rightHand: dayTypingFocusedRightHand,
    },
    {head: {x: 1045, y: 430}, leftHand: {x: 760, y: 710}, rightHand: {x: 1015, y: 725}},
    {
      motion: {
        kind: 'translation',
        targets: [
          {x: -1, y: 0},
          {x: -1.45, y: 0},
          {x: -0.55, y: 0},
          {x: -1, y: -0.225},
          {x: -1, y: 0.225},
          {x: -1.32, y: -0.16},
          {x: -0.68, y: -0.16},
          {x: -1.32, y: 0.16},
          {x: -0.68, y: 0.16},
          {x: -1.9, y: 0},
          {x: -0.1, y: 0},
          {x: -1, y: -0.45},
          {x: -1, y: 0.45},
          {x: -1.64, y: -0.32},
          {x: -0.36, y: -0.32},
          {x: -1.64, y: 0.32},
          {x: -0.36, y: 0.32},
          {x: -2.5, y: 0},
          {x: 0.5, y: 0},
          {x: -1, y: -0.75},
          {x: -1, y: 0.75},
          {x: -2.06, y: -0.53},
          {x: 0.06, y: -0.53},
          {x: -2.06, y: 0.53},
          {x: 0.06, y: 0.53},
        ],
        transitionSeconds: 0.04,
        travel: {maximumSeconds: 3.2, minimumSeconds: 1.4},
      },
      source: dayFocusedEyeIrises,
    },
  ),
  'day-typing-user': createSeparatedScene(
    'day-typing-user',
    {
      base: dayTypingUserBase,
      head: dayTypingUserHead,
      leftHand: dayTypingUserLeftHand,
      reference: dayTypingUserReference,
      rightHand: dayTypingUserRightHand,
    },
    {head: {x: 1045, y: 430}, leftHand: {x: 755, y: 710}, rightHand: {x: 1015, y: 725}},
    createTranslationEyeLayer(),
  ),
  'day-writing-user': createSeparatedScene(
    'day-writing-user',
    {
      base: dayWritingUserBase,
      head: dayWritingUserHead,
      leftHand: dayWritingUserLeftHand,
      reference: dayWritingUserReference,
      rightHand: dayWritingUserRightHand,
    },
    {head: {x: 1050, y: 425}, leftHand: {x: 700, y: 690}, rightHand: {x: 1030, y: 715}},
    createTranslationEyeLayer(),
  ),
  'night-reading-focused': createSeparatedScene(
    'night-reading-focused',
    {
      base: nightReadingFocusedBase,
      buildingLayers: NIGHT_BUILDING_LAYERS,
      faintStarLayers: NIGHT_READING_FAINT_STAR_LAYERS,
      head: nightReadingFocusedHead,
      leftHand: nightReadingFocusedLeftHand,
      reference: nightReadingFocusedReference,
      rightHand: nightReadingFocusedRightHand,
      starLayers: NIGHT_READING_STAR_LAYERS,
    },
    {head: {x: 1050, y: 425}, leftHand: {x: 735, y: 710}, rightHand: {x: 1060, y: 730}},
    {
      motion: {
        kind: 'translation',
        targets: [
          {x: 0, y: 0},
          {x: -0.45, y: 0},
          {x: 0.45, y: 0},
          {x: 0, y: -0.225},
          {x: 0, y: 0.225},
          {x: -0.32, y: -0.16},
          {x: 0.32, y: -0.16},
          {x: -0.32, y: 0.16},
          {x: 0.32, y: 0.16},
          {x: -0.9, y: 0},
          {x: 0.9, y: 0},
          {x: 0, y: -0.45},
          {x: 0, y: 0.45},
          {x: -0.64, y: -0.32},
          {x: 0.64, y: -0.32},
          {x: -0.64, y: 0.32},
          {x: 0.64, y: 0.32},
          {x: -1.5, y: 0},
          {x: 1.5, y: 0},
          {x: 0, y: -0.75},
          {x: 0, y: 0.75},
          {x: -1.06, y: -0.53},
          {x: 1.06, y: -0.53},
          {x: -1.06, y: 0.53},
          {x: 1.06, y: 0.53},
        ],
        transitionSeconds: 0.04,
        travel: {maximumSeconds: 3.2, minimumSeconds: 1.4},
      },
      source: nightReadingFocusedEyeIrises,
    },
  ),
  'night-reading-user': createSeparatedScene(
    'night-reading-user',
    {
      base: nightReadingUserBase,
      buildingLayers: NIGHT_BUILDING_LAYERS,
      head: nightReadingUserHead,
      leftHand: nightReadingUserLeftHand,
      reference: nightReadingUserReference,
      rightHand: nightReadingUserRightHand,
    },
    {head: {x: 1050, y: 425}, leftHand: {x: 735, y: 710}, rightHand: {x: 1060, y: 730}},
    createTranslationEyeLayer(0, nightReadingUserEyeIrises),
  ),
  'night-typing-focused': createSeparatedScene(
    'night-typing-focused',
    {
      base: nightTypingFocusedBase,
      buildingLayers: NIGHT_BUILDING_LAYERS,
      head: nightTypingFocusedHead,
      leftHand: nightTypingFocusedLeftHand,
      reference: nightTypingFocusedReference,
      rightHand: nightTypingFocusedRightHand,
    },
    {head: {x: 1045, y: 430}, leftHand: {x: 755, y: 710}, rightHand: {x: 1015, y: 725}},
    createTranslationEyeLayer(NIGHT_TYPING_FOCUSED_EYE_ORIGIN_X, nightReadingFocusedEyeIrises),
  ),
  'night-typing-user': createSeparatedScene(
    'night-typing-user',
    {
      base: nightTypingUserBase,
      buildingLayers: NIGHT_BUILDING_LAYERS,
      head: nightTypingUserHead,
      leftHand: nightTypingUserLeftHand,
      reference: nightTypingUserReference,
      rightHand: nightTypingUserRightHand,
    },
    {head: {x: 1045, y: 430}, leftHand: {x: 755, y: 710}, rightHand: {x: 1015, y: 725}},
    createTranslationEyeLayer(0, nightReadingUserEyeIrises),
  ),
  'night-writing-focused': createSeparatedScene(
    'night-writing-focused',
    {
      base: nightWritingFocusedBase,
      buildingLayers: NIGHT_BUILDING_LAYERS,
      head: nightWritingFocusedHead,
      leftHand: nightWritingFocusedLeftHand,
      reference: nightWritingFocusedReference,
      rightHand: nightWritingFocusedRightHand,
    },
    {head: {x: 1050, y: 425}, leftHand: {x: 700, y: 690}, rightHand: {x: 1030, y: 715}},
    createTranslationEyeLayer(NIGHT_WRITING_FOCUSED_EYE_ORIGIN_X, nightReadingFocusedEyeIrises),
  ),
  'night-writing-user': createSeparatedScene(
    'night-writing-user',
    {
      base: nightWritingUserBase,
      buildingLayers: NIGHT_BUILDING_LAYERS,
      head: nightWritingUserHead,
      leftHand: nightWritingUserLeftHand,
      reference: nightWritingUserReference,
      rightHand: nightWritingUserRightHand,
    },
    {head: {x: 1050, y: 425}, leftHand: {x: 700, y: 690}, rightHand: {x: 1030, y: 715}},
    createTranslationEyeLayer(0, nightReadingUserEyeIrises),
  ),
} as const satisfies Record<
  Exclude<PSceneId, 'day-reading-focused' | 'day-writing-focused'>,
  PixiLayerSceneDefinition
>
