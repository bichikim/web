import dayReadingImage from './assets/concept-art/day-reading.webp'
import dayReadingGazeImage from './assets/concept-art/day-reading-user-gaze.webp'
import dayTypingImage from './assets/concept-art/day-typing.webp'
import dayTypingGazeImage from './assets/concept-art/day-typing-user-gaze.webp'
import dayWritingImage from './assets/concept-art/day-writing.webp'
import dayWritingGazeImage from './assets/concept-art/day-writing-user-gaze.webp'
import nightReadingImage from './assets/concept-art/night-reading.webp'
import nightReadingGazeImage from './assets/concept-art/night-reading-user-gaze.webp'
import nightTypingImage from './assets/concept-art/night-typing.webp'
import nightTypingGazeImage from './assets/concept-art/night-typing-user-gaze.webp'
import nightWritingImage from './assets/concept-art/night-writing.webp'
import nightWritingGazeImage from './assets/concept-art/night-writing-user-gaze.webp'
import dayReadingDepth from './assets/depth/day-reading.webp'
import dayReadingGazeDepth from './assets/depth/day-reading-user-gaze.webp'
import dayTypingDepth from './assets/depth/day-typing.webp'
import dayTypingGazeDepth from './assets/depth/day-typing-user-gaze.webp'
import dayWritingDepth from './assets/depth/day-writing.webp'
import dayWritingGazeDepth from './assets/depth/day-writing-user-gaze.webp'
import nightReadingDepth from './assets/depth/night-reading.webp'
import nightReadingGazeDepth from './assets/depth/night-reading-user-gaze.webp'
import nightTypingDepth from './assets/depth/night-typing.webp'
import nightTypingGazeDepth from './assets/depth/night-typing-user-gaze.webp'
import nightWritingDepth from './assets/depth/night-writing.webp'
import nightWritingGazeDepth from './assets/depth/night-writing-user-gaze.webp'
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
