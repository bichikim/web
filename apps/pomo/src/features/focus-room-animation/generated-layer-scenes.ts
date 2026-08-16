import type {PSceneId} from './scene-catalog'
import type {PixiLayerSceneDefinition, PixiScenePoint} from './layer-scene'
import {createEyeMotion} from './eye-motion'
import {createMouthLayers, type PVisemeSources} from './mouth-layers'
import {FOCUS_ROOM_JAW_CHANNEL, FOCUS_ROOM_PREVIEW_CHANNELS} from './scene-catalog-channels'

import dayReadingUserBase from '../../../assets/focus-room-layers/day-reading-user/base.webp'
import dayReadingUserEyeIrises from '../../../assets/focus-room-layers/day-reading-user/layer-eye-irises.webp'
import dayReadingUserHead from '../../../assets/focus-room-layers/day-reading-user/layer-head-eye-base.webp'
import dayReadingUserLeftHand from '../../../assets/focus-room-layers/day-reading-user/layer-hand-left.webp'
import dayReadingUserMouthClosed from '../../../assets/focus-room-layers/day-reading-user/layer-mouth-closed.webp'
import dayReadingUserMouthNarrow from '../../../assets/focus-room-layers/day-reading-user/layer-mouth-narrow.webp'
import dayReadingUserMouthOpen from '../../../assets/focus-room-layers/day-reading-user/layer-mouth-open.webp'
import dayReadingUserMouthRest from '../../../assets/focus-room-layers/day-reading-user/layer-mouth-rest.webp'
import dayReadingUserMouthRound from '../../../assets/focus-room-layers/day-reading-user/layer-mouth-round.webp'
import dayReadingUserMouthWide from '../../../assets/focus-room-layers/day-reading-user/layer-mouth-wide.webp'
import dayReadingUserRightHand from '../../../assets/focus-room-layers/day-reading-user/layer-hand-right.webp'
import dayReadingUserReference from '../../../assets/concept-art/focus-room-day-reading-user-gaze-concept.webp'
import dayTypingFocusedBase from '../../../assets/focus-room-layers/day-typing-focused/base.webp'
import dayTypingFocusedHead from '../../../assets/focus-room-layers/day-typing-focused/layer-head-eye-base.webp'
import dayTypingFocusedLeftHand from '../../../assets/focus-room-layers/day-typing-focused/layer-hand-left.webp'
import dayTypingFocusedRightHand from '../../../assets/focus-room-layers/day-typing-focused/layer-hand-right.webp'
import dayTypingFocusedReference from '../../../assets/concept-art/focus-room-day-typing-concept.webp'
import dayFocusedEyeIrises from '../../../assets/focus-room-layers/day-reading-focused/layer-eye-irises.webp'
import dayTypingUserBase from '../../../assets/focus-room-layers/day-typing-user/base.webp'
import dayTypingUserHead from '../../../assets/focus-room-layers/day-typing-user/layer-head-eye-base.webp'
import dayTypingUserLeftHand from '../../../assets/focus-room-layers/day-typing-user/layer-hand-left.webp'
import dayTypingUserRightHand from '../../../assets/focus-room-layers/day-typing-user/layer-hand-right.webp'
import dayTypingUserReference from '../../../assets/concept-art/focus-room-day-typing-user-gaze-concept.webp'
import dayWritingUserBase from '../../../assets/focus-room-layers/day-writing-user/base.webp'
import dayWritingUserHead from '../../../assets/focus-room-layers/day-writing-user/layer-head-eye-base.webp'
import dayWritingUserLeftHand from '../../../assets/focus-room-layers/day-writing-user/layer-hand-left.webp'
import dayWritingUserRightHand from '../../../assets/focus-room-layers/day-writing-user/layer-hand-right.webp'
import dayWritingUserReference from '../../../assets/concept-art/focus-room-day-writing-user-gaze-concept.webp'
import nightReadingFocusedBase from '../../../assets/focus-room-layers/night-reading-focused/base.webp'
import nightReadingFocusedEyeIrises from '../../../assets/focus-room-layers/night-reading-focused/layer-eye-irises.webp'
import nightReadingFocusedHead from '../../../assets/focus-room-layers/night-reading-focused/layer-head-eye-base.webp'
import nightReadingFocusedLeftHand from '../../../assets/focus-room-layers/night-reading-focused/layer-hand-left.webp'
import nightReadingFocusedRightHand from '../../../assets/focus-room-layers/night-reading-focused/layer-hand-right.webp'
import nightReadingFocusedReference from '../../../assets/concept-art/focus-room-night-reading-concept.webp'
import nightReadingUserBase from '../../../assets/focus-room-layers/night-reading-user/base.webp'
import nightReadingUserEyeIrises from '../../../assets/focus-room-layers/night-reading-user/layer-eye-irises.webp'
import nightReadingUserHead from '../../../assets/focus-room-layers/night-reading-user/layer-head-eye-base.webp'
import nightReadingUserLeftHand from '../../../assets/focus-room-layers/night-reading-user/layer-hand-left.webp'
import nightReadingJawMask from '../../../assets/focus-room-layers/night-reading-user/layer-mask-jaw-displacement.webp'
import nightReadingUserMouthClosed from '../../../assets/focus-room-layers/night-reading-user/layer-mouth-closed.webp'
import nightReadingUserMouthNarrow from '../../../assets/focus-room-layers/night-reading-user/layer-mouth-narrow.webp'
import nightReadingUserMouthOpen from '../../../assets/focus-room-layers/night-reading-user/layer-mouth-open.webp'
import nightReadingUserMouthRest from '../../../assets/focus-room-layers/night-reading-user/layer-mouth-rest.webp'
import nightReadingUserMouthRound from '../../../assets/focus-room-layers/night-reading-user/layer-mouth-round.webp'
import nightReadingUserMouthWide from '../../../assets/focus-room-layers/night-reading-user/layer-mouth-wide.webp'
import nightReadingUserRightHand from '../../../assets/focus-room-layers/night-reading-user/layer-hand-right.webp'
import nightReadingUserReference from '../../../assets/concept-art/focus-room-night-reading-user-gaze-concept.webp'
import nightTypingFocusedBase from '../../../assets/focus-room-layers/night-typing-focused/base.webp'
import nightTypingFocusedHead from '../../../assets/focus-room-layers/night-typing-focused/layer-head-eye-base.webp'
import nightTypingFocusedLeftHand from '../../../assets/focus-room-layers/night-typing-focused/layer-hand-left.webp'
import nightTypingFocusedRightHand from '../../../assets/focus-room-layers/night-typing-focused/layer-hand-right.webp'
import nightTypingFocusedReference from '../../../assets/concept-art/focus-room-night-typing-concept.webp'
import nightTypingUserBase from '../../../assets/focus-room-layers/night-typing-user/base.webp'
import nightTypingUserHead from '../../../assets/focus-room-layers/night-typing-user/layer-head-eye-base.webp'
import nightTypingUserLeftHand from '../../../assets/focus-room-layers/night-typing-user/layer-hand-left.webp'
import nightTypingUserRightHand from '../../../assets/focus-room-layers/night-typing-user/layer-hand-right.webp'
import nightTypingUserReference from '../../../assets/concept-art/focus-room-night-typing-user-gaze-concept.webp'
import nightWritingFocusedBase from '../../../assets/focus-room-layers/night-writing-focused/base.webp'
import nightWritingFocusedHead from '../../../assets/focus-room-layers/night-writing-focused/layer-head-eye-base.webp'
import nightWritingFocusedLeftHand from '../../../assets/focus-room-layers/night-writing-focused/layer-hand-left.webp'
import nightWritingFocusedRightHand from '../../../assets/focus-room-layers/night-writing-focused/layer-hand-right.webp'
import nightWritingFocusedReference from '../../../assets/concept-art/focus-room-night-desk-concept.webp'
import nightWritingUserBase from '../../../assets/focus-room-layers/night-writing-user/base.webp'
import nightWritingUserHead from '../../../assets/focus-room-layers/night-writing-user/layer-head-eye-base.webp'
import nightWritingUserLeftHand from '../../../assets/focus-room-layers/night-writing-user/layer-hand-left.webp'
import nightWritingUserRightHand from '../../../assets/focus-room-layers/night-writing-user/layer-hand-right.webp'
import nightWritingUserReference from '../../../assets/concept-art/focus-room-night-writing-user-gaze-concept.webp'

interface SeparatedSceneAssets {
  readonly base: string
  readonly head: string
  readonly headJawMask?: string
  readonly leftHand: string
  readonly mouth?: PVisemeSources
  readonly reference: string
  readonly rightHand: string
}

interface SeparatedScenePivots {
  readonly head: PixiScenePoint
  readonly leftHand: PixiScenePoint
  readonly mouth?: MouthTransform
  readonly rightHand: PixiScenePoint
}

interface MouthTransform extends PixiScenePoint {
  readonly rotationDegrees: number
}

interface SeparatedSceneEyeLayer {
  readonly motion: ReturnType<typeof createEyeMotion>
  readonly source: string
}

// Each time-of-day family shares one user-facing mouth set across reading, typing, and writing scenes.
const DAY_USER_MOUTH_SOURCES = {
  closed: dayReadingUserMouthClosed,
  narrow: dayReadingUserMouthNarrow,
  open: dayReadingUserMouthOpen,
  rest: dayReadingUserMouthRest,
  round: dayReadingUserMouthRound,
  wide: dayReadingUserMouthWide,
} satisfies PVisemeSources
const NIGHT_USER_MOUTH_SOURCES = {
  closed: nightReadingUserMouthClosed,
  narrow: nightReadingUserMouthNarrow,
  open: nightReadingUserMouthOpen,
  rest: nightReadingUserMouthRest,
  round: nightReadingUserMouthRound,
  wide: nightReadingUserMouthWide,
} satisfies PVisemeSources

const NIGHT_TYPING_FOCUSED_EYE_ORIGIN_X = -5
const NIGHT_WRITING_FOCUSED_EYE_ORIGIN_X = -4

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
      statePixelPush:
        assets.headJawMask === undefined
          ? undefined
          : {
              channel: FOCUS_ROOM_JAW_CHANNEL,
              effect: {
                distance: {x: 0, y: 3},
                kind: 'masked-pixel-push',
                maskSource: assets.headJawMask,
              },
            },
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
    ...(assets.mouth === undefined || pivots.mouth === undefined
      ? []
      : createMouthLayers({
          parentAttachmentId: 'eyes',
          position: pivots.mouth,
          rotationDegrees: pivots.mouth.rotationDegrees,
          sources: assets.mouth,
        })),
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

// Each scene owns its pivots so a future asset replacement cannot silently shift another scene.
export const GENERATED_LAYER_SCENES = {
  'day-reading-user': createSeparatedScene(
    'day-reading-user',
    {
      base: dayReadingUserBase,
      head: dayReadingUserHead,
      leftHand: dayReadingUserLeftHand,
      mouth: DAY_USER_MOUTH_SOURCES,
      reference: dayReadingUserReference,
      rightHand: dayReadingUserRightHand,
    },
    {
      head: {x: 1050, y: 425},
      leftHand: {x: 735, y: 710},
      // Mouth assets retain the source head angle, so the lower-face crop stays unrotated.
      mouth: {rotationDegrees: 0, x: 930, y: 285},
      rightHand: {x: 1060, y: 730},
    },
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
      mouth: DAY_USER_MOUTH_SOURCES,
      reference: dayTypingUserReference,
      rightHand: dayTypingUserRightHand,
    },
    {
      head: {x: 1045, y: 430},
      leftHand: {x: 755, y: 710},
      mouth: {rotationDegrees: 0, x: 930, y: 285},
      rightHand: {x: 1015, y: 725},
    },
    createTranslationEyeLayer(),
  ),
  'day-writing-user': createSeparatedScene(
    'day-writing-user',
    {
      base: dayWritingUserBase,
      head: dayWritingUserHead,
      leftHand: dayWritingUserLeftHand,
      mouth: DAY_USER_MOUTH_SOURCES,
      reference: dayWritingUserReference,
      rightHand: dayWritingUserRightHand,
    },
    {
      head: {x: 1050, y: 425},
      leftHand: {x: 700, y: 690},
      mouth: {rotationDegrees: 0, x: 930, y: 285},
      rightHand: {x: 1030, y: 715},
    },
    createTranslationEyeLayer(),
  ),
  'night-reading-focused': createSeparatedScene(
    'night-reading-focused',
    {
      base: nightReadingFocusedBase,
      head: nightReadingFocusedHead,
      leftHand: nightReadingFocusedLeftHand,
      reference: nightReadingFocusedReference,
      rightHand: nightReadingFocusedRightHand,
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
      head: nightReadingUserHead,
      headJawMask: nightReadingJawMask,
      leftHand: nightReadingUserLeftHand,
      mouth: NIGHT_USER_MOUTH_SOURCES,
      reference: nightReadingUserReference,
      rightHand: nightReadingUserRightHand,
    },
    {
      head: {x: 1050, y: 425},
      leftHand: {x: 735, y: 710},
      mouth: {rotationDegrees: 0, x: 930, y: 270},
      rightHand: {x: 1060, y: 730},
    },
    createTranslationEyeLayer(0, nightReadingUserEyeIrises),
  ),
  'night-typing-focused': createSeparatedScene(
    'night-typing-focused',
    {
      base: nightTypingFocusedBase,
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
      head: nightTypingUserHead,
      leftHand: nightTypingUserLeftHand,
      mouth: NIGHT_USER_MOUTH_SOURCES,
      reference: nightTypingUserReference,
      rightHand: nightTypingUserRightHand,
    },
    {
      head: {x: 1045, y: 430},
      leftHand: {x: 755, y: 710},
      mouth: {rotationDegrees: 0, x: 930, y: 270},
      rightHand: {x: 1015, y: 725},
    },
    createTranslationEyeLayer(0, nightReadingUserEyeIrises),
  ),
  'night-writing-focused': createSeparatedScene(
    'night-writing-focused',
    {
      base: nightWritingFocusedBase,
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
      head: nightWritingUserHead,
      leftHand: nightWritingUserLeftHand,
      mouth: NIGHT_USER_MOUTH_SOURCES,
      reference: nightWritingUserReference,
      rightHand: nightWritingUserRightHand,
    },
    {
      head: {x: 1050, y: 425},
      leftHand: {x: 700, y: 690},
      mouth: {rotationDegrees: 0, x: 930, y: 270},
      rightHand: {x: 1030, y: 715},
    },
    createTranslationEyeLayer(0, nightReadingUserEyeIrises),
  ),
} as const satisfies Record<
  Exclude<PSceneId, 'day-reading-focused' | 'day-writing-focused'>,
  PixiLayerSceneDefinition
>
