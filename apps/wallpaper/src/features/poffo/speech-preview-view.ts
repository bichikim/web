import {DEFAULT_POFFO_SPEECH, type PoffoSpeech} from '@winter-love/wallpaper/settings/library-model'
import type {PointBounds} from '../tracking/use-point-drag'

const FACE_Y = 0.3

interface SpeechPreviewOptions {
  readonly speech?: PoffoSpeech
  readonly size?: {readonly width: number; readonly height: number}
}

/** Includes the widget and its saved speech anchor in one preview coordinate system. */
export const speechPreviewView = (options: SpeechPreviewOptions): PointBounds => {
  const point = options.speech ?? DEFAULT_POFFO_SPEECH
  const size = options.size ?? {height: 420, width: 320}
  const margin = 0.1
  const dimensions = {height: 132, width: 272}
  const minimum = {height: 0.25, width: 0.5}
  const bubble = {
    height: Math.max(minimum.height, dimensions.height / size.height),
    width: Math.max(minimum.width, dimensions.width / size.width),
  }
  return {
    maxX: Math.max(1, point.x + bubble.width) + margin,
    maxY: Math.max(1, point.y + bubble.height) + margin,
    minX: Math.min(0, point.x) - margin,
    minY: Math.min(0, point.y - (point.y <= FACE_Y ? bubble.height : 0)) - margin,
  }
}
