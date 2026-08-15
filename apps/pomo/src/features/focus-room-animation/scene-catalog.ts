import dayReadingImage from '../../../assets/concept-art/focus-room-day-reading-concept.webp'
import dayReadingGazeImage from '../../../assets/concept-art/focus-room-day-reading-user-gaze-concept.webp'
import dayTypingImage from '../../../assets/concept-art/focus-room-day-typing-concept.webp'
import dayTypingGazeImage from '../../../assets/concept-art/focus-room-day-typing-user-gaze-concept.webp'
import dayWritingImage from '../../../assets/concept-art/focus-room-day-writing-concept.webp'
import dayWritingGazeImage from '../../../assets/concept-art/focus-room-day-writing-user-gaze-concept.webp'
import nightReadingImage from '../../../assets/concept-art/focus-room-night-reading-concept.webp'
import nightReadingGazeImage from '../../../assets/concept-art/focus-room-night-reading-user-gaze-concept.webp'
import nightTypingImage from '../../../assets/concept-art/focus-room-night-typing-concept.webp'
import nightTypingGazeImage from '../../../assets/concept-art/focus-room-night-typing-user-gaze-concept.webp'
import nightWritingImage from '../../../assets/concept-art/focus-room-night-desk-concept.webp'
import nightWritingGazeImage from '../../../assets/concept-art/focus-room-night-writing-user-gaze-concept.webp'
import dayReadingDepth from '../../../assets/focus-room-depth/depth-day-reading.webp'
import dayReadingGazeDepth from '../../../assets/focus-room-depth/depth-day-reading-user-gaze.webp'
import dayTypingDepth from '../../../assets/focus-room-depth/depth-day-typing.webp'
import dayTypingGazeDepth from '../../../assets/focus-room-depth/depth-day-typing-user-gaze.webp'
import dayWritingDepth from '../../../assets/focus-room-depth/depth-day-writing.webp'
import dayWritingGazeDepth from '../../../assets/focus-room-depth/depth-day-writing-user-gaze.webp'
import nightReadingDepth from '../../../assets/focus-room-depth/depth-night-reading.webp'
import nightReadingGazeDepth from '../../../assets/focus-room-depth/depth-night-reading-user-gaze.webp'
import nightTypingDepth from '../../../assets/focus-room-depth/depth-night-typing.webp'
import nightTypingGazeDepth from '../../../assets/focus-room-depth/depth-night-typing-user-gaze.webp'
import nightWritingDepth from '../../../assets/focus-room-depth/depth-night-desk.webp'
import nightWritingGazeDepth from '../../../assets/focus-room-depth/depth-night-writing-user-gaze.webp'
import {DAY_READING_FOCUSED_LAYER_SCENE} from './day-reading-focused-layer-scene'
import {DAY_WRITING_LAYER_SCENE} from './day-writing-layer-scene'
import {GENERATED_LAYER_SCENES} from './generated-layer-scenes'
import type {PixiLayerSceneDefinition} from './layer-scene'
import {FOCUS_ROOM_PREVIEW_CHANNELS} from './scene-catalog-channels'
export {FOCUS_ROOM_PREVIEW_CHANNELS} from './scene-catalog-channels'

export type PActivity = 'reading' | 'typing' | 'writing'
export type PGaze = 'focused' | 'user'
export type PTime = 'day' | 'night'
export type PSceneId = `${PTime}-${PActivity}-${PGaze}`

export interface PSceneCatalogEntry {
  readonly activity: PActivity
  readonly depthSource: string
  readonly gaze: PGaze
  readonly id: PSceneId
  readonly label: string
  readonly layerScene: PixiLayerSceneDefinition
  readonly source: string
  readonly time: PTime
}

interface SceneSourcePair {
  readonly depthSource: string
  readonly source: string
}

const SCENE_SOURCES = {
  day: {
    reading: {
      focused: {depthSource: dayReadingDepth, source: dayReadingImage},
      user: {depthSource: dayReadingGazeDepth, source: dayReadingGazeImage},
    },
    typing: {
      focused: {depthSource: dayTypingDepth, source: dayTypingImage},
      user: {depthSource: dayTypingGazeDepth, source: dayTypingGazeImage},
    },
    writing: {
      focused: {depthSource: dayWritingDepth, source: dayWritingImage},
      user: {depthSource: dayWritingGazeDepth, source: dayWritingGazeImage},
    },
  },
  night: {
    reading: {
      focused: {depthSource: nightReadingDepth, source: nightReadingImage},
      user: {depthSource: nightReadingGazeDepth, source: nightReadingGazeImage},
    },
    typing: {
      focused: {depthSource: nightTypingDepth, source: nightTypingImage},
      user: {depthSource: nightTypingGazeDepth, source: nightTypingGazeImage},
    },
    writing: {
      focused: {depthSource: nightWritingDepth, source: nightWritingImage},
      user: {depthSource: nightWritingGazeDepth, source: nightWritingGazeImage},
    },
  },
} satisfies Record<PTime, Record<PActivity, Record<PGaze, SceneSourcePair>>>

const LABELS = {
  activity: {reading: '책 읽기', typing: '노트북 타이핑', writing: '글쓰기'},
  gaze: {focused: '작업에 집중', user: '사용자 보기'},
  time: {day: '낮', night: '밤'},
} as const

const TIMES: readonly PTime[] = ['day', 'night']
const ACTIVITIES: readonly PActivity[] = ['reading', 'writing', 'typing']
const GAZES: readonly PGaze[] = ['focused', 'user']

export const FOCUS_ROOM_SCENES: readonly PSceneCatalogEntry[] = TIMES.flatMap((time) =>
  ACTIVITIES.flatMap((activity) =>
    GAZES.map((gaze) => {
      const id: PSceneId = `${time}-${activity}-${gaze}`
      const asset = SCENE_SOURCES[time][activity][gaze]

      return {
        activity,
        depthSource: asset.depthSource,
        gaze,
        id,
        label: `${LABELS.time[time]} · ${LABELS.activity[activity]} · ${LABELS.gaze[gaze]}`,
        layerScene:
          id === 'day-writing-focused'
            ? DAY_WRITING_LAYER_SCENE
            : id === 'day-reading-focused'
              ? DAY_READING_FOCUSED_LAYER_SCENE
              : GENERATED_LAYER_SCENES[id],
        source: asset.source,
        time,
      }
    }),
  ),
)

const SCENE_BY_ID = new Map(FOCUS_ROOM_SCENES.map((scene) => [scene.id, scene]))

export const getPScene = (time: PTime, activity: PActivity, gaze: PGaze) => {
  const scene = SCENE_BY_ID.get(`${time}-${activity}-${gaze}`)

  if (scene === undefined) {
    throw new Error(`Missing focus room scene: ${time}-${activity}-${gaze}`)
  }

  return scene
}
