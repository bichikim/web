import {
  PUPPET_MODEL_TRACK_TARGETS,
  type PuppetDocument,
  type PuppetMotion,
  type PuppetTimelineEffectRow,
} from './document'
import {
  createRowTrack,
  getGroupOpacityRowId,
  getModelTrackRowId,
  getRowGroupId,
} from './timeline-rows'

interface MotionTimelineRows {
  readonly effectRows: ReadonlyArray<PuppetTimelineEffectRow>
  readonly parameterIds: ReadonlyArray<string>
}

/** 기존 문자열 행은 실제 파라미터를 우선한다. 효과 트랙 자체의 종류와 값은 변경하지 않는다. */
export const getMotionTimelineRows = (
  document: Pick<PuppetDocument, 'parameters'>,
  motion: PuppetMotion,
): MotionTimelineRows => {
  const parameterIds = new Set(document.parameters?.map((parameter) => parameter.id))
  const legacyEffects = (motion.timelineParameterIds ?? []).flatMap<PuppetTimelineEffectRow>(
    (id) => {
      if (parameterIds.has(id)) {
        return []
      }
      const target = PUPPET_MODEL_TRACK_TARGETS.find((value) => getModelTrackRowId(value) === id)
      if (target !== undefined) {
        return [{kind: 'model', target}]
      }
      const groupId = getRowGroupId(id)
      return groupId === undefined ? [] : [{groupId, kind: 'group-opacity'}]
    },
  )
  return {
    effectRows: [...(motion.timelineEffectRows ?? []), ...legacyEffects],
    parameterIds: (motion.timelineParameterIds ?? []).filter((id) => parameterIds.has(id)),
  }
}

/** 저장된 파라미터·효과 행을 현재 문서에서 중복되지 않는 화면용 ID로 변환한다. */
export const getTimelineRowIds = (
  document: PuppetDocument,
  motion: PuppetMotion,
): ReadonlyArray<string> => {
  const rows = getMotionTimelineRows(document, motion)
  return [
    ...rows.parameterIds,
    ...rows.effectRows.map((row) =>
      row.kind === 'model'
        ? getModelTrackRowId(row.target, document)
        : getGroupOpacityRowId(row.groupId, document),
    ),
  ]
}

/** 화면용 ID를 저장할 때 파라미터 ID와 효과 대상을 분리해 문자열 충돌을 없앤다. */
export const withTimelineRowIds = (
  document: PuppetDocument,
  motion: PuppetMotion,
  rowIds: ReadonlyArray<string>,
): PuppetMotion => {
  const tracks = rowIds.map((id) => createRowTrack(id, [], document))
  const effects = tracks.flatMap<PuppetTimelineEffectRow>((track) => {
    switch (track.kind) {
      case 'model':
        return [{kind: 'model', target: track.target}]
      case 'group-opacity':
        return [{groupId: track.groupId, kind: 'group-opacity'}]
      case 'parameter':
      case 'vertex':
        return []
      default: {
        const exhaustive: never = track
        return exhaustive
      }
    }
  })
  return {
    ...motion,
    ...(effects.length === 0 && motion.timelineEffectRows === undefined
      ? {}
      : {timelineEffectRows: effects}),
    timelineParameterIds: tracks.flatMap((track) =>
      track.kind === 'parameter' ? [track.parameterId] : [],
    ),
  }
}
