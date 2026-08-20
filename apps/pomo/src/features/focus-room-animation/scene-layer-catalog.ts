import dayFocusedScribbleHeadSource from './assets/concept-art/day-focused-scribble-head.png'
import dayUserScribbleMouthClosedSource from './assets/animation/mouths/day-user-scribble/closed.png'
import dayUserScribbleMouthNarrowSource from './assets/animation/mouths/day-user-scribble/narrow.png'
import dayUserScribbleMouthOpenSource from './assets/animation/mouths/day-user-scribble/open.png'
import dayUserScribbleMouthRestSource from './assets/animation/mouths/day-user-scribble/rest.png'
import dayUserScribbleMouthRoundSource from './assets/animation/mouths/day-user-scribble/round.png'
import dayUserScribbleMouthWideSource from './assets/animation/mouths/day-user-scribble/wide.png'
import scribbleSteam01Source from './assets/animation/steam/scribble/01.png'
import scribbleSteam02Source from './assets/animation/steam/scribble/02.png'
import scribbleSteam03Source from './assets/animation/steam/scribble/03.png'
import scribbleSteam04Source from './assets/animation/steam/scribble/04.png'
import dayReadingScribbleBackgroundSource from './assets/concept-art/day-reading-focused-scribble-background-cup.png'
import dayTypingFocusedScribbleBackgroundSource from './assets/concept-art/day-typing-focused-scribble-background.png'
import dayUserScribbleHeadSource from './assets/concept-art/day-user-scribble-head.png'
import dayWritingFocusedScribbleBackgroundSource from './assets/concept-art/day-writing-focused-scribble-background.png'
import nightReadingScribbleBackgroundSource from './assets/concept-art/night-reading-focused-scribble-background.png'
import nightTypingScribbleBackgroundSource from './assets/concept-art/night-typing-focused-scribble-background.png'
import nightWritingScribbleBackgroundSource from './assets/concept-art/night-writing-focused-scribble-background.png'
import {DAY_READING_FOCUSED_LAYER_SCENE} from './day-reading-focused-layer-scene'
import {DAY_WRITING_LAYER_SCENE} from './day-writing-layer-scene'
import {GENERATED_LAYER_SCENES} from './generated-layer-scenes'
import type {PixiLayerSceneDefinition, PixiSceneLayerDefinition} from './layer-scene'
import {createMouthLayers, type PVisemeSources} from './mouth-layers'
import type {PSceneId} from './scene-catalog'
import {FOCUS_ROOM_PREVIEW_CHANNELS} from './scene-catalog-channels'
import type {PSceneStyle} from './scene-style'

const ORIGINAL_LAYER_SCENES = {
  ...GENERATED_LAYER_SCENES,
  'day-reading-focused': DAY_READING_FOCUSED_LAYER_SCENE,
  'day-writing-focused': DAY_WRITING_LAYER_SCENE,
} satisfies Readonly<Record<PSceneId, PixiLayerSceneDefinition>>

const SCRIBBLE_USER_MOUTH_SOURCES = {
  closed: dayUserScribbleMouthClosedSource,
  narrow: dayUserScribbleMouthNarrowSource,
  open: dayUserScribbleMouthOpenSource,
  rest: dayUserScribbleMouthRestSource,
  round: dayUserScribbleMouthRoundSource,
  wide: dayUserScribbleMouthWideSource,
} satisfies PVisemeSources

const SCRIBBLE_STEAM_SOURCES = [
  scribbleSteam01Source,
  scribbleSteam02Source,
  scribbleSteam03Source,
  scribbleSteam04Source,
] as const
const SCRIBBLE_STEAM_FIRST_X = 1_230
const SCRIBBLE_STEAM_CYCLE_SECONDS = 2.24
const SCRIBBLE_STEAM_HORIZONTAL_DRIFT = 3
const SCRIBBLE_STEAM_HALF_HEIGHT = 36
const SCRIBBLE_STEAM_HALF_WIDTH = 15
const SCRIBBLE_STEAM_LINE_COUNT = 3
const SCRIBBLE_STEAM_LINE_END_OFFSET = 2
const SCRIBBLE_STEAM_LINE_GAP = 32
const SCRIBBLE_STEAM_LINE_PHASE_OFFSET = 0.18
const SCRIBBLE_STEAM_LINE_VERTICAL_OFFSET = 3
const SCRIBBLE_STEAM_RISE_END_Y = 680
const SCRIBBLE_STEAM_RISE_START_Y = 698
const SCRIBBLE_STEAM_VISIBLE_FRACTION = 1 / SCRIBBLE_STEAM_SOURCES.length
const SCRIBBLE_STEAM_X_POSITIONS = Array.from(
  {length: SCRIBBLE_STEAM_LINE_COUNT},
  (_, index) => SCRIBBLE_STEAM_FIRST_X + index * SCRIBBLE_STEAM_LINE_GAP,
)

const createScribbleSteamLayers = (): ReadonlyArray<PixiSceneLayerDefinition> =>
  SCRIBBLE_STEAM_X_POSITIONS.flatMap((x, lineIndex) =>
    SCRIBBLE_STEAM_SOURCES.map((source, frameIndex) => {
      const startY = SCRIBBLE_STEAM_RISE_START_Y + lineIndex * SCRIBBLE_STEAM_LINE_VERTICAL_OFFSET

      return {
        id: `scribble-steam-${lineIndex + 1}-${frameIndex + 1}`,
        motions: [
          {
            from: {
              x: x + SCRIBBLE_STEAM_HALF_WIDTH,
              y: startY + SCRIBBLE_STEAM_HALF_HEIGHT,
            },
            kind: 'looping-translation' as const,
            phase: (lineIndex * SCRIBBLE_STEAM_LINE_PHASE_OFFSET) % 1,
            to: {
              x: x + SCRIBBLE_STEAM_HALF_WIDTH + (lineIndex - 1) * SCRIBBLE_STEAM_HORIZONTAL_DRIFT,
              y:
                SCRIBBLE_STEAM_RISE_END_Y +
                SCRIBBLE_STEAM_HALF_HEIGHT +
                lineIndex * SCRIBBLE_STEAM_LINE_END_OFFSET,
            },
            travel: {maximumSeconds: 2.4, minimumSeconds: 2.4},
          },
          {
            kind: 'visibility-cycle' as const,
            phase:
              (frameIndex / SCRIBBLE_STEAM_SOURCES.length +
                lineIndex * SCRIBBLE_STEAM_LINE_PHASE_OFFSET) %
              1,
            travel: {
              maximumSeconds: SCRIBBLE_STEAM_CYCLE_SECONDS,
              minimumSeconds: SCRIBBLE_STEAM_CYCLE_SECONDS,
            },
            visibleFraction: SCRIBBLE_STEAM_VISIBLE_FRACTION,
          },
        ],
        position: {x, y: startY},
        source,
      }
    }),
  )

const createScribbleLayerScene = (
  sceneId: PSceneId,
  backgroundSource: string,
  headSource = dayFocusedScribbleHeadSource,
  mouthSources?: PVisemeSources,
): PixiLayerSceneDefinition => ({
  background: '#ffffff',
  height: 941,
  id: `scribble-${sceneId}-layers`,
  layers: [
    {id: 'background', source: backgroundSource},
    ...createScribbleSteamLayers(),
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
      position: {x: 809, y: 127},
      source: headSource,
    },
    ...(mouthSources === undefined
      ? []
      : createMouthLayers({
          parentAttachmentId: 'eyes',
          position: {x: 0, y: 0},
          sources: mouthSources,
        })),
  ],
  width: 1672,
})

const SCRIBBLE_LAYER_SCENES = {
  ...ORIGINAL_LAYER_SCENES,
  'day-reading-focused': createScribbleLayerScene(
    'day-reading-focused',
    dayReadingScribbleBackgroundSource,
  ),
  'day-reading-user': createScribbleLayerScene(
    'day-reading-user',
    dayReadingScribbleBackgroundSource,
    dayUserScribbleHeadSource,
    SCRIBBLE_USER_MOUTH_SOURCES,
  ),
  'day-typing-focused': createScribbleLayerScene(
    'day-typing-focused',
    dayTypingFocusedScribbleBackgroundSource,
  ),
  'day-typing-user': createScribbleLayerScene(
    'day-typing-user',
    dayTypingFocusedScribbleBackgroundSource,
    dayUserScribbleHeadSource,
    SCRIBBLE_USER_MOUTH_SOURCES,
  ),
  'day-writing-focused': createScribbleLayerScene(
    'day-writing-focused',
    dayWritingFocusedScribbleBackgroundSource,
  ),
  'day-writing-user': createScribbleLayerScene(
    'day-writing-user',
    dayWritingFocusedScribbleBackgroundSource,
    dayUserScribbleHeadSource,
    SCRIBBLE_USER_MOUTH_SOURCES,
  ),
  'night-reading-focused': createScribbleLayerScene(
    'night-reading-focused',
    nightReadingScribbleBackgroundSource,
  ),
  'night-reading-user': createScribbleLayerScene(
    'night-reading-user',
    nightReadingScribbleBackgroundSource,
    dayUserScribbleHeadSource,
    SCRIBBLE_USER_MOUTH_SOURCES,
  ),
  'night-typing-focused': createScribbleLayerScene(
    'night-typing-focused',
    nightTypingScribbleBackgroundSource,
  ),
  'night-typing-user': createScribbleLayerScene(
    'night-typing-user',
    nightTypingScribbleBackgroundSource,
    dayUserScribbleHeadSource,
    SCRIBBLE_USER_MOUTH_SOURCES,
  ),
  'night-writing-focused': createScribbleLayerScene(
    'night-writing-focused',
    nightWritingScribbleBackgroundSource,
  ),
  'night-writing-user': createScribbleLayerScene(
    'night-writing-user',
    nightWritingScribbleBackgroundSource,
    dayUserScribbleHeadSource,
    SCRIBBLE_USER_MOUTH_SOURCES,
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
