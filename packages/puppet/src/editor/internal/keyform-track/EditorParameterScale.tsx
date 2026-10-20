import {For} from 'solid-js'
import type {PuppetParameter} from '../../../player/document'
import {getParameterProgress} from '../parameter-value'

export interface EditorParameterScaleProps {
  /** 2D 격자에서는 x를 아래쪽, y를 왼쪽에 배치한다. 생략하면 1D 트랙에 표시한다. */
  readonly axis?: 'x' | 'y'
  /** 표시할 범위. */
  readonly parameter: PuppetParameter
  /** 기준 숫자와 충분히 떨어져 있으면 함께 표시할 키폼 값. 생략하면 기준 숫자만 표시한다. */
  readonly occupiedValues?: ReadonlyArray<number>
}

const SCALE_SEGMENTS = 4
const TICK_INTERVAL = 12.5

/** 범위를 4등분한 다섯 숫자는 항상 표시하고 가까운 키폼 값과의 중복을 피한다. */
export const EditorParameterScale = (props: EditorParameterScaleProps) => {
  const values = () => {
    const parameter = props.parameter
    const anchors = Array.from(
      {length: SCALE_SEGMENTS + 1},
      (_, index) =>
        parameter.minimum + ((parameter.maximum - parameter.minimum) * index) / SCALE_SEGMENTS,
    )
    const additional = (props.occupiedValues ?? []).filter((value) =>
      anchors.every(
        (anchor) =>
          Math.abs(
            getParameterProgress(parameter, value) - getParameterProgress(parameter, anchor),
          ) >= TICK_INTERVAL,
      ),
    )
    return [...anchors, ...additional].toSorted((first, second) => first - second)
  }
  return (
    <div
      class="parameter-track-scale"
      classList={{
        'parameter-grid-scale-x': props.axis === 'x',
        'parameter-grid-scale-y': props.axis === 'y',
      }}
      aria-hidden="true"
    >
      <For each={values()}>
        {(value) => (
          <span style={{'--scale-progress': `${getParameterProgress(props.parameter, value)}%`}}>
            {value}
          </span>
        )}
      </For>
    </div>
  )
}
