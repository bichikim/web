import type {PuppetKeyframe} from '../player/document'
import {sampleBezier, sampleKeyframes} from '../player/internal/motion'

const CUBIC_DEGREE = 3

type Point = readonly [number, number]
const interpolate = (first: Point, second: Point, progress: number): Point => [
  first[0] + (second[0] - first[0]) * progress,
  first[1] + (second[1] - first[1]) * progress,
]

/** 메타데이터의 종료 시각에서 Cubism 곡선을 자르되 종료 전 곡선은 보존한다. */
export const trimCubismKeyframes = (
  keyframes: ReadonlyArray<PuppetKeyframe>,
  duration: number,
): ReadonlyArray<PuppetKeyframe> => {
  const nextIndex = keyframes.findIndex((keyframe) => keyframe.time > duration)
  if (nextIndex < 0) {
    return keyframes
  }
  const kept = keyframes.slice(0, nextIndex)
  const previous = kept.pop()
  const next = keyframes[nextIndex]!
  if (previous === undefined) {
    throw new Error('Cubism motion has no keyframe within its duration')
  }
  if (previous.time === duration) {
    return [...kept, previous]
  }
  const end: PuppetKeyframe = {time: duration, value: sampleKeyframes(keyframes, duration)}
  if (previous.easing !== 'bezier') {
    return [...kept, previous, end]
  }
  const [x1, y1, x2, y2] = previous.bezier!
  const span = next.time - previous.time
  const progress = (duration - previous.time) / span
  const parameter = sampleBezier(0, 1, progress, [x1, 1 / CUBIC_DEGREE, x2, 2 / CUBIC_DEGREE])
  const first = interpolate([0, previous.value], [x1, y1], parameter)
  const middle = interpolate([x1, y1], [x2, y2], parameter)
  const second = interpolate(first, middle, parameter)
  return [
    ...kept,
    {...previous, bezier: [first[0] / progress, first[1], second[0] / progress, second[1]]},
    end,
  ]
}
