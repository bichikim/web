import type {Meta, StoryObj} from 'storybook-solidjs-vite'
import {type SpatialNeighborBoxItem, SpatialNeighborFocusGroup} from './SpatialNeighborFocusGroup'

const gridBoxes: readonly SpatialNeighborBoxItem[] = [
  {h: 56, id: 'A', w: 96, x: 32, y: 32},
  {h: 56, id: 'B', w: 96, x: 176, y: 32},
  {h: 56, id: 'C', w: 96, x: 320, y: 32},
  {h: 56, id: 'D', w: 96, x: 32, y: 128},
  {h: 56, id: 'E', w: 96, x: 176, y: 128},
  {h: 56, id: 'F', w: 96, x: 320, y: 128},
  {h: 56, id: 'G', w: 96, x: 32, y: 224},
  {h: 56, id: 'H', w: 96, x: 176, y: 224},
  {h: 56, id: 'I', w: 96, x: 320, y: 224},
]

const staggeredBoxes: readonly SpatialNeighborBoxItem[] = [
  {h: 48, id: '1', w: 80, x: 40, y: 40},
  {h: 48, id: '2', w: 80, x: 200, y: 72},
  {h: 48, id: '3', w: 80, x: 120, y: 160},
  {h: 48, id: '4', w: 80, x: 300, y: 200},
]

export interface SpatialNeighborFocusStoryProps {
  readonly boxes: readonly SpatialNeighborBoxItem[]
  readonly initialFocusedId: string
  readonly requireOverlap: boolean
}

const SpatialNeighborFocusDemo = (props: SpatialNeighborFocusStoryProps) => {
  return (
    <div class=":uno: flex flex-col gap-12px">
      <SpatialNeighborFocusGroup
        boxes={props.boxes}
        initialFocusedId={props.initialFocusedId}
        neighborOptions={{requireOverlap: props.requireOverlap}}
      />
      <p class=":uno: m-0 text-13px text-#475569">
        영역을 클릭한 뒤 화살표 키로 포커스를 이동하세요. 파란 테두리가 현재 포커스된 박스입니다.
      </p>
    </div>
  )
}

const meta = {
  args: {
    boxes: gridBoxes,
    initialFocusedId: 'E',
    requireOverlap: true,
  },
  argTypes: {
    boxes: {control: false, table: {disable: true}},
    initialFocusedId: {
      control: 'select',
      options: gridBoxes.map((box) => box.id),
      table: {category: 'Props'},
    },
    requireOverlap: {
      control: 'boolean',
      table: {category: 'Props'},
    },
  },
  component: SpatialNeighborFocusDemo,
  parameters: {
    layout: 'centered',
  },
  title: 'Utils/SpatialNeighbor/SpatialNeighborFocus',
} satisfies Meta<typeof SpatialNeighborFocusDemo>

export default meta
type Story = StoryObj<typeof meta>

export const Grid: Story = {}

export const StaggeredLayout: Story = {
  args: {
    boxes: staggeredBoxes,
    initialFocusedId: '1',
    requireOverlap: false,
  },
  argTypes: {
    initialFocusedId: {
      control: 'select',
      options: staggeredBoxes.map((box) => box.id),
    },
  },
}
