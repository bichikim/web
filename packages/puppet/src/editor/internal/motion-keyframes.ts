import {sortBy} from 'es-toolkit/array'
import {clamp} from 'es-toolkit/math'

import type {
  PuppetDocument,
  PuppetEasing,
  PuppetKeyframe,
  PuppetMotion,
  PuppetTrack,
  PuppetTrackAxis,
} from '../../player/document'
import {sampleMotionVertices} from '../../player/internal/motion'
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

const COORDINATES_PER_VERTEX = 2
const TIME_EPSILON = 0.000_001

const hasSameTime = (first: number, second: number) => Math.abs(first - second) <= TIME_EPSILON

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
      track.axis === axis &&
      track.partId === target.partId &&
      track.vertexIndex === target.vertexIndex,
  )
  const nextTrack: PuppetTrack = {
    axis,
    keyframes: upsertKeyframe(
      trackIndex < 0 ? [] : (motion.tracks[trackIndex]?.keyframes ?? []),
      target.time,
      value,
    ),
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
      if (track.partId !== options.partId || track.vertexIndex !== options.vertexIndex) {
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
      if (track.partId !== options.partId || track.vertexIndex !== options.vertexIndex) {
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
