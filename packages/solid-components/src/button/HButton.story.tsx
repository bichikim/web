import {HButton} from './'
import {Meta, StoryObj} from 'storybook-solidjs-vite'
import {expect, fireEvent, fn, within} from '@storybook/test'

const defaultButtonClass = `:uno:
inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 font-semibold text-white
bg-blue-600 shadow-lg hover:bg-blue-500 active:bg-blue-700
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
focus-visible:ring-blue-400 transition-colors duration-200
bg-[linear-gradient(90deg,_rgba(37,99,235,1)_var(--var-progress-percent,_0%),_rgba(59,130,246,1)_var(--var-progress-percent,_0%))]
disabled:opacity-60 disabled:cursor-not-allowed
data-[loading=true]:bg-slate-500 data-[loading=true]:text-white
data-[loading=true]:shadow-inner data-[loading=true]:cursor-wait
data-[loading-animation=true]:animate-pulse
data-[loading-animation=true]:bg-blue-500
data-[loading-animation=true]:shadow-blue-400/40`

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
    class: defaultButtonClass,
    onClick: fn(),
    onDoubleClick: fn(),
    onTouchEnd: fn(),
    onTouchStart: fn(),
  },
  // tags: ['autodocs'],
  component: HButton,
  title: 'Solid/Components/Button',
} satisfies Meta<typeof HButton>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Click: Story = {
  play: async ({canvasElement, args}) => {
    args.onClick.mockClear()
    const canvas = within(canvasElement)
    const button = canvas.getByRole('button', {name: 'Click me'})

    await fireEvent.click(button)
    expect(args.onClick).toHaveBeenCalledTimes(1)
  },
}

export const TouchStart: Story = {
  play: async ({canvasElement, args}) => {
    args.onTouchStart.mockClear()
    const canvas = within(canvasElement)
    const button = canvas.getByRole('button', {name: 'Click me'})

    await fireEvent.touchStart(button)
    expect(args.onTouchStart).toHaveBeenCalledTimes(1)
  },
}

export const TouchEnd: Story = {
  play: async ({canvasElement, args}) => {
    args.onTouchEnd.mockClear()
    const canvas = within(canvasElement)
    const button = canvas.getByRole('button', {name: 'Click me'})

    await fireEvent.touchEnd(button)
    expect(args.onTouchEnd).toHaveBeenCalledTimes(1)
  },
}

export const DoubleClick: Story = {
  play: async ({canvasElement, args}) => {
    args.onDoubleClick.mockClear()
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
    args.onDoubleClick.mockClear()
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

    expect(button).toHaveAttribute('data-loading', 'true')
  },
}

export const AutoLoading: Story = {
  args: {
    autoLoading: true,
    children: 'Click me to trigger loading automatically',
    onClick: async () => {
      await new Promise((resolve) => {
        setTimeout(resolve, 2000)
      })
    },
  },
}

export const OverrideStyle: Story = {
  args: {
    loading: 50,
    style: {
      color: 'red',
    },
  },
}
