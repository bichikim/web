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
import scribbleDayReadingDepth from './assets/depth/day-reading-focused-scribble.webp'
import scribbleDayReadingGazeDepth from './assets/depth/day-reading-user-gaze-scribble.webp'
import scribbleDayTypingDepth from './assets/depth/day-typing-focused-scribble.webp'
import scribbleDayTypingGazeDepth from './assets/depth/day-typing-user-gaze-scribble.webp'
import scribbleDayWritingDepth from './assets/depth/day-writing-focused-scribble.webp'
import scribbleDayWritingGazeDepth from './assets/depth/day-writing-user-gaze-scribble.webp'
import scribbleNightReadingDepth from './assets/depth/night-reading-focused-scribble.webp'
import scribbleNightReadingGazeDepth from './assets/depth/night-reading-user-gaze-scribble.webp'
import scribbleNightTypingDepth from './assets/depth/night-typing-focused-scribble.webp'
import scribbleNightTypingGazeDepth from './assets/depth/night-typing-user-gaze-scribble.webp'
import scribbleNightWritingDepth from './assets/depth/night-writing-focused-scribble.webp'
import scribbleNightWritingGazeDepth from './assets/depth/night-writing-user-gaze-scribble.webp'
import {FOCUS_ROOM_PREVIEW_CHANNELS} from './scene-catalog-channels'
import type {PSceneStyle} from './scene-style'
export {FOCUS_ROOM_PREVIEW_CHANNELS} from './scene-catalog-channels'

export type PActivity = 'reading' | 'typing' | 'writing'
export type PGaze = 'focused' | 'user'
export type PTime = 'day' | 'night'
export type PSceneId = `${PTime}-${PActivity}-${PGaze}`

export interface PSceneCatalogEntry {
  readonly activity: PActivity
  readonly depthSources: Readonly<Record<PSceneStyle, string>>
  readonly gaze: PGaze
  readonly id: PSceneId
  readonly label: string
  readonly source: string
  readonly time: PTime
}

interface SceneSourcePair {
  readonly depthSources: Readonly<Record<PSceneStyle, string>>
  readonly source: string
}

const SCENE_SOURCES = {
  day: {
    reading: {
      focused: {
        depthSources: {original: dayReadingDepth, scribble: scribbleDayReadingDepth},
        source: dayReadingImage,
      },
      user: {
        depthSources: {original: dayReadingGazeDepth, scribble: scribbleDayReadingGazeDepth},
        source: dayReadingGazeImage,
      },
    },
    typing: {
      focused: {
        depthSources: {original: dayTypingDepth, scribble: scribbleDayTypingDepth},
        source: dayTypingImage,
      },
      user: {
        depthSources: {original: dayTypingGazeDepth, scribble: scribbleDayTypingGazeDepth},
        source: dayTypingGazeImage,
      },
    },
    writing: {
      focused: {
        depthSources: {original: dayWritingDepth, scribble: scribbleDayWritingDepth},
        source: dayWritingImage,
      },
      user: {
        depthSources: {original: dayWritingGazeDepth, scribble: scribbleDayWritingGazeDepth},
        source: dayWritingGazeImage,
      },
    },
  },
  night: {
    reading: {
      focused: {
        depthSources: {original: nightReadingDepth, scribble: scribbleNightReadingDepth},
        source: nightReadingImage,
      },
      user: {
        depthSources: {
          original: nightReadingGazeDepth,
          scribble: scribbleNightReadingGazeDepth,
        },
        source: nightReadingGazeImage,
      },
    },
    typing: {
      focused: {
        depthSources: {original: nightTypingDepth, scribble: scribbleNightTypingDepth},
        source: nightTypingImage,
      },
      user: {
        depthSources: {original: nightTypingGazeDepth, scribble: scribbleNightTypingGazeDepth},
        source: nightTypingGazeImage,
      },
    },
    writing: {
      focused: {
        depthSources: {original: nightWritingDepth, scribble: scribbleNightWritingDepth},
        source: nightWritingImage,
      },
      user: {
        depthSources: {
          original: nightWritingGazeDepth,
          scribble: scribbleNightWritingGazeDepth,
        },
        source: nightWritingGazeImage,
      },
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
        depthSources: asset.depthSources,
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
