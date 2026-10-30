import {projectVolumePoint, VOLUME_PROJECTION} from './volume-projection'
import {For} from 'solid-js'
import type {PuppetParameter} from '../../../player/document'
import {getParameterProgress} from '../parameter-value'
import type {KeyformVolumeSource} from './keyform-volume'
import {KeyformVolumeAxisScale} from './KeyformVolumeAxisScale'

export interface EditorKeyformVolumeSpaceProps {
  /** 각 축의 표시 범위를 정의하는 첫째·둘째 파라미터. */
  readonly parameters: ReadonlyArray<PuppetParameter>
  /** 전체 키폼과 현재 Z 단면. */
  readonly source: KeyformVolumeSource
}

const corners = [
  [0, 0, 0],
  [1, 0, 0],
  [0, 1, 0],
  [1, 1, 0],
  [0, 0, 1],
  [1, 0, 1],
  [0, 1, 1],
  [1, 1, 1],
] as const

const edges = corners.flatMap((from, index) =>
  corners.slice(index + 1).flatMap((to) =>
    from.filter((value, axis) => value !== to[axis]).length === 1
      ? [
          {
            from: projectVolumePoint(from[0], from[1], from[2]),
            to: projectVolumePoint(to[0], to[1], to[2]),
          },
        ]
      : [],
  ),
)

/** 다른 단면은 배경으로, 현재 Z 단면은 편집 가능한 면으로 표시한다. */
export const EditorKeyformVolumeSpace = (props: EditorKeyformVolumeSpaceProps) => {
  const depth = () =>
    getParameterProgress(props.source.parameter, props.source.value) / VOLUME_PROJECTION.percent
  const plane = () =>
    [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ]
      .map(([x = 0, y = 0]) => projectVolumePoint(x, y, depth()).join(','))
      .join(' ')
  const points = () =>
    props.source.binding.keyforms.filter((keyform) => keyform.values[2] !== props.source.value)
  const position = (values: ReadonlyArray<number>) =>
    projectVolumePoint(
      props.parameters[0] === undefined
        ? 0
        : getParameterProgress(props.parameters[0], values[0] ?? 0) / VOLUME_PROJECTION.percent,
      props.parameters[1] === undefined
        ? 0
        : getParameterProgress(props.parameters[1], values[1] ?? 0) / VOLUME_PROJECTION.percent,
      getParameterProgress(props.source.parameter, values[2] ?? 0) / VOLUME_PROJECTION.percent,
    )
  return (
    <svg
      class="parameter-volume-space"
      viewBox={`0 0 ${VOLUME_PROJECTION.viewportWidth} ${VOLUME_PROJECTION.viewportHeight}`}
      aria-hidden="true"
    >
      <For each={edges}>
        {(edge) => <line x1={edge.from[0]} y1={edge.from[1]} x2={edge.to[0]} y2={edge.to[1]} />}
      </For>
      <For each={points()}>
        {(keyform) => (
          <circle cx={position(keyform.values)[0]} cy={position(keyform.values)[1]} r="1.6" />
        )}
      </For>
      <polygon points={plane()} />
      <For each={props.parameters.slice(0, 2)}>
        {(parameter, index) => (
          <KeyformVolumeAxisScale axis={index() === 0 ? 'x' : 'y'} parameter={parameter} />
        )}
      </For>
      <KeyformVolumeAxisScale axis="z" parameter={props.source.parameter} />
      <text x="168" y="138">
        X
      </text>
      <text x="8" y="24">
        Y
      </text>
      <text x="246" y="85">
        Z
      </text>
    </svg>
  )
}
