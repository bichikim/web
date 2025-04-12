import {HButton} from './'
import {Meta, StoryObj} from 'storybook-solidjs'
import {expect, fireEvent, fn, within} from '@storybook/test'

const meta = {
  argTypes: {
    doubleClickGap: {
      control: 'number',
      description: 'The gap between clicks to consider a double click',
      table: {
        category: 'Props',
        defaultValue: {summary: '250'},
      },
    },
    onClick: {
      description: 'Click event handler',
      table: {
        category: 'Events',
        defaultValue: {summary: 'undefined'},
      },
    },
    onDoubleClick: {
      description: 'Double click event handler',
      table: {
        category: 'Events',
        defaultValue: {summary: 'undefined'},
      },
    },
  },
  args: {
    children: 'Click me',
    onClick: fn(),
    onDoubleClick: fn(),
    onTouchEnd: fn(),
    onTouchStart: fn(),
  },
  component: HButton,
  title: 'Solid/Components/Button/HButton',
} satisfies Meta<typeof HButton>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Click: Story = {
  play: async ({canvasElement, args}) => {
    const canvas = within(canvasElement)
    const button = canvas.getByRole('button', {name: 'Click me'})

    await fireEvent.click(button)
    expect(args.onClick).toHaveBeenCalledTimes(1)
  },
}

export const TouchStart: Story = {
  play: async ({canvasElement, args}) => {
    const canvas = within(canvasElement)
    const button = canvas.getByRole('button', {name: 'Click me'})

    await fireEvent.touchStart(button)
    expect(args.onTouchStart).toHaveBeenCalledTimes(1)
  },
}

export const TouchEnd: Story = {
  play: async ({canvasElement, args}) => {
    const canvas = within(canvasElement)
    const button = canvas.getByRole('button', {name: 'Click me'})

    await fireEvent.touchEnd(button)
    expect(args.onTouchEnd).toHaveBeenCalledTimes(1)
  },
}

export const DoubleClick: Story = {
  play: async ({canvasElement, args}) => {
    const canvas = within(canvasElement)
    const button = canvas.getByRole('button', {name: 'Click me'})

    // first click
    await fireEvent.click(button)
    // double click
    await fireEvent.click(button)
    // check double click event
    expect(args.onDoubleClick).toHaveBeenCalledTimes(1)
  },
}

export const DoubleClickWithTouch: Story = {
  play: async ({canvasElement, args}) => {
    const canvas = within(canvasElement)
    const button = canvas.getByRole('button', {name: 'Click me'})

    // first touch start and touch end
    // 첫 번째 터치 이벤트 (touchstart)
    await fireEvent.touchStart(button)
    await fireEvent.touchEnd(button)
    // double click
    await fireEvent.touchStart(button)
    await fireEvent.touchEnd(button)
    // check double click event
    expect(args.onDoubleClick).toHaveBeenCalledTimes(1)
  },
}
