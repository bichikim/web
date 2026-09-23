import {sortBy} from 'es-toolkit/array'
import {clamp} from 'es-toolkit/math'

import type {
  PuppetDocument,
  PuppetEasing,
  PuppetKeyframe,
  PuppetMotion,
  PuppetParameterTrack,
  PuppetTrackAxis,
  PuppetVertexTrack,
} from '../../player/document'
import {sampleMotionVertices} from '../../player/internal/motion'
import {resolveParameterValue} from '../../player/parameter-value'
import type {VertexPoint} from '../edit-document'

export interface VertexKeyframeTarget {
  readonly motionId: string
  readonly partId: string
  readonly time: number
  readonly vertexIndex: number
}

export interface SetVertexKeyframeOptions extends VertexKeyframeTarget {
  readonly document: PuppetDocument
  readonly point: VertexPoint
}

export interface InsertVertexKeyframeOptions extends VertexKeyframeTarget {
  readonly document: PuppetDocument
}

export interface EditVertexKeyframeOptions extends VertexKeyframeTarget {
  readonly document: PuppetDocument
}

export interface SetVertexKeyframeEasingOptions extends EditVertexKeyframeOptions {
  readonly easing: PuppetEasing
}

export interface ParameterKeyframeTarget {
  readonly motionId: string
  readonly parameterId: string
  readonly time: number
}

export interface SetParameterKeyframeOptions extends ParameterKeyframeTarget {
  readonly document: PuppetDocument
  readonly value: number
}

export interface EditParameterKeyframeOptions extends ParameterKeyframeTarget {
  readonly document: PuppetDocument
}

export interface ParameterKeyframesTarget {
  readonly motionId: string
  readonly parameterId: string
  readonly times: ReadonlyArray<number>
}

export interface EditParameterKeyframesOptions extends ParameterKeyframesTarget {
  readonly document: PuppetDocument
}

export interface MoveParameterKeyframeOptions extends EditParameterKeyframeOptions {
  readonly nextTime: number
}

export interface MoveParameterKeyframesTarget extends ParameterKeyframesTarget {
  readonly nextTime: number
  readonly time: number
}

export interface MoveParameterKeyframesOptions extends MoveParameterKeyframesTarget {
  readonly document: PuppetDocument
}

export interface SetParameterKeyframeEasingOptions extends EditParameterKeyframeOptions {
  readonly easing: PuppetEasing
}

export interface SetParameterKeyframesEasingOptions extends EditParameterKeyframesOptions {
  readonly easing: PuppetEasing
}

const COORDINATES_PER_VERTEX = 2
const TIME_EPSILON = 0.000_001

const hasSameTime = (first: number, second: number) => Math.abs(first - second) <= TIME_EPSILON

const includesTime = (times: ReadonlyArray<number>, time: number) =>
  times.some((candidate) => hasSameTime(candidate, time))

const upsertKeyframe = (
  keyframes: ReadonlyArray<PuppetKeyframe>,
  time: number,
  value: number,
): ReadonlyArray<PuppetKeyframe> => {
  const existingIndex = keyframes.findIndex((keyframe) => hasSameTime(keyframe.time, time))

  if (existingIndex >= 0) {
    return keyframes.map((keyframe, index) =>
      index === existingIndex ? {...keyframe, time, value} : keyframe,
    )
  }

  return sortBy([...keyframes, {time, value}], ['time'])
}

const upsertTrack = (
  motion: PuppetMotion,
  target: VertexKeyframeTarget,
  axis: PuppetTrackAxis,
  value: number,
): PuppetMotion => {
  const trackIndex = motion.tracks.findIndex(
    (track) =>
      track.kind === 'vertex' &&
      track.axis === axis &&
      track.partId === target.partId &&
      track.vertexIndex === target.vertexIndex,
  )
  const nextTrack: PuppetVertexTrack = {
    axis,
    keyframes: upsertKeyframe(
      trackIndex < 0 ? [] : (motion.tracks[trackIndex]?.keyframes ?? []),
      target.time,
      value,
    ),
    kind: 'vertex',
    partId: target.partId,
    vertexIndex: target.vertexIndex,
  }

  return {
    ...motion,
    tracks:
      trackIndex < 0
        ? [...motion.tracks, nextTrack]
        : motion.tracks.map((track, index) => (index === trackIndex ? nextTrack : track)),
  }
}

const replaceMotion = (
  document: PuppetDocument,
  motionId: string,
  update: (motion: PuppetMotion) => PuppetMotion,
): PuppetDocument | undefined => {
  const motionIndex = document.motions.findIndex((motion) => motion.id === motionId)

  if (motionIndex < 0) {
    return undefined
  }

  return {
    ...document,
    motions: document.motions.map((motion, index) =>
      index === motionIndex ? update(motion) : motion,
    ),
  }
}

export const setParameterKeyframe = (
  options: SetParameterKeyframeOptions,
): PuppetDocument | undefined => {
  const parameter = options.document.parameters?.find(
    (candidate) => candidate.id === options.parameterId,
  )

  if (parameter === undefined || !Number.isFinite(options.value)) {
    return undefined
  }

  return replaceMotion(options.document, options.motionId, (motion) => {
    const time = clamp(options.time, 0, motion.duration)
    const trackIndex = motion.tracks.findIndex(
      (track) => track.kind === 'parameter' && track.parameterId === options.parameterId,
    )
    const keyframes = upsertKeyframe(
      trackIndex < 0 ? [] : (motion.tracks[trackIndex]?.keyframes ?? []),
      time,
      resolveParameterValue(parameter, options.value),
    )
    const track: PuppetParameterTrack = {
      keyframes,
      kind: 'parameter',
      parameterId: options.parameterId,
    }

    return {
      ...motion,
      tracks:
        trackIndex < 0
          ? [...motion.tracks, track]
          : motion.tracks.map((candidate, index) => (index === trackIndex ? track : candidate)),
    }
  })
}

export const deleteParameterKeyframe = (
  options: EditParameterKeyframeOptions,
): PuppetDocument | undefined => deleteParameterKeyframes({...options, times: [options.time]})

export const deleteParameterKeyframes = (
  options: EditParameterKeyframesOptions,
): PuppetDocument | undefined =>
  replaceMotion(options.document, options.motionId, (motion) => ({
    ...motion,
    tracks: motion.tracks.flatMap((track) => {
      if (track.kind !== 'parameter' || track.parameterId !== options.parameterId) {
        return [track]
      }

      const keyframes = track.keyframes.filter(
        (keyframe) => !includesTime(options.times, keyframe.time),
      )
      return keyframes.length === 0 ? [] : [{...track, keyframes}]
    }),
  }))

export const moveParameterKeyframe = (
  options: MoveParameterKeyframeOptions,
): PuppetDocument | undefined => moveParameterKeyframes({...options, times: [options.time]})

export const moveParameterKeyframes = (
  options: MoveParameterKeyframesOptions,
): PuppetDocument | undefined => {
  const motion = options.document.motions.find((candidate) => candidate.id === options.motionId)
  const track = motion?.tracks.find(
    (candidate) => candidate.kind === 'parameter' && candidate.parameterId === options.parameterId,
  )
  const sourceKeyframe = track?.keyframes.find((keyframe) =>
    hasSameTime(keyframe.time, options.time),
  )

  if (
    motion === undefined ||
    track === undefined ||
    sourceKeyframe === undefined ||
    !includesTime(options.times, options.time)
  ) {
    return undefined
  }

  const timeOffset = options.nextTime - options.time
  const selectedKeyframes = track.keyframes.filter((keyframe) =>
    includesTime(options.times, keyframe.time),
  )
  const nextTimes = selectedKeyframes.map((keyframe) => keyframe.time + timeOffset)
  const outsideDuration = nextTimes.some((time) => time < 0 || time > motion.duration)
  const occupied = track.keyframes.some(
    (keyframe) =>
      !includesTime(options.times, keyframe.time) &&
      nextTimes.some((time) => hasSameTime(keyframe.time, time)),
  )

  if (
    selectedKeyframes.length === 0 ||
    hasSameTime(options.time, options.nextTime) ||
    outsideDuration ||
    occupied
  ) {
    return undefined
  }

  return replaceMotion(options.document, options.motionId, (candidate) => ({
    ...candidate,
    tracks: candidate.tracks.map((candidateTrack) =>
      candidateTrack.kind === 'parameter' && candidateTrack.parameterId === options.parameterId
        ? {
            ...candidateTrack,
            keyframes: sortBy(
              candidateTrack.keyframes.map((keyframe) =>
                includesTime(options.times, keyframe.time)
                  ? {...keyframe, time: keyframe.time + timeOffset}
                  : keyframe,
              ),
              ['time'],
            ),
          }
        : candidateTrack,
    ),
  }))
}

export const setParameterKeyframeEasing = (
  options: SetParameterKeyframeEasingOptions,
): PuppetDocument | undefined => setParameterKeyframesEasing({...options, times: [options.time]})

export const setParameterKeyframesEasing = (
  options: SetParameterKeyframesEasingOptions,
): PuppetDocument | undefined =>
  replaceMotion(options.document, options.motionId, (motion) => ({
    ...motion,
    tracks: motion.tracks.map((track) =>
      track.kind === 'parameter' && track.parameterId === options.parameterId
        ? {
            ...track,
            keyframes: track.keyframes.map((keyframe) =>
              includesTime(options.times, keyframe.time)
                ? {...keyframe, easing: options.easing}
                : keyframe,
            ),
          }
        : track,
    ),
  }))

export const setVertexKeyframe = (options: SetVertexKeyframeOptions): PuppetDocument | undefined =>
  replaceMotion(options.document, options.motionId, (motion) => {
    const clampedTime = clamp(options.time, 0, motion.duration)
    const target = {...options, time: clampedTime}
    const horizontalMotion = upsertTrack(motion, target, 'x', options.point.x)
    return upsertTrack(horizontalMotion, target, 'y', options.point.y)
  })

export const insertVertexKeyframe = (
  options: InsertVertexKeyframeOptions,
): PuppetDocument | undefined => {
  const motion = options.document.motions.find((candidate) => candidate.id === options.motionId)
  const part = options.document.parts.find((candidate) => candidate.id === options.partId)

  if (motion === undefined || part === undefined) {
    return undefined
  }

  const coordinateIndex = options.vertexIndex * COORDINATES_PER_VERTEX

  if (coordinateIndex < 0 || coordinateIndex + 1 >= part.mesh.vertices.length) {
    return undefined
  }

  const time = clamp(options.time, 0, motion.duration)
  const vertices = sampleMotionVertices({
    motion,
    partId: options.partId,
    restVertices: part.mesh.vertices,
    time,
  })
  const x = vertices[coordinateIndex]
  const y = vertices[coordinateIndex + 1]

  return x === undefined || y === undefined
    ? undefined
    : setVertexKeyframe({...options, point: {x, y}, time})
}

export const deleteVertexKeyframe = (
  options: EditVertexKeyframeOptions,
): PuppetDocument | undefined =>
  replaceMotion(options.document, options.motionId, (motion) => ({
    ...motion,
    tracks: motion.tracks.flatMap((track) => {
      if (
        track.kind === 'parameter' ||
        track.partId !== options.partId ||
        track.vertexIndex !== options.vertexIndex
      ) {
        return [track]
      }

      const keyframes = track.keyframes.filter(
        (keyframe) => !hasSameTime(keyframe.time, options.time),
      )
      return keyframes.length === 0 ? [] : [{...track, keyframes}]
    }),
  }))

export const setVertexKeyframeEasing = (
  options: SetVertexKeyframeEasingOptions,
): PuppetDocument | undefined =>
  replaceMotion(options.document, options.motionId, (motion) => ({
    ...motion,
    tracks: motion.tracks.map((track) => {
      if (
        track.kind === 'parameter' ||
        track.partId !== options.partId ||
        track.vertexIndex !== options.vertexIndex
      ) {
        return track
      }

      return {
        ...track,
        keyframes: track.keyframes.map((keyframe) =>
          hasSameTime(keyframe.time, options.time)
            ? {...keyframe, easing: options.easing}
            : keyframe,
        ),
      }
    }),
  }))
