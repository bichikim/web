import type {FocusRoomSceneId} from './scene-catalog'
import type {PixiLayerSceneDefinition, PixiScenePoint} from './layer-scene'
import {FOCUS_ROOM_PREVIEW_CHANNELS} from './scene-catalog-channels'

import dayReadingUserBase from '../../../assets/focus-room-layers/day-reading-user/base.png'
import dayReadingUserHead from '../../../assets/focus-room-layers/day-reading-user/layer-head.png'
import dayReadingUserLeftHand from '../../../assets/focus-room-layers/day-reading-user/layer-hand-left.png'
import dayReadingUserRightHand from '../../../assets/focus-room-layers/day-reading-user/layer-hand-right.png'
import dayReadingUserReference from '../../../assets/concept-art/focus-room-day-reading-user-gaze-concept.png'
import dayTypingFocusedBase from '../../../assets/focus-room-layers/day-typing-focused/base.png'
import dayTypingFocusedHead from '../../../assets/focus-room-layers/day-typing-focused/layer-head.png'
import dayTypingFocusedLeftHand from '../../../assets/focus-room-layers/day-typing-focused/layer-hand-left.png'
import dayTypingFocusedRightHand from '../../../assets/focus-room-layers/day-typing-focused/layer-hand-right.png'
import dayTypingFocusedReference from '../../../assets/concept-art/focus-room-day-typing-concept.png'
import dayTypingUserBase from '../../../assets/focus-room-layers/day-typing-user/base.png'
import dayTypingUserHead from '../../../assets/focus-room-layers/day-typing-user/layer-head.png'
import dayTypingUserLeftHand from '../../../assets/focus-room-layers/day-typing-user/layer-hand-left.png'
import dayTypingUserRightHand from '../../../assets/focus-room-layers/day-typing-user/layer-hand-right.png'
import dayTypingUserReference from '../../../assets/concept-art/focus-room-day-typing-user-gaze-concept.png'
import dayWritingUserBase from '../../../assets/focus-room-layers/day-writing-user/base.png'
import dayWritingUserHead from '../../../assets/focus-room-layers/day-writing-user/layer-head.png'
import dayWritingUserLeftHand from '../../../assets/focus-room-layers/day-writing-user/layer-hand-left.png'
import dayWritingUserRightHand from '../../../assets/focus-room-layers/day-writing-user/layer-hand-right.png'
import dayWritingUserReference from '../../../assets/concept-art/focus-room-day-writing-user-gaze-concept.png'
import nightReadingFocusedBase from '../../../assets/focus-room-layers/night-reading-focused/base.png'
import nightReadingFocusedHead from '../../../assets/focus-room-layers/night-reading-focused/layer-head.png'
import nightReadingFocusedLeftHand from '../../../assets/focus-room-layers/night-reading-focused/layer-hand-left.png'
import nightReadingFocusedRightHand from '../../../assets/focus-room-layers/night-reading-focused/layer-hand-right.png'
import nightReadingFocusedReference from '../../../assets/concept-art/focus-room-night-reading-concept.png'
import nightReadingUserBase from '../../../assets/focus-room-layers/night-reading-user/base.png'
import nightReadingUserHead from '../../../assets/focus-room-layers/night-reading-user/layer-head.png'
import nightReadingUserLeftHand from '../../../assets/focus-room-layers/night-reading-user/layer-hand-left.png'
import nightReadingUserRightHand from '../../../assets/focus-room-layers/night-reading-user/layer-hand-right.png'
import nightReadingUserReference from '../../../assets/concept-art/focus-room-night-reading-user-gaze-concept.png'
import nightTypingFocusedBase from '../../../assets/focus-room-layers/night-typing-focused/base.png'
import nightTypingFocusedHead from '../../../assets/focus-room-layers/night-typing-focused/layer-head.png'
import nightTypingFocusedLeftHand from '../../../assets/focus-room-layers/night-typing-focused/layer-hand-left.png'
import nightTypingFocusedRightHand from '../../../assets/focus-room-layers/night-typing-focused/layer-hand-right.png'
import nightTypingFocusedReference from '../../../assets/concept-art/focus-room-night-typing-concept.png'
import nightTypingUserBase from '../../../assets/focus-room-layers/night-typing-user/base.png'
import nightTypingUserHead from '../../../assets/focus-room-layers/night-typing-user/layer-head.png'
import nightTypingUserLeftHand from '../../../assets/focus-room-layers/night-typing-user/layer-hand-left.png'
import nightTypingUserRightHand from '../../../assets/focus-room-layers/night-typing-user/layer-hand-right.png'
import nightTypingUserReference from '../../../assets/concept-art/focus-room-night-typing-user-gaze-concept.png'
import nightWritingFocusedBase from '../../../assets/focus-room-layers/night-writing-focused/base.png'
import nightWritingFocusedHead from '../../../assets/focus-room-layers/night-writing-focused/layer-head.png'
import nightWritingFocusedLeftHand from '../../../assets/focus-room-layers/night-writing-focused/layer-hand-left.png'
import nightWritingFocusedRightHand from '../../../assets/focus-room-layers/night-writing-focused/layer-hand-right.png'
import nightWritingFocusedReference from '../../../assets/concept-art/focus-room-night-desk-concept.png'
import nightWritingUserBase from '../../../assets/focus-room-layers/night-writing-user/base.png'
import nightWritingUserHead from '../../../assets/focus-room-layers/night-writing-user/layer-head.png'
import nightWritingUserLeftHand from '../../../assets/focus-room-layers/night-writing-user/layer-hand-left.png'
import nightWritingUserRightHand from '../../../assets/focus-room-layers/night-writing-user/layer-hand-right.png'
import nightWritingUserReference from '../../../assets/concept-art/focus-room-night-writing-user-gaze-concept.png'

interface SeparatedSceneAssets {
  readonly base: string
  readonly head: string
  readonly leftHand: string
  readonly reference: string
  readonly rightHand: string
}

interface SeparatedScenePivots {
  readonly head: PixiScenePoint
  readonly leftHand: PixiScenePoint
  readonly rightHand: PixiScenePoint
}

const createSeparatedScene = (
  id: FocusRoomSceneId,
  assets: SeparatedSceneAssets,
  pivots: SeparatedScenePivots,
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
    },
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
  ),
  'night-reading-user': createSeparatedScene(
    'night-reading-user',
    {
      base: nightReadingUserBase,
      head: nightReadingUserHead,
      leftHand: nightReadingUserLeftHand,
      reference: nightReadingUserReference,
      rightHand: nightReadingUserRightHand,
    },
    {head: {x: 1050, y: 425}, leftHand: {x: 735, y: 710}, rightHand: {x: 1060, y: 730}},
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
  ),
  'night-typing-user': createSeparatedScene(
    'night-typing-user',
    {
      base: nightTypingUserBase,
      head: nightTypingUserHead,
      leftHand: nightTypingUserLeftHand,
      reference: nightTypingUserReference,
      rightHand: nightTypingUserRightHand,
    },
    {head: {x: 1045, y: 430}, leftHand: {x: 755, y: 710}, rightHand: {x: 1015, y: 725}},
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
  ),
  'night-writing-user': createSeparatedScene(
    'night-writing-user',
    {
      base: nightWritingUserBase,
      head: nightWritingUserHead,
      leftHand: nightWritingUserLeftHand,
      reference: nightWritingUserReference,
      rightHand: nightWritingUserRightHand,
    },
    {head: {x: 1050, y: 425}, leftHand: {x: 700, y: 690}, rightHand: {x: 1030, y: 715}},
  ),
} as const satisfies Record<
  Exclude<FocusRoomSceneId, 'day-reading-focused' | 'day-writing-focused'>,
  PixiLayerSceneDefinition
>
