import {getKeyformPlanes, type KeyformPlane} from '../../../deformation'
import type {
  PuppetParameter,
  PuppetParameterBinding1D,
  PuppetParameterBinding2D,
  PuppetParameterBinding3D,
} from '../../../player/document'

/** 3차원 바인딩의 현재 XY 단면과 키폼이 존재하는 Z 평면 목록. */
export interface KeyformVolumeViews {
  /** 키폼이 하나 이상 존재하는 Z마다 하나의 평면 표시를 제공한다. */
  readonly depth: PuppetParameterBinding1D
  readonly planes: ReadonlyArray<KeyformPlane>
  readonly slice: PuppetParameterBinding2D
}

export const getKeyformVolumeViews = (
  binding: PuppetParameterBinding3D,
  value: number = 0,
): KeyformVolumeViews => {
  const planes = getKeyformPlanes(binding)
  return {
    depth: {
      id: binding.id,
      keyforms: planes.map((plane) => ({parts: [], values: [plane.value] as const})),
      parameterIds: [binding.parameterIds[2]],
    },
    planes,
    // 현재 Z에 존재하는 키폼만 편집 대상으로 노출한다.
    slice: planes.find((plane) => plane.value === value)?.binding ?? {
      id: binding.id,
      keyforms: [],
      parameterIds: [binding.parameterIds[0], binding.parameterIds[1]],
    },
  }
}

/** 육면체 배경과 현재 Z 단면을 표시하는 입력. */
export interface KeyformVolumeSource {
  /** 다른 Z 단면의 키폼도 포함하는 원본 바인딩. */
  readonly binding: PuppetParameterBinding3D
  /** Z 파라미터의 범위. */
  readonly parameter: PuppetParameter
  /** 표시하고 편집할 정확한 Z 값. */
  readonly value: number
}
