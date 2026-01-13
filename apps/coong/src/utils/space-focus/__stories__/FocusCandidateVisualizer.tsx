/* eslint-disable no-magic-numbers */
import {cva} from 'class-variance-authority'
import {type Component, createMemo, createSignal, For, mergeProps, splitProps} from 'solid-js'
import {type Direction, type FocusRect} from '../focus-store'
import {filterCandidates, moveFocus, scoreAngleCandidate} from '../focus-candidate'

const BOX_SIZE = 50

const createRect = (id: string, x: number, y: number, color: string): FocusRect => {
  return {
    children: new Set(),
    getRect: () => ({
      bottom: y + BOX_SIZE,
      cx: x + BOX_SIZE / 2,
      cy: y + BOX_SIZE / 2,
      left: x,
      right: x + BOX_SIZE,
      top: y,
    }),
    id,
    isDirty: false,
    isInactive: false,
    parent: null,
    rect: {
      bottom: y + BOX_SIZE,
      cx: x + BOX_SIZE / 2,
      cy: y + BOX_SIZE / 2,
      left: x,
      right: x + BOX_SIZE,
      top: y,
    },
  }
}

export interface DraggableBoxProps {
  color: string
  isFrom?: boolean
  isTarget?: boolean
  onDrag: (x: number, y: number) => void
  rect: FocusRect
  score?: number
}

const draggableBoxBase = `:uno:
items-center cursor-move flex flex-col text-[10px] absolute justify-center
`

const draggableBoxStyles = cva(draggableBoxBase, {
  defaultVariants: {
    isFrom: false,
    isTarget: false,
  },
  variants: {
    isFrom: {
      false: 'z-1',
      true: 'z-10',
    },
    isTarget: {
      false: 'b-1 b-solid b-black',
      true: 'b-4 b-solid b-red',
    },
  },
})

const DraggableBox: Component<DraggableBoxProps> = (props) => {
  const propsWithDefaults = mergeProps({isFrom: false, isTarget: false}, props)

  const [innerProps] = splitProps(propsWithDefaults, ['color', 'isFrom', 'isTarget', 'onDrag', 'rect', 'score'])

  let ref: HTMLDivElement | undefined
  const [isDragging, setIsDragging] = createSignal(false)

  const handleMouseDown = (event: MouseEvent) => {
    setIsDragging(true)
    const startX = event.clientX
    const startY = event.clientY
    const startLeft = innerProps.rect?.rect?.left ?? 0
    const startTop = innerProps.rect?.rect?.top ?? 0

    const handleMouseMove = (event: MouseEvent) => {
      const dx = event.clientX - startX
      const dy = event.clientY - startY

      innerProps.onDrag(startLeft + dx, startTop + dy)
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  const boxClass = createMemo(() =>
    draggableBoxStyles({
      isFrom: innerProps.isFrom,
      isTarget: innerProps.isTarget,
    }),
  )

  return (
    <div
      ref={ref}
      class={boxClass()}
      onMouseDown={handleMouseDown}
      style={{
        'background-color': innerProps.color,
        height: `${BOX_SIZE}px`,
        left: `${innerProps.rect?.rect?.left ?? 0}px`,
        top: `${innerProps.rect?.rect?.top ?? 0}px`,
        width: `${BOX_SIZE}px`,
      }}
    >
      <div>{innerProps.rect.id}</div>
      {innerProps.score !== undefined && <div>{innerProps.score.toFixed(0)}</div>}
    </div>
  )
}

export const FocusCandidateVisualizer: Component = () => {
  const [fromRect, setFromRect] = createSignal<FocusRect>(createRect('FROM', 100, 100, 'lightblue'))

  const [candidates, setCandidates] = createSignal<FocusRect[]>([
    createRect('A', 200, 100, 'lightgreen'),
    createRect('B', 100, 200, 'lightgreen'),
    createRect('C', 200, 200, 'lightgreen'),
    createRect('D', 50, 50, 'lightgreen'),
  ])
  const [direction, setDirection] = createSignal<Direction>('right')

  const updateFromRect = (x: number, y: number) => {
    setFromRect((prev) => ({
      ...prev,
      rect: {
        bottom: y + BOX_SIZE,
        cx: x + BOX_SIZE / 2,
        cy: y + BOX_SIZE / 2,
        left: x,
        right: x + BOX_SIZE,
        top: y,
      },
    }))
  }

  const updateCandidate = (index: number, x: number, y: number) => {
    setCandidates((prev) => {
      const next = [...prev]

      next[index] = {
        ...next[index],
        rect: {
          bottom: y + BOX_SIZE,
          cx: x + BOX_SIZE / 2,
          cy: y + BOX_SIZE / 2,
          left: x,
          right: x + BOX_SIZE,
          top: y,
        },
      }

      return next
    })
  }

  const filteredCandidates = createMemo(() => {
    return filterCandidates(fromRect(), candidates(), direction())
  })

  const target = createMemo(() => {
    return moveFocus(fromRect(), candidates(), direction())
  })

  const scores = createMemo(() => {
    const scores: Record<string, number> = {}

    for (const candidate of candidates()) {
      scores[candidate.id] = scoreAngleCandidate(fromRect(), candidate, direction(), 0.5)
    }

    return scores
  })

  return (
    <div class=":uno: p-20px">
      <div class=":uno: mb-10px">
        <label>Direction: </label>
        <select value={direction()} onChange={(event) => setDirection(event.currentTarget.value as Direction)}>
          <option value="up">Up</option>
          <option value="down">Down</option>
          <option value="left">Left</option>
          <option value="right">Right</option>
        </select>
      </div>
      <div class=":uno: b-1 b-solid b-#ccc h-500px overflow-hidden relative w-500px">
        <DraggableBox rect={fromRect()} color="lightblue" isFrom onDrag={updateFromRect} />
        <For each={candidates()}>
          {(candidate, index) => (
            <DraggableBox
              rect={candidate}
              color={filteredCandidates().includes(candidate) ? 'lightgreen' : '#eee'}
              onDrag={(x, y) => updateCandidate(index(), x, y)}
              score={scores()[candidate.id]}
              isTarget={target() === candidate}
            />
          )}
        </For>
      </div>
      <div class=":uno: mt-10px">
        <p>Blue: From (Drag me)</p>
        <p>Green: Candidate (Passed filter)</p>
        <p>Grey: Ignored (Failed filter)</p>
        <p>Red Border: Best Candidate (moveFocus result)</p>
        <p>Number: Score (Higher is better)</p>
      </div>
    </div>
  )
}
