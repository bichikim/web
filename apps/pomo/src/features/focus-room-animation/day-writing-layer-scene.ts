import referenceImage from './assets/concept-art/day-writing.webp'
import eyeImage from './assets/layers/day-reading-focused/eyes.webp'
import skyMaskImage from './assets/layers/day-writing-focused/sky-mask.webp'
import baseImage from './assets/layers/day-writing-focused/base.webp'
import cloudImage from './assets/layers/day-writing-focused/clouds.webp'
import headImage from './assets/layers/day-writing-focused/head.webp'
import restingHandImage from './assets/layers/day-writing-focused/resting-hand.webp'
import writingHandImage from './assets/layers/day-writing-focused/writing-hand.webp'
import {BREATHING_MOTION} from './breathing-motion'
import {createEyeMotion} from './eye-motion'
import {HAIR_TIPS_PIXEL_PUSH} from './hair-motion'
import type {PixiLayerSceneDefinition} from './layer-scene'
import {FOCUS_ROOM_PREVIEW_CHANNELS} from './scene-catalog-channels'

export const DAY_WRITING_LAYER_CHANNELS = FOCUS_ROOM_PREVIEW_CHANNELS

export const DAY_WRITING_LAYER_SCENE = {
  background: '#17130f',
  height: 941,
  id: 'day-writing-focused-layers',
  layers: [
    {
      id: 'background',
      motion: BREATHING_MOTION,
      source: baseImage,
    },
    {
      id: 'day-clouds',
      maskSource: skyMaskImage,
      motion: {
        fade: {edgeFraction: 0.18, minimumOpacity: 0.16},
        from: {x: -26, y: 2},
        kind: 'looping-translation',
        phase: 0.24,
        to: {x: 38, y: -2},
        travel: {maximumSeconds: 32, minimumSeconds: 32},
      },
      opacity: 0.38,
      source: cloudImage,
    },
    {
      attachmentId: 'eyes',
      channel: DAY_WRITING_LAYER_CHANNELS.head,
      id: 'head',
      motion: {
        center: {x: 1120, y: 445},
        degrees: 0.55,
        kind: 'pivot-rotation',
        pixelPush: HAIR_TIPS_PIXEL_PUSH,
        travel: {maximumSeconds: 2.3, minimumSeconds: 1.5},
      },
      source: headImage,
    },
    {
      channel: DAY_WRITING_LAYER_CHANNELS.eyes,
      id: 'eye-irises',
      motion: createEyeMotion(),
      parentAttachmentId: 'eyes',
      source: eyeImage,
    },
    {
      channel: DAY_WRITING_LAYER_CHANNELS.hands,
      id: 'writing-hand',
      motion: {
        center: {x: 720, y: 680},
        degrees: -0.7,
        kind: 'pivot-rotation',
        travel: {maximumSeconds: 1.1, minimumSeconds: 0.6},
      },
      source: writingHandImage,
    },
    {
      channel: DAY_WRITING_LAYER_CHANNELS.hands,
      id: 'resting-hand',
      motion: {
        center: {x: 975, y: 710},
        degrees: 0.7,
        kind: 'pivot-rotation',
        travel: {maximumSeconds: 1.5, minimumSeconds: 0.9},
      },
      source: restingHandImage,
    },
    {
      channel: DAY_WRITING_LAYER_CHANNELS.reference,
      id: 'reference',
      source: referenceImage,
      visible: false,
    },
  ],
  width: 1672,
} satisfies PixiLayerSceneDefinition
