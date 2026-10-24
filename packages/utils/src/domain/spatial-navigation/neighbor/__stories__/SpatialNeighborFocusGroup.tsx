import {type Component, createSignal, For, onMount} from 'solid-js'
import {findNearestInDirection} from '../find-nearest-in-direction'
import type {Box, Direction, SpatialNeighborOptions} from '../types'
import {SpatialNeighborBox} from './SpatialNeighborBox'

export interface SpatialNeighborBoxItem extends Box {
  readonly id: string
}

export interface SpatialNeighborFocusGroupProps {
  readonly boxes: readonly SpatialNeighborBoxItem[]
  readonly initialFocusedId: string
  readonly neighborOptions?: SpatialNeighborOptions
}

const directionFromKeyboardEvent = (event: KeyboardEvent): Direction | null => {
  switch (event.key) {
    case 'ArrowDown':
      return 'down'
    case 'ArrowLeft':
      return 'left'
    case 'ArrowRight':
      return 'right'
    case 'ArrowUp':
      return 'up'
    default:
      return null
  }
}

export const SpatialNeighborFocusGroup: Component<SpatialNeighborFocusGroupProps> = (props) => {
  const [focusedId, setFocusedId] = createSignal(props.initialFocusedId)
  const [containerElement, setContainerElement] = createSignal<HTMLDivElement | undefined>()

  const handleKeyDown = (event: KeyboardEvent) => {
    const direction = directionFromKeyboardEvent(event)

    if (direction === null) {
      return
    }

    event.preventDefault()

    const currentBox = props.boxes.find((box) => box.id === focusedId())

    if (currentBox === undefined) {
      return
    }

    const nextBox = findNearestInDirection(
      currentBox,
      props.boxes,
      direction,
      props.neighborOptions,
    )

    if (nextBox !== null) {
      setFocusedId(nextBox.id)
    }
  }

  onMount(() => {
    containerElement()?.focus()
  })

  return (
    <div
      ref={setContainerElement}
      aria-label="Spatial neighbor focus demo"
      class=":uno: b-1 b-dashed b-#cbd5e1 h-320px outline-none relative w-480px"
      onKeyDown={handleKeyDown}
      role="group"
      tabindex={0}
    >
      <For each={props.boxes}>
        {(box) => (
          <SpatialNeighborBox
            focused={focusedId() === box.id}
            h={box.h}
            id={box.id}
            w={box.w}
            x={box.x}
            y={box.y}
          />
        )}
      </For>
    </div>
  )
}
