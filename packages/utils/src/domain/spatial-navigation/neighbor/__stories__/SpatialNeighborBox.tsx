import {type Component, createMemo, mergeProps} from 'solid-js'
import type {Box} from '../types'

export interface SpatialNeighborBoxProps extends Box {
  readonly focused: boolean
  readonly id: string
}

const focusedBoxClass = [
  ':uno: absolute b-3 b-solid b-#2563eb bg-#dbeafe flex font-medium',
  'items-center justify-center rounded-4px select-none shadow-md',
  'text-#1e3a8a text-12px z-1',
].join(' ')
const unfocusedBoxClass = [
  ':uno: absolute b-1 b-solid b-#94a3b8 bg-#e2e8f0 flex font-medium',
  'items-center justify-center rounded-4px select-none text-#334155 text-12px',
].join(' ')

export const SpatialNeighborBox: Component<SpatialNeighborBoxProps> = (props) => {
  const propsWithDefaults = mergeProps({focused: false}, props)
  const boxClass = createMemo(() => {
    if (propsWithDefaults.focused) {
      return focusedBoxClass
    }

    return unfocusedBoxClass
  })

  return (
    <div
      aria-selected={propsWithDefaults.focused}
      class={boxClass()}
      data-focused={propsWithDefaults.focused}
      data-testid={`spatial-neighbor-box-${propsWithDefaults.id}`}
      style={{
        height: `${propsWithDefaults.h}px`,
        left: `${propsWithDefaults.x}px`,
        top: `${propsWithDefaults.y}px`,
        width: `${propsWithDefaults.w}px`,
      }}
    >
      {propsWithDefaults.id}
    </div>
  )
}
