import {Meta, StoryObj} from 'storybook-solidjs'
import {DragButton, DragButtonRootProps} from './'
import {fn} from '@storybook/test'

const Template = (props: DragButtonRootProps) => {
  return (
    <DragButton.Root dragEndSize={50} dragExecuteSize={50} {...props}>
      <DragButton.Body class="relative ml-50 w-100px h-50px bg-red-500">
        <DragButton.Aside
          position="left"
          component="span"
          class="h-80% block w-var-drag-x h-full absolute left-0 top-0 bg-green-500 overflow-hidden"
        >
          왼쪽으로 드래그 실행
        </DragButton.Aside>
        <DragButton.Content
          component="span"
          class="block w-full h-full absolute bg-yellow-500 left-var-drag-x top-0"
        >
          드래그버튼
        </DragButton.Content>
        <DragButton.Aside
          position="right"
          component="span"
          class="h-80% block w-var-drag-x h-full absolute right-0 top-0 bg-blue-500 overflow-hidden"
        >
          오른쪽으로 드래그 실행
        </DragButton.Aside>
      </DragButton.Body>
    </DragButton.Root>
  )
}

const meta = {
  argTypes: {
    allowBottom: {
      control: 'boolean',
      description: '아래쪽 드래그 실행 허용',
    },
    allowTop: {
      control: 'boolean',
      description: '위쪽 드래그 실행 허용',
    },
    onClick: {
      action: 'clicked',
    },
    onLeftExecute: {
      action: 'leftExecute',
    },
    onRightExecute: {
      action: 'rightExecute',
    },
    preventLeft: {
      control: 'boolean',
      description: '왼쪽 드래그 실행 방지',
    },
    preventRight: {
      control: 'boolean',
      description: '오른쪽 드래그 실행 방지',
    },
  },
  args: {
    onClick: fn(),
    onDoubleClick: fn(),
    onLeftExecute: fn(),
    onRightExecute: fn(),
  },
  component: Template,
  title: 'Solid/Components/DragButton',
} satisfies Meta<typeof Template>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const OnlyLeft: Story = {
  args: {
    preventRight: true,
  },
}
