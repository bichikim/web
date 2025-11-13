import {HButton} from './'
import {Meta, StoryObj} from 'storybook-solidjs-vite'
import {expect, fireEvent, fn, within} from '@storybook/test'

const meta = {
  argTypes: {
    disabled: {
      control: 'boolean',
      description: 'Whether the button is disabled or not',
      table: {
        category: 'Props',
        defaultValue: {summary: 'false'},
      },
    },
    doubleClickGap: {
      control: 'number',
      description: 'The gap between clicks to consider a double click',
      table: {
        category: 'Props',
        defaultValue: {summary: '250'},
      },
    },
    href: {
      control: 'text',
      description: 'Button href link',
      table: {
        category: 'Props',
        defaultValue: {summary: 'undefined'},
      },
    },
    loading: {
      control: 'boolean',
      description: 'Whether the button is loading or not',
      table: {
        category: 'Props',
        defaultValue: {summary: 'false'},
      },
    },
    onClick: {
      description: 'Click event handler',
      table: {
        category: 'Events',
      },
      type: {name: 'function', required: false},
    },
    onDoubleClick: {
      description: 'Double click event handler',
      table: {
        category: 'Events',
      },
      type: {name: 'function', required: false},
    },
    onTouchEnd: {
      description: 'Touch end event handler',
      table: {
        category: 'Events',
      },
      type: {name: 'function', required: false},
    },
    onTouchStart: {
      description: 'Touch start event handler',
      table: {
        category: 'Events',
      },
      type: {name: 'function', required: false},
    },
  },
  args: {
    children: 'Click me',
    class: [
      'bg-gray-100 p-2 rounded-md text-4',
      'data-[loading=true]:bg-yellow-500',
      'data-[loading=true]:opacity-[var(--var-progress-percent)]',
    ].join(' '),
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

export const Loading: Story = {
  args: {
    loading: true,
  },
}

export const LoadingProcess: Story = {
  args: {
    loading: 50,
  },
  play: async ({canvasElement, args}) => {
    const canvas = within(canvasElement)
    const button = canvas.getByRole('button', {name: 'Click me'})

    expect(button).toHaveAttribute('data-loading', 'loop')
  },
}

export const AutoLoading: Story = {
  args: {
    autoLoading: true,
    children: 'Click me to trigger loading automatically',
    onClick: async () => {
      await new Promise((resolve) => {
        setTimeout(resolve, 1000)
      })
    },
  },
}
