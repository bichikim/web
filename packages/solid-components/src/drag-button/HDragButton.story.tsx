import {HDragButton, HDragButtonProps} from './HDragButton'
import type {Meta, StoryObj} from 'storybook-solidjs'
import {fn} from '@storybook/test'
import {DragButtonAside} from './DragButtonAside'
import {DragButtonContent} from './DragButtonContent'

const Template = (args: HDragButtonProps) => {
  return (
    <HDragButton {...args} class="relative ml-50 w-100px h-50px bg-red-500">
      <DragButtonAside
        position="left"
        component="span"
        class="h-80% bg-green-500 c-white block absolute left-0 top-0 overflow-hidden w-var-drag-x"
      >
        왼쪽으로 드래그 실행
      </DragButtonAside>
      <DragButtonContent
        component="span"
        class=" bg-yellow-500 c-white block absolute top-0 left-var-drag-x w-full h-full"
      >
        드레그버튼
      </DragButtonContent>
      <DragButtonAside
        position="right"
        component="span"
        class="h-80% bg-blue-500 c-white block absolute right-0 top-0 overflow-hidden w-var-drag-x"
      >
        오른쪽으로 드래그 실행
      </DragButtonAside>
    </HDragButton>
  )
}

const meta = {
  argTypes: {
    dragEndSize: {
      control: {type: 'number'},
      description: '드래그 가능한 최대 거리',
    },
    dragExecuteSize: {
      control: {type: 'number'},
      description: '드래그 실행 거리',
    },
    onLeftExecute: {
      action: '왼쪽으로 드래그 실행',
    },
    onRightExecute: {
      action: '오른쪽으로 드래그 실행',
    },
  },
  args: {
    dragEndSize: 50,
    dragExecuteSize: 50,
    onLeftExecute: fn(),
    onRightExecute: fn(),
  },
  component: Template,
  parameters: {
    backgrounds: {
      default: 'white',
    },
  },
  title: 'Solid/Components/DragButton/HDragButton',
} satisfies Meta<typeof Template>

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
