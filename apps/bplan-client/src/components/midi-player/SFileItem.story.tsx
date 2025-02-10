import type {Meta, StoryObj} from 'storybook-solidjs'
import {fn} from '@storybook/test'
import {SFileItem} from './SFileItem'

const meta = {
  argTypes: {
    ext: {
      control: 'text',
      description: '확장자',
      table: {
        category: 'Props',
        defaultValue: {summary: ''},
      },
    },
    name: {
      control: 'text',
      description: '이름',
      table: {
        category: 'Props',
        defaultValue: {summary: ''},
      },
    },
    onDelete: {
      description: '삭제 이벤트 핸들러',
      table: {
        category: 'Events',
        defaultValue: {summary: 'undefined'},
      },
    },
    onPlay: {
      description: '재생 이벤트 핸들러',
      table: {
        category: 'Events',
        defaultValue: {summary: 'undefined'},
      },
    },
    playing: {
      control: 'boolean',
      description: '재생 상태',
      table: {
        category: 'Props',
        defaultValue: {summary: 'false'},
      },
    },
    selected: {
      control: 'boolean',
      description: '선택 상태',
      table: {
        category: 'Props',
        defaultValue: {summary: 'false'},
      },
    },
  },
  args: {
    onDelete: fn(),
    onPlay: fn(),
  },
  component: SFileItem,
  parameters: {
    backgrounds: {
      default: 'white',
    },
  },
  title: 'BPlan/Components/MidiPlayer/SFileItem',
} satisfies Meta<typeof SFileItem>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    class: 'w-300px',
    ext: 'midi',
    index: 0,
    name: '정지 아이템',
    playedTime: 0,
    playing: false,
    totalDuration: 100,
  },
}

export const DragExecute: Story = {
  args: {
    class: 'w-300px',
    dragEndSize: 90,
    dragExecuteSize: 90,
    ext: 'midi',
    index: 0,
    name: '정지 아이템',
    playedTime: 0,
    playing: false,
    totalDuration: 100,
  },
}

export const Playing: Story = {
  args: {
    class: 'w-300px',
    ext: 'midi',
    index: 1,
    name: '재생 중 아이템',
    playedTime: 50,
    playing: true,
    totalDuration: 100,
  },
}

export const ShouldConvert: Story = {
  args: {
    class: 'w-300px',
    ext: 'mp3',
    index: 1,
    name: '재생 중 아이템',
    playedTime: 0,
    playing: false,
    totalDuration: 100,
  },
}
