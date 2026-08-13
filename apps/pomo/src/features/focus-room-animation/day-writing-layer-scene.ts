import referenceImage from '../../../assets/concept-art/focus-room-day-writing-concept.webp'
import eyeImage from '../../../assets/focus-room-layers/day-reading-focused/layer-eye-irises.png'
import baseImage from '../../../assets/focus-room-layers/day-writing-focused/base.webp'
import hairTipsMaskImage from '../../../assets/focus-room-layers/day-writing-focused/layer-head-hair-tips-mask-v4.png'
import headImage from '../../../assets/focus-room-layers/day-writing-focused/layer-head-eye-base.png'
import restingHandImage from '../../../assets/focus-room-layers/day-writing-focused/layer-resting-hand.png'
import writingHandImage from '../../../assets/focus-room-layers/day-writing-focused/layer-writing-hand.png'
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
      source: baseImage,
    },
    {
      attachmentId: 'eyes',
      channel: DAY_WRITING_LAYER_CHANNELS.head,
      id: 'head',
      motion: {
        center: {x: 1120, y: 445},
        degrees: 0.55,
        kind: 'pivot-rotation',
        pixelPush: [
          {
            distance: {x: -4, y: 1.25},
            kind: 'masked-pixel-push',
            maskSource: hairTipsMaskImage,
          },
        ],
        travel: {maximumSeconds: 2.3, minimumSeconds: 1.5},
      },
      source: headImage,
    },
    {
      channel: DAY_WRITING_LAYER_CHANNELS.eyes,
      id: 'eye-irises',
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
        travel: {maximumSeconds: 2.8, minimumSeconds: 1.6},
      },
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
