import {HDragButton} from './HDragButton'
import type {Meta, StoryObj} from 'storybook-solidjs'
import {fn} from '@storybook/test'

const meta = {
  argTypes: {
    dragEndSize: {
      control: {type: 'number'},
      defaultValue: 100,
      description: '드래그 가능한 최대 거리',
    },
    dragExecuteSize: {
      control: {type: 'number'},
      defaultValue: 50,
      description: '드래그 실행 거리',
    },
    dragLeftChildren: {
      control: {type: 'text'},
      description: '왼쪽으로 드래그 시 보여질 컨텐츠',
    },
    onLeftExecute: {
      action: '왼쪽으로 드래그 실행',
    },
    onRightExecute: {
      action: '오른쪽으로 드래그 실행',
    },
  },
  args: {
    class: 'ml-50 w-100px h-50px bg-red-500',
    containerClass: 'w-full h-80% bg-blue-500 c-white',
    dragEndSize: 50,
    dragExecuteSize: 50,
    dragLeftChildren: <div class="w-full h-full bg-green-500 c-white">왼쪽 실행</div>,
    dragRightChildren: <div class="w-full h-full bg-purple-500 c-white">오른쪽 실행</div>,
    onLeftExecute: fn(),
    onRightExecute: fn(),
  },
  component: HDragButton,
  parameters: {
    backgrounds: {
      default: 'white',
    },
  },
  title: 'Solid/Components/DragButton/HDragButton',
} satisfies Meta<typeof HDragButton>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    children: '드래그 버튼',
  },
}

export const WithLeftDragOnly: Story = {
  args: {
    children: '왼쪽으로 드래그',
    dragLeftChildren: '실행하기',
    onLeftExecute: fn(),
    onRightExecute: undefined,
  },
}

export const WithRightDragOnly: Story = {
  args: {
    children: '오른쪽 드래그',
    dragLeftChildren: '왼쪽 실행',
    onLeftExecute: undefined,
    onRightExecute: fn(),
  },
}
