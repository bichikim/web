import type {PuppetKeyframe, PuppetMotion, PuppetMotionFade, PuppetTrack} from '../player/document'
import {jsonArray, jsonBoolean, jsonNumber, jsonObject, jsonString} from './json-fields'
import {trimCubismKeyframes} from './trim-cubism-keyframes'

const MOTION_VERSION = 3
const DEFAULT_FRAME_RATE = 30

export interface CubismMotionOptions extends PuppetMotionFade {
  /** 출력 문서에서 모션을 식별할 ID. */
  readonly id: string
  /** model3의 모션 그룹. 생략하면 그룹을 지정하지 않는다. */
  readonly group?: string
}

const readFade = (source: Record<string, unknown>): PuppetMotionFade => ({
  ...(source.FadeInTime === undefined || jsonNumber(source.FadeInTime) < 0
    ? {}
    : {fadeInTime: jsonNumber(source.FadeInTime)}),
  ...(source.FadeOutTime === undefined || jsonNumber(source.FadeOutTime) < 0
    ? {}
    : {fadeOutTime: jsonNumber(source.FadeOutTime)}),
})

const resolveMotionFade = (override: number | undefined, fallback: number | undefined) =>
  override === undefined || override < 0 ? (fallback ?? 1) : override

/* eslint-disable no-magic-numbers -- motion3 fixes segment tags and coordinate offsets. */
const readSegments = (source: unknown): ReadonlyArray<PuppetKeyframe> => {
  const values = jsonArray(source).map((value) => jsonNumber(value))
  const keyframes: PuppetKeyframe[] = [{time: jsonNumber(values[0]), value: jsonNumber(values[1])}]
  let index = 2
  while (index < values.length) {
    const type = values[index]!
    const previous = keyframes.pop()!
    const bezier = type === 1
    const time = jsonNumber(values[index + (bezier ? 5 : 1)])
    const value = jsonNumber(values[index + (bezier ? 6 : 2)])
    if (time <= previous.time) {
      throw new Error('Cubism motion keyframe times must increase')
    }
    switch (type) {
      case 0:
        keyframes.push({...previous, easing: 'linear'})
        break
      case 1:
        keyframes.push({
          ...previous,
          bezier: [
            (jsonNumber(values[index + 1]) - previous.time) / (time - previous.time),
            jsonNumber(values[index + 2]),
            (jsonNumber(values[index + 3]) - previous.time) / (time - previous.time),
            jsonNumber(values[index + 4]),
          ],
          easing: 'bezier',
        })
        break
      case 2:
        keyframes.push({...previous, easing: 'stepped'})
        break
      case 3:
        keyframes.push({...previous, easing: 'inverse-stepped'})
        break
      default:
        throw new Error(`Cubism motion segment ${type} is not supported`)
    }
    keyframes.push({time, value})
    index += bezier ? 7 : 3
  }
  return keyframes
}

/* eslint-enable no-magic-numbers */

const readTrack = (value: unknown): PuppetTrack => {
  const source = jsonObject(value)
  const id = jsonString(source.Id)
  const target = jsonString(source.Target)
  const common = {...readFade(source), keyframes: readSegments(source.Segments)}
  switch (target) {
    case 'Parameter':
      return {...common, kind: 'parameter', parameterId: id}
    case 'PartOpacity':
      return {...common, fadeInTime: 0, fadeOutTime: 0, kind: 'parameter', parameterId: id}
    case 'Model': {
      switch (id) {
        case 'Opacity':
          return {...common, kind: 'model', target: 'opacity'}
        case 'EyeBlink':
          return {...common, kind: 'model', target: 'eye-blink'}
        case 'LipSync':
          return {...common, kind: 'model', target: 'lip-sync'}
        default:
          throw new Error(`Cubism model motion target ${id} is not supported`)
      }
    }
    default:
      throw new Error(`Cubism motion target ${target} is not supported`)
  }
}

/** Cubism motion3 곡선, 페이드와 이벤트를 Poffo 모션으로 변환한다. */
export const convertCubismMotion = (value: unknown, options: CubismMotionOptions): PuppetMotion => {
  const source = jsonObject(value)
  if (source.Version !== MOTION_VERSION) {
    throw new Error('Cubism motion version must be 3')
  }
  const metadata = jsonObject(source.Meta)
  const fade = readFade(source)
  return {
    duration: jsonNumber(metadata.Duration),
    events: jsonArray(source.UserData ?? []).map((entry) => {
      const event = jsonObject(entry)
      return {
        time: jsonNumber(event.Time),
        value: typeof event.Value === 'string' ? event.Value : jsonString(event.Value),
      }
    }),
    fadeInTime: resolveMotionFade(options.fadeInTime, fade.fadeInTime),
    fadeOutTime: resolveMotionFade(options.fadeOutTime, fade.fadeOutTime),
    framesPerSecond: jsonNumber(metadata.Fps, DEFAULT_FRAME_RATE),
    group: options.group,
    id: options.id,
    loop: jsonBoolean(metadata.Loop, true),
    parameterBounds: 'sample',
    tracks: jsonArray(source.Curves)
      .map(readTrack)
      .map((track) => ({
        ...track,
        keyframes: trimCubismKeyframes(track.keyframes, jsonNumber(metadata.Duration)),
      })),
  }
}
