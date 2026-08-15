import baseImage from 'assets/focus-room-layers/day-reading-focused/base.webp'
import eyeImage from 'assets/focus-room-layers/day-reading-focused/layer-eye-irises.webp'
import headImage from 'assets/focus-room-layers/day-reading-focused/layer-head-eye-base.webp'
import leftHandImage from 'assets/focus-room-layers/day-reading-focused/layer-hand-left.webp'
import rightHandImage from 'assets/focus-room-layers/day-reading-focused/layer-hand-right.webp'
import referenceImage from 'assets/concept-art/focus-room-day-reading-concept.webp'
import {createEyeMotion} from './eye-motion'
import type {PixiLayerSceneDefinition} from './layer-scene'
import {FOCUS_ROOM_PREVIEW_CHANNELS} from './scene-catalog-channels'

export const DAY_READING_FOCUSED_LAYER_SCENE = {
  background: '#17130f',
  height: 941,
  id: 'day-reading-focused-layers',
  layers: [
    {id: 'background', source: baseImage},
    {
      attachmentId: 'eyes',
      channel: FOCUS_ROOM_PREVIEW_CHANNELS.head,
      id: 'head',
      motion: {
        center: {x: 1060, y: 425},
        degrees: 0.5,
        kind: 'pivot-rotation',
        travel: {maximumSeconds: 2.4, minimumSeconds: 1.5},
      },
      source: headImage,
    },
    {
      channel: FOCUS_ROOM_PREVIEW_CHANNELS.eyes,
      id: 'eye-irises',
      motion: createEyeMotion(),
      parentAttachmentId: 'eyes',
      source: eyeImage,
    },
    {
      channel: FOCUS_ROOM_PREVIEW_CHANNELS.hands,
      id: 'left-hand',
      motion: {
        center: {x: 735, y: 710},
        degrees: -0.55,
        kind: 'pivot-rotation',
        travel: {maximumSeconds: 1.5, minimumSeconds: 0.9},
      },
      source: leftHandImage,
    },
    {
      channel: FOCUS_ROOM_PREVIEW_CHANNELS.hands,
      id: 'right-hand',
      motion: {
        center: {x: 1040, y: 730},
        degrees: 0.55,
        kind: 'pivot-rotation',
        travel: {maximumSeconds: 1.5, minimumSeconds: 0.9},
      },
      source: rightHandImage,
    },
    {
      channel: FOCUS_ROOM_PREVIEW_CHANNELS.reference,
      id: 'reference',
      source: referenceImage,
      visible: false,
    },
  ],
  width: 1672,
} satisfies PixiLayerSceneDefinition
