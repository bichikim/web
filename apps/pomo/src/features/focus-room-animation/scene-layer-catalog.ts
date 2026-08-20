import dayFocusedScribbleHeadSource from './assets/concept-art/day-focused-scribble-head.png'
import dayReadingFocusedScribbleBackgroundSource from './assets/concept-art/day-reading-focused-scribble-background.png'
import dayTypingFocusedScribbleBackgroundSource from './assets/concept-art/day-typing-focused-scribble-background.png'
import dayWritingFocusedScribbleBackgroundSource from './assets/concept-art/day-writing-focused-scribble-background.png'
import {DAY_READING_FOCUSED_LAYER_SCENE} from './day-reading-focused-layer-scene'
import {DAY_WRITING_LAYER_SCENE} from './day-writing-layer-scene'
import {GENERATED_LAYER_SCENES} from './generated-layer-scenes'
import type {PixiLayerSceneDefinition} from './layer-scene'
import type {PSceneId} from './scene-catalog'
import type {PSceneStyle} from './scene-style'

const ORIGINAL_LAYER_SCENES = {
  ...GENERATED_LAYER_SCENES,
  'day-reading-focused': DAY_READING_FOCUSED_LAYER_SCENE,
  'day-writing-focused': DAY_WRITING_LAYER_SCENE,
} satisfies Readonly<Record<PSceneId, PixiLayerSceneDefinition>>

const createScribbleLayerScene = (
  sceneId: PSceneId,
  backgroundSource: string,
): PixiLayerSceneDefinition => ({
  background: '#ffffff',
  height: 941,
  id: `scribble-${sceneId}-layers`,
  layers: [
    {id: 'background', source: backgroundSource},
    {id: 'head', position: {x: 809, y: 127}, source: dayFocusedScribbleHeadSource},
  ],
  width: 1672,
})

const SCRIBBLE_LAYER_SCENES = {
  ...ORIGINAL_LAYER_SCENES,
  'day-reading-focused': createScribbleLayerScene(
    'day-reading-focused',
    dayReadingFocusedScribbleBackgroundSource,
  ),
  'day-typing-focused': createScribbleLayerScene(
    'day-typing-focused',
    dayTypingFocusedScribbleBackgroundSource,
  ),
  'day-writing-focused': createScribbleLayerScene(
    'day-writing-focused',
    dayWritingFocusedScribbleBackgroundSource,
  ),
} satisfies Readonly<Record<PSceneId, PixiLayerSceneDefinition>>

const SCENE_LAYER_DATASETS = {
  original: ORIGINAL_LAYER_SCENES,
  scribble: SCRIBBLE_LAYER_SCENES,
} satisfies Readonly<Record<PSceneStyle, Readonly<Record<PSceneId, PixiLayerSceneDefinition>>>>

/** Resolves the render-only layer definition behind the canvas chunk boundary. */
export const getPSceneLayer = (
  sceneId: PSceneId,
  sceneStyle: PSceneStyle = 'original',
): PixiLayerSceneDefinition => SCENE_LAYER_DATASETS[sceneStyle][sceneId]
