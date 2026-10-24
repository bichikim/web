import {getMotionTimelineRows} from '../motion-timeline-rows'
import {
  PUPPET_EASINGS,
  PUPPET_MODEL_TRACK_TARGETS,
  PUPPET_SOUND_MEDIA_TYPES,
  type PuppetEasing,
  type PuppetKeyframe,
  type PuppetMotion,
  type PuppetParameter,
  type PuppetPart,
  type PuppetTimelineEffectRow,
  type PuppetTrack,
  type PuppetTrackAxis,
} from '../document'
import {resolveParameterValue} from '../parameter-value'
import {isOptionalFramesPerSecond} from './parse-model-metadata'
import {getGroupOpacityRowId, getModelTrackRowId} from '../timeline-rows'
import {isFiniteNumber, isRecord} from './parse-primitives'

const COORDINATES_PER_VERTEX = 2
const BEZIER_LENGTH = 4

const isTrackAxis = (value: unknown): value is PuppetTrackAxis => value === 'x' || value === 'y'

const isEasing = (value: unknown): value is PuppetEasing =>
  typeof value === 'string' && PUPPET_EASINGS.some((easing) => easing === value)

const isBezier = (value: unknown) =>
  Array.isArray(value) &&
  value.length === BEZIER_LENGTH &&
  value.every(isFiniteNumber) &&
  [value[0], value[2]].every((x: number) => x >= 0 && x <= 1)

const isKeyframe = (value: unknown): value is PuppetKeyframe =>
  isRecord(value) &&
  isFiniteNumber(value.time) &&
  value.time >= 0 &&
  isFiniteNumber(value.value) &&
  (value.easing === undefined || isEasing(value.easing)) &&
  (value.bezier === undefined || (value.easing === 'bezier' && isBezier(value.bezier)))

const isFadeTime = (value: unknown) => value === undefined || (isFiniteNumber(value) && value >= 0)

const hasValidFade = (value: Record<string, unknown>) =>
  isFadeTime(value.fadeInTime) && isFadeTime(value.fadeOutTime)

const isMotionEvent = (value: unknown, duration: number) =>
  isRecord(value) &&
  isFiniteNumber(value.time) &&
  value.time >= 0 &&
  value.time <= duration &&
  typeof value.value === 'string'

const hasOrderedKeyframes = (keyframes: ReadonlyArray<PuppetKeyframe>, duration: number) =>
  keyframes.every((keyframe, index) => {
    const previousKeyframe = keyframes[index - 1]
    const followsPrevious = previousKeyframe === undefined || keyframe.time >= previousKeyframe.time

    return followsPrevious && keyframe.time <= duration
  })

const hasValidKeyframes = (value: Record<string, unknown>, duration: number) =>
  Array.isArray(value.keyframes) &&
  value.keyframes.length > 0 &&
  value.keyframes.every(isKeyframe) &&
  hasOrderedKeyframes(value.keyframes, duration)

const hasParameterTrackTarget = (value: Record<string, unknown>) =>
  typeof value.parameterId === 'string' && value.parameterId.length > 0

const hasVertexTrackTarget = (value: Record<string, unknown>) =>
  typeof value.partId === 'string' &&
  value.partId.length > 0 &&
  isFiniteNumber(value.vertexIndex) &&
  Number.isInteger(value.vertexIndex) &&
  value.vertexIndex >= 0 &&
  isTrackAxis(value.axis)

const hasRatioKeyframes = (value: Record<string, unknown>) =>
  Array.isArray(value.keyframes) &&
  value.keyframes.every((keyframe: PuppetKeyframe) => keyframe.value >= 0 && keyframe.value <= 1)

/** Model tracks name a target; opacity and eye openness stay within 0..1. */
const isModelTrack = (value: Record<string, unknown>) =>
  PUPPET_MODEL_TRACK_TARGETS.some((target) => target === value.target) &&
  (value.target === 'lip-sync' || hasRatioKeyframes(value))

const isGroupOpacityTrack = (value: Record<string, unknown>) =>
  typeof value.groupId === 'string' && value.groupId.length > 0 && hasRatioKeyframes(value)

const isTrack = (value: unknown, duration: number): value is PuppetTrack => {
  if (!isRecord(value) || !hasValidKeyframes(value, duration) || !hasValidFade(value)) {
    return false
  }

  switch (value.kind) {
    case 'parameter':
      return hasParameterTrackTarget(value) && !hasVertexTrackTarget(value)
    case 'vertex':
      return hasVertexTrackTarget(value) && !hasParameterTrackTarget(value)
    case 'model':
      return isModelTrack(value)
    case 'group-opacity':
      return isGroupOpacityTrack(value)
    default:
      return false
  }
}

const normalizeLegacyTrack = (value: unknown): unknown => {
  if (!isRecord(value) || value.kind !== undefined) {
    return value
  }

  const hasParameterTarget = hasParameterTrackTarget(value)
  const hasVertexTarget = hasVertexTrackTarget(value)

  if (hasParameterTarget === hasVertexTarget) {
    return value
  }

  return {...value, kind: hasParameterTarget ? 'parameter' : 'vertex'}
}

export const normalizeLegacyTrackKinds = (value: unknown): unknown => {
  if (!isRecord(value) || !Array.isArray(value.motions)) {
    return value
  }

  return {
    ...value,
    motions: value.motions.map((motion) =>
      isRecord(motion) && Array.isArray(motion.tracks)
        ? {...motion, tracks: motion.tracks.map(normalizeLegacyTrack)}
        : motion,
    ),
  }
}

const isOptionalName = (value: unknown) =>
  value === undefined || (typeof value === 'string' && value.length > 0)

const DATA_URL = /^data:(?<type>[^;,]*)(?<parameters>;[^,]*)?,/u

/** A non-empty `src`; a data URL must be base64 with a WAV media type. */
const isOptionalSound = (value: unknown) => {
  if (value === undefined) {
    return true
  }
  if (
    !isRecord(value) ||
    typeof value.src !== 'string' ||
    value.src.length === 0 ||
    (value.analysis !== undefined && value.analysis !== 'rms' && value.analysis !== 'voice') ||
    (value.volume !== undefined && value.volume !== 'source' && value.volume !== 'motion')
  ) {
    return false
  }
  const match = DATA_URL.exec(value.src)
  return (
    match === null ||
    (PUPPET_SOUND_MEDIA_TYPES.some((type) => type === match.groups?.type?.toLowerCase()) &&
      match.groups?.parameters?.split(';').includes('base64') === true)
  )
}

/** Loop flag, display name, motion group and sound. */
const hasValidMotionMetadata = (value: Record<string, unknown>) =>
  (value.loop === undefined || typeof value.loop === 'boolean') &&
  isOptionalName(value.name) &&
  isOptionalName(value.group) &&
  isOptionalFramesPerSecond(value.framesPerSecond) &&
  isOptionalSound(value.sound)

/** 효과 행은 화면용 문자열 대신 실제 종류와 대상을 저장한다. */
const isTimelineEffectRow = (value: unknown): value is PuppetTimelineEffectRow =>
  isRecord(value) &&
  (value.kind === 'model'
    ? PUPPET_MODEL_TRACK_TARGETS.some((target) => target === value.target)
    : value.kind === 'group-opacity' &&
      typeof value.groupId === 'string' &&
      value.groupId.length > 0)

const hasTimelineEffects = (value: unknown) =>
  value === undefined ||
  (Array.isArray(value) &&
    value.every(isTimelineEffectRow) &&
    new Set(
      value.map((row) =>
        row.kind === 'model' ? `model:${row.target}` : `group-opacity:${row.groupId}`,
      ),
    ).size === value.length)

export const isMotion = (value: unknown): value is PuppetMotion => {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    value.id.length === 0 ||
    !isFiniteNumber(value.duration) ||
    value.duration <= 0 ||
    (value.timelineParameterIds !== undefined &&
      (!Array.isArray(value.timelineParameterIds) ||
        !value.timelineParameterIds.every((id) => typeof id === 'string') ||
        new Set(value.timelineParameterIds).size !== value.timelineParameterIds.length)) ||
    !hasTimelineEffects(value.timelineEffectRows) ||
    !Array.isArray(value.tracks) ||
    !hasValidFade(value) ||
    !hasValidMotionMetadata(value)
  ) {
    return false
  }

  const {duration} = value

  return (
    value.tracks.every((track) => isTrack(track, duration)) &&
    (value.events === undefined ||
      (Array.isArray(value.events) &&
        value.events.every((event) => isMotionEvent(event, duration))))
  )
}

const isUnique = (keys: ReadonlyArray<string>) => new Set(keys).size === keys.length

/** One track per parameter, model target and group in each motion. */
const hasUniqueTrackTargets = (motion: PuppetMotion) =>
  (['parameter', 'model', 'group-opacity'] as const).every((kind) =>
    isUnique(
      motion.tracks.flatMap((track) => {
        if (track.kind !== kind) {
          return []
        }
        switch (track.kind) {
          case 'parameter':
            return [track.parameterId]
          case 'model':
            return [track.target]
          case 'group-opacity':
            return [track.groupId]
          default:
            return []
        }
      }),
    ),
  )

interface TrackTargets {
  readonly groupIds: ReadonlySet<string>
  readonly parameters: ReadonlyMap<string, PuppetParameter>
  readonly parts: ReadonlyMap<string, PuppetPart>
}

/**
 * 키프레임은 범위·선택지 안의 값만 허용한다. 반복 파라미터는 최댓값이 최솟값으로 감싸지지만,
 * 0→360 같은 한 바퀴를 그릴 수 있도록 최댓값도 허용한다(보간 뒤에 감싼다). 범위를 넘는 값은
 * 반복을 끄면 문서가 깨지고 에디터가 범위 안으로만 다루므로 받지 않는다.
 */
const isParameterKeyframeValue = (parameter: PuppetParameter, value: number) =>
  parameter.repeat === true
    ? value >= parameter.minimum && value <= parameter.maximum
    : resolveParameterValue(parameter, value) === value

const hasTrackTarget = (track: PuppetTrack, targets: TrackTargets) => {
  switch (track.kind) {
    case 'parameter': {
      const parameter = targets.parameters.get(track.parameterId)
      return (
        parameter !== undefined &&
        track.keyframes.every((keyframe) => isParameterKeyframeValue(parameter, keyframe.value))
      )
    }
    case 'vertex': {
      const part = targets.parts.get(track.partId)
      const vertexCount =
        part === undefined ? 0 : part.mesh.vertices.length / COORDINATES_PER_VERTEX
      return (
        part !== undefined &&
        Number.isInteger(track.vertexIndex) &&
        track.vertexIndex >= 0 &&
        track.vertexIndex < vertexCount
      )
    }
    case 'group-opacity':
      return targets.groupIds.has(track.groupId)
    case 'model':
      return true
    default: {
      const exhaustive: never = track
      return exhaustive
    }
  }
}

/** A parameter, model target or existing group row (see `timeline-rows.ts`). */
const isTimelineRow = (id: string, targets: TrackTargets) =>
  targets.parameters.has(id) ||
  PUPPET_MODEL_TRACK_TARGETS.some((target) => getModelTrackRowId(target) === id) ||
  [...targets.groupIds].some((groupId) => getGroupOpacityRowId(groupId) === id)

export const hasValidTrackTargets = (
  parts: ReadonlyArray<PuppetPart>,
  parameters: ReadonlyArray<PuppetParameter>,
  motions: ReadonlyArray<PuppetMotion>,
  groupIds: ReadonlySet<string>,
) => {
  const targets: TrackTargets = {
    groupIds,
    parameters: new Map(parameters.map((parameter) => [parameter.id, parameter])),
    parts: new Map(parts.map((part) => [part.id, part])),
  }
  return motions.every((motion) => {
    const {effectRows} = getMotionTimelineRows({parameters}, motion)
    return (
      hasUniqueTrackTargets(motion) &&
      effectRows.every((row) => row.kind === 'model' || targets.groupIds.has(row.groupId)) &&
      isUnique(
        effectRows.map((row) =>
          row.kind === 'model' ? getModelTrackRowId(row.target) : getGroupOpacityRowId(row.groupId),
        ),
      ) &&
      (motion.timelineParameterIds ?? []).every((id) => isTimelineRow(id, targets)) &&
      motion.tracks.every((track) => hasTrackTarget(track, targets))
    )
  })
}
