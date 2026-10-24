import baseImage from './assets/layers/day-reading-focused/base.webp'
import eyeImage from './assets/layers/day-reading-focused/eyes.webp'
import headImage from './assets/layers/day-reading-focused/head.webp'
import leftHandImage from './assets/layers/day-reading-focused/left-hand.webp'
import rightHandImage from './assets/layers/day-reading-focused/right-hand.webp'
import referenceImage from './assets/concept-art/day-reading.webp'
import {BREATHING_MOTION} from './breathing-motion'
import {DAY_SKY_LAYERS} from './day-sky-layer'
import {createEyeMotion} from './eye-motion'
import {HAIR_TIPS_PIXEL_PUSH} from './hair-motion'
import type {PixiLayerSceneDefinition} from './layer-scene'
import {FOCUS_ROOM_PREVIEW_CHANNELS} from './scene-catalog-channels'

export const DAY_READING_FOCUSED_LAYER_SCENE = {
  background: '#17130f',
  height: 941,
  id: 'day-reading-focused-layers',
  layers: [
    {id: 'background', motion: BREATHING_MOTION, source: baseImage},
    ...DAY_SKY_LAYERS,
    {
      attachmentId: 'eyes',
      channel: FOCUS_ROOM_PREVIEW_CHANNELS.head,
      id: 'head',
      motion: {
        center: {x: 1060, y: 425},
        degrees: 0.5,
        kind: 'pivot-rotation',
        pixelPush: HAIR_TIPS_PIXEL_PUSH,
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
