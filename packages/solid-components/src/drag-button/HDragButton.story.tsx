import {HDragButton, HDragButtonProps} from './HDragButton'
import type {Meta, StoryObj} from 'storybook-solidjs-vite'
import {expect, fireEvent, fn, within} from '@storybook/test'
import {DragButtonAside} from './DragButtonAside'
import {DragButtonContent} from './DragButtonContent'

const Template = (args: HDragButtonProps) => {
  return (
    <HDragButton {...args} class="relative ml-50 w-100px h-50px bg-red-500">
      <DragButtonAside
        position="left"
        component="span"
        class="h-80% bg-green-500 c-white block absolute left-0 top-0 overflow-hidden w-[var(--solid-drag-x)]"
      >
        왼쪽으로 드래그 실행
      </DragButtonAside>
      <DragButtonContent
        component="span"
        class=" bg-yellow-500 c-white block absolute top-0 left-[var(--solid-drag-x)] w-full h-full"
      >
        {args.children}
      </DragButtonContent>
      <DragButtonAside
        position="right"
        component="span"
        class="h-80% bg-blue-500 c-white block absolute right-0 top-0 overflow-hidden w-[var(--solid-drag-x)]"
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
    onClick: fn(),
    onDoubleClick: fn(),
    onLeftExecute: fn(),
    onRightExecute: fn(),
    onTouchEnd: fn(),
    onTouchStart: fn(),
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

export const LeftDragWithMouse: Story = {
  args: {
    children: '왼쪽으로 드래그',
    dragLeftChildren: '실행하기',
    onLeftExecute: fn(),
    onRightExecute: undefined,
  },
  play: async ({canvasElement, args}) => {
    const canvas = within(canvasElement)
    const button = canvas.getByRole('button', {name: '왼쪽으로 드래그'})
    const DRAG_DISTANCE = 100

    await fireEvent.mouseDown(button)
    await fireEvent.mouseMove(button, {clientX: DRAG_DISTANCE, clientY: 0})
    await fireEvent.pointerUp(button, {clientX: DRAG_DISTANCE, clientY: 0})
    expect(args.onLeftExecute).toHaveBeenCalledTimes(1)
  },
}
export const LeftDragWithTouch: Story = {
  args: {
    children: '왼쪽으로 드래그',
    dragLeftChildren: '실행하기',
    onLeftExecute: fn(),
    onRightExecute: undefined,
  },
  play: async ({canvasElement, args}) => {
    const canvas = within(canvasElement)
    const button = canvas.getByRole('button', {name: '왼쪽으로 드래그'})
    // 왼쪽으로 드래그 테스트 - 이동 거리 상수
    const DRAG_DISTANCE = 100

    await fireEvent.touchStart(button, {
      touches: [new Touch({clientX: 0, clientY: 0, identifier: 0, target: button})],
    })

    await fireEvent.touchMove(button, {
      changedTouches: [new Touch({clientX: DRAG_DISTANCE, clientY: 0, identifier: 0, target: button})],
      touches: [new Touch({clientX: DRAG_DISTANCE, clientY: 0, identifier: 0, target: button})],
    })

    await fireEvent.touchEnd(button, {
      changedTouches: [new Touch({clientX: DRAG_DISTANCE, clientY: 0, identifier: 0, target: button})],
      touches: [new Touch({clientX: DRAG_DISTANCE, clientY: 0, identifier: 0, target: button})],
    })
    expect(args.onLeftExecute).toHaveBeenCalledTimes(1)
  },
}

export const RightDragWithMouse: Story = {
  args: {
    children: '오른쪽으로 드래그',
    dragLeftChildren: '실행하기',
    onLeftExecute: undefined,
    onRightExecute: fn(),
  },
  play: async ({canvasElement, args}) => {
    const canvas = within(canvasElement)
    const button = canvas.getByRole('button', {name: '오른쪽으로 드래그'})
    const DRAG_DISTANCE = -100

    await fireEvent.mouseDown(button)
    await fireEvent.mouseMove(button, {clientX: DRAG_DISTANCE, clientY: 0})
    await fireEvent.pointerUp(button, {clientX: DRAG_DISTANCE, clientY: 0})
    expect(args.onRightExecute).toHaveBeenCalledTimes(1)
  },
}

export const RightDragWithTouch: Story = {
  args: {
    children: '오른쪽 드래그',
    dragLeftChildren: '왼쪽 실행',
    onLeftExecute: undefined,
    onRightExecute: fn(),
  },
  play: async ({canvasElement, args}) => {
    const canvas = within(canvasElement)
    const button = canvas.getByRole('button', {name: '오른쪽 드래그'})
    const DRAG_DISTANCE = -100

    await fireEvent.touchStart(button, {
      touches: [new Touch({clientX: 0, clientY: 0, identifier: 0, target: button})],
    })

    await fireEvent.touchMove(button, {
      changedTouches: [new Touch({clientX: DRAG_DISTANCE, clientY: 0, identifier: 0, target: button})],
      touches: [new Touch({clientX: DRAG_DISTANCE, clientY: 0, identifier: 0, target: button})],
    })

    await fireEvent.touchEnd(button, {
      changedTouches: [new Touch({clientX: DRAG_DISTANCE, clientY: 0, identifier: 0, target: button})],
      touches: [new Touch({clientX: DRAG_DISTANCE, clientY: 0, identifier: 0, target: button})],
    })
    expect(args.onRightExecute).toHaveBeenCalledTimes(1)
  },
}
