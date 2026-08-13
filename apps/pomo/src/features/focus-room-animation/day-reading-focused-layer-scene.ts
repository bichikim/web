import baseImage from '../../../assets/focus-room-layers/day-reading-focused/base.webp'
import eyeImage from '../../../assets/focus-room-layers/day-reading-focused/layer-eye-irises.png'
import headImage from '../../../assets/focus-room-layers/day-reading-focused/layer-head-eye-base.png'
import leftHandImage from '../../../assets/focus-room-layers/day-reading-focused/layer-hand-left.png'
import rightHandImage from '../../../assets/focus-room-layers/day-reading-focused/layer-hand-right.png'
import referenceImage from '../../../assets/concept-art/focus-room-day-reading-concept.webp'
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
