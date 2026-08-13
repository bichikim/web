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
import dayReadingDepth from '../../../assets/focus-room-depth/depth-day-reading.png'
import dayReadingGazeDepth from '../../../assets/focus-room-depth/depth-day-reading-user-gaze.png'
import dayTypingDepth from '../../../assets/focus-room-depth/depth-day-typing.png'
import dayTypingGazeDepth from '../../../assets/focus-room-depth/depth-day-typing-user-gaze.png'
import dayWritingDepth from '../../../assets/focus-room-depth/depth-day-writing.png'
import dayWritingGazeDepth from '../../../assets/focus-room-depth/depth-day-writing-user-gaze.png'
import nightReadingDepth from '../../../assets/focus-room-depth/depth-night-reading.png'
import nightReadingGazeDepth from '../../../assets/focus-room-depth/depth-night-reading-user-gaze.png'
import nightTypingDepth from '../../../assets/focus-room-depth/depth-night-typing.png'
import nightTypingGazeDepth from '../../../assets/focus-room-depth/depth-night-typing-user-gaze.png'
import nightWritingDepth from '../../../assets/focus-room-depth/depth-night-desk.png'
import nightWritingGazeDepth from '../../../assets/focus-room-depth/depth-night-writing-user-gaze.png'
import {DAY_WRITING_LAYER_SCENE} from './day-writing-layer-scene'
import type {
  PixiLayerSceneDefinition,
  PixiSceneMotion,
  PixiSceneRectangle,
  PixiSceneTravelRange,
} from './layer-scene'

export type FocusRoomActivity = 'reading' | 'typing' | 'writing'
export type FocusRoomGaze = 'focused' | 'user'
export type FocusRoomTime = 'day' | 'night'
export type FocusRoomSceneId = `${FocusRoomTime}-${FocusRoomActivity}-${FocusRoomGaze}`

export interface FocusRoomSceneCatalogEntry {
  readonly activity: FocusRoomActivity
  readonly depthSource: string
  readonly gaze: FocusRoomGaze
  readonly id: FocusRoomSceneId
  readonly label: string
  readonly layerScene: PixiLayerSceneDefinition
  readonly source: string
  readonly time: FocusRoomTime
}

interface SceneMotionRegions {
  readonly hair: PixiSceneRectangle
  readonly hands: readonly PixiSceneRectangle[]
  readonly head: PixiSceneRectangle
}

interface SceneSourcePair {
  readonly depthSource: string
  readonly source: string
}

const SCENE_WIDTH = 1672
const SCENE_HEIGHT = 941
const HEAD_TRAVEL = {maximumSeconds: 2.4, minimumSeconds: 1.45} satisfies PixiSceneTravelRange
const HAIR_TRAVEL = {maximumSeconds: 1.8, minimumSeconds: 1.1} satisfies PixiSceneTravelRange
const HAND_TRAVEL = {maximumSeconds: 1.35, minimumSeconds: 0.65} satisfies PixiSceneTravelRange

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
} satisfies Record<FocusRoomTime, Record<FocusRoomActivity, Record<FocusRoomGaze, SceneSourcePair>>>

const MOTION_REGIONS = {
  reading: {
    focused: {
      hair: {height: 220, width: 300, x: 810, y: 120},
      hands: [
        {height: 185, width: 210, x: 700, y: 530},
        {height: 185, width: 210, x: 930, y: 530},
      ],
      head: {height: 390, width: 430, x: 735, y: 90},
    },
    user: {
      hair: {height: 220, width: 300, x: 810, y: 105},
      hands: [
        {height: 185, width: 210, x: 700, y: 530},
        {height: 185, width: 210, x: 930, y: 530},
      ],
      head: {height: 390, width: 430, x: 735, y: 75},
    },
  },
  typing: {
    focused: {
      hair: {height: 215, width: 300, x: 825, y: 125},
      hands: [
        {height: 170, width: 220, x: 760, y: 545},
        {height: 170, width: 220, x: 970, y: 545},
      ],
      head: {height: 390, width: 430, x: 750, y: 95},
    },
    user: {
      hair: {height: 215, width: 300, x: 825, y: 105},
      hands: [
        {height: 170, width: 220, x: 760, y: 545},
        {height: 170, width: 220, x: 970, y: 545},
      ],
      head: {height: 390, width: 430, x: 750, y: 75},
    },
  },
  writing: {
    focused: {
      hair: {height: 220, width: 300, x: 810, y: 120},
      hands: [
        {height: 190, width: 225, x: 655, y: 535},
        {height: 175, width: 220, x: 925, y: 555},
      ],
      head: {height: 400, width: 440, x: 730, y: 90},
    },
    user: {
      hair: {height: 220, width: 300, x: 810, y: 105},
      hands: [
        {height: 190, width: 225, x: 655, y: 535},
        {height: 175, width: 220, x: 925, y: 555},
      ],
      head: {height: 400, width: 440, x: 730, y: 75},
    },
  },
} satisfies Record<FocusRoomActivity, Record<FocusRoomGaze, SceneMotionRegions>>

const LABELS = {
  activity: {reading: '책 읽기', typing: '노트북 타이핑', writing: '글쓰기'},
  gaze: {focused: '작업에 집중', user: '사용자 보기'},
  time: {day: '낮', night: '밤'},
} as const

const createPixelMotion = (
  region: PixiSceneRectangle,
  distance: {readonly x: number; readonly y: number},
  travel: PixiSceneTravelRange,
): PixiSceneMotion => ({
  effects: [{distance, featherPixels: 42, kind: 'pixel-push', region}],
  kind: 'pixel-oscillation',
  travel,
})

const createPreviewScene = (
  id: FocusRoomSceneId,
  source: string,
  regions: SceneMotionRegions,
): PixiLayerSceneDefinition => ({
  background: '#17130f',
  height: SCENE_HEIGHT,
  id,
  layers: [
    {
      id: 'scene',
      motions: [
        createPixelMotion(regions.head, {x: 1.8, y: -1.1}, HEAD_TRAVEL),
        createPixelMotion(regions.hair, {x: -3.2, y: 0.8}, HAIR_TRAVEL),
        ...regions.hands.map((region, index) =>
          createPixelMotion(
            region,
            index === 0 ? {x: 2.4, y: 1.1} : {x: -1.8, y: 0.8},
            HAND_TRAVEL,
          ),
        ),
      ],
      source,
    },
  ],
  width: SCENE_WIDTH,
})

const TIMES: readonly FocusRoomTime[] = ['day', 'night']
const ACTIVITIES: readonly FocusRoomActivity[] = ['reading', 'writing', 'typing']
const GAZES: readonly FocusRoomGaze[] = ['focused', 'user']

export const FOCUS_ROOM_SCENES: readonly FocusRoomSceneCatalogEntry[] = TIMES.flatMap((time) =>
  ACTIVITIES.flatMap((activity) =>
    GAZES.map((gaze) => {
      const id: FocusRoomSceneId = `${time}-${activity}-${gaze}`
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
            : createPreviewScene(id, asset.source, MOTION_REGIONS[activity][gaze]),
        source: asset.source,
        time,
      }
    }),
  ),
)

const SCENE_BY_ID = new Map(FOCUS_ROOM_SCENES.map((scene) => [scene.id, scene]))

export const getFocusRoomScene = (
  time: FocusRoomTime,
  activity: FocusRoomActivity,
  gaze: FocusRoomGaze,
) => {
  const scene = SCENE_BY_ID.get(`${time}-${activity}-${gaze}`)

  if (scene === undefined) {
    throw new Error(`Missing focus room scene: ${time}-${activity}-${gaze}`)
  }

  return scene
}
