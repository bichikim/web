import type {Meta, StoryObj} from 'storybook-solidjs'
import {createSignal, Show} from 'solid-js'
import {useDrag} from './index'

const DragTestComponent = () => {
  const [dragElement, setDragElement] = createSignal<HTMLElement | null>(null)
  const drag = useDrag(dragElement)

  return (
    <div class="relative w-full h-96 bg-gray-100 border-2 border-dashed border-gray-300 p-4">
      <div class="mb-4 p-3 bg-white rounded shadow">
        <h3 class="text-lg font-semibold mb-2">Drag Test Component</h3>
        <div class="space-y-2 text-sm">
          <div>
            Dragging: <span class="font-mono">{drag.isDragging() ? 'Yes' : 'No'}</span>
          </div>
          <div>
            Position X: <span class="font-mono">{drag.position().x.toFixed(1)}px</span>
          </div>
          <div>
            Position Y: <span class="font-mono">{drag.position().y.toFixed(1)}px</span>
          </div>
        </div>
      </div>

      <div
        ref={setDragElement}
        class="w-24 h-24 bg-blue-500 rounded-lg shadow-lg cursor-grab select-none absolute"
        style={{
          cursor: drag.isDragging() ? 'grabbing' : 'grab',
          transform: `translate3d(${drag.position().x}px, ${drag.position().y}px, 0)`,
          transition: drag.isDragging() ? 'none' : 'transform 0.1s ease-out',
          'will-change': drag.isDragging() ? 'transform' : 'auto',
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
  title: 'Hooks/useDrag',
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
