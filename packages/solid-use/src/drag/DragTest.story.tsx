import type {Meta, StoryObj} from 'storybook-solidjs-vite'
import {createSignal, createMemo, Show} from 'solid-js'
import {useDrag, type DragPayload} from './'

const DragTestComponent = () => {
  const [parentElement, setParentElement] = createSignal<HTMLElement | null>(null)
  const [dragElement, setDragElement] = createSignal<HTMLElement | null>(null)
  const [drag, setDrag] = createSignal<DragPayload | null>(null)
  const [isDragging, setIsDragging] = createSignal(false)

  useDrag(
    dragElement,
    (type, payload) => {
      setDrag(payload)
      setIsDragging(type !== 'end')
    },
    parentElement,
  )

  const currentPosition = createMemo(() => {
    const {currentPoint, relativePoint} = drag() ?? {}

    const _currentPoint = currentPoint ?? {x: 0, y: 0}
    const _relativePoint = relativePoint ?? {x: 0, y: 0}

    return {
      x: _currentPoint.x - _relativePoint.x,
      y: _currentPoint.y - _relativePoint.y,
    }
  })

  return (
    <div ref={setParentElement} class="relative w-100 h-96 bg-gray-100 border-2 border-dashed border-gray-300 p-4">
      <div class="mb-4 p-3 bg-white rounded shadow">
        <h3 class="text-lg font-semibold mb-2">Drag Test Component</h3>
        <div class="space-y-2 text-sm">
          <div>
            Start X: <span class="font-mono">{drag()?.startPoint.x}px</span>
          </div>
          <div>
            Start Y: <span class="font-mono">{drag()?.startPoint.y}px</span>
          </div>
          <div>
            Dragging: <span class="font-mono">{isDragging() ? 'Yes' : 'No'}</span>
          </div>
          <div>
            Position X: <span class="font-mono">{drag()?.currentPoint.x}px</span>
          </div>
          <div>
            Position Y: <span class="font-mono">{drag()?.currentPoint.y}px</span>
          </div>
          <div>
            Relative X: <span class="font-mono">{drag()?.relativePoint.x}px</span>
          </div>
          <div>
            Relative Y: <span class="font-mono">{drag()?.relativePoint.y}px</span>
          </div>
        </div>
      </div>

      <div
        ref={setDragElement}
        class="w-24 h-24 bg-blue-500 rounded-lg shadow-lg cursor-grab select-none absolute"
        style={{
          cursor: isDragging() ? 'grabbing' : 'grab',
          left: `${currentPosition().x}px`,
          top: `${currentPosition().y}px`,
          transition: isDragging() ? 'none' : 'transform 0.1s ease-out',
          'will-change': isDragging() ? 'transform' : 'auto',
        }}
      >
        <div class="flex items-center justify-center h-full text-white font-bold">DRAG</div>
      </div>
    </div>
  )
}

const meta = {
  component: DragTestComponent,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  title: 'Solid/Use/useDrag',
} satisfies Meta<typeof DragTestComponent>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {},
}

export const WithInstructions: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story:
          '이 컴포넌트는 useDrag 훅을 테스트합니다. 파란색 박스를 마우스로 드래그해보세요. 드래그 상태와 위치 정보가 실시간으로 표시됩니다.',
      },
    },
  },
}
