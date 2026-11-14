import {projectVolumePoint} from './volume-projection'
import {For} from 'solid-js'
import type {PuppetParameter} from '../../../player/document'
import {formatParameterScaleValue} from '../parameter-value'

interface KeyformVolumeAxisScaleProps {
  /** 눈금이 놓일 육면체 모서리. */
  readonly axis: 'x' | 'y' | 'z'
  /** 해당 축의 최소·최대 값. */
  readonly parameter: PuppetParameter
}

const axisScales = {
  x: {labelX: 0, labelY: 11, segments: 2, tickX: 0, tickY: 3},
  y: {labelX: -6, labelY: 2, segments: 2, tickX: -3, tickY: 0},
  z: {labelX: 8, labelY: 2, segments: 2, tickX: 2, tickY: 3},
} as const

export const KeyformVolumeAxisScale = (props: KeyformVolumeAxisScaleProps) => {
  const scale = () => axisScales[props.axis]
  const progress = () => {
    const segments = scale().segments
    return Array.from({length: segments + 1}, (_, index) => index / segments)
  }
  const position = (value: number) =>
    props.axis === 'x'
      ? projectVolumePoint(value, 0, 0)
      : props.axis === 'y'
        ? projectVolumePoint(0, value, 0)
        : projectVolumePoint(1, 0, value)
  const label = (value: number) =>
    formatParameterScaleValue(
      props.parameter.minimum + (props.parameter.maximum - props.parameter.minimum) * value,
    )
  return (
    <g class="parameter-volume-scale" classList={{'parameter-volume-scale-y': props.axis === 'y'}}>
      <For each={progress()}>
        {(value) => (
          <g transform={`translate(${position(value).join(' ')})`}>
            <line x2={scale().tickX} y2={scale().tickY} />
            <text x={scale().labelX} y={scale().labelY}>
              {label(value)}
            </text>
          </g>
        )}
      </For>
    </g>
  )
}
