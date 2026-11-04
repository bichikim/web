import {Meta, StoryObj} from 'storybook-solidjs-vite'
import {expect, fn} from 'storybook/test'
import {ResizeCard} from './'
import {ResizeCardProviderProps} from './ResizeCardProvider'
import {cva} from 'class-variance-authority'

const handleUpStyle = `
cursor-move p-2 hover:bg-gray-200 rounded-full bg-red cursor-grab absolute top-0 left-50%
translate-x--1/2 translate-y--100%
`

const handleLeftStyle = `
cursor-move p-2 hover:bg-gray-200 rounded-full bg-red cursor-grab absolute top-50% right-0
translate-x-100% translate-y--1/2
`

const bodyStyle = cva('border border-gray-300 rounded-md bg-white absolute bottom-0 left-0', {
  defaultVariants: {
    maxContentSize: false,
  },
  variants: {
    maxContentSize: {
      true: 'max-h-max',
    },
  },
})

const Template = (args: ResizeCardProviderProps & {maxContentSize?: boolean}) => {
  return (
    <ResizeCard.Provider {...args}>
      <ResizeCard.Body component="div" class={bodyStyle({maxContentSize: args.maxContentSize})}>
        <ResizeCard.Handle resizeType="up" class={handleUpStyle}>
          <span class="i-carbon-drag-horizontal text-gray-500" />
        </ResizeCard.Handle>
        <ResizeCard.Handle resizeType="right" class={handleLeftStyle}>
          <span class="i-carbon-drag-vertical text-gray-500" />
        </ResizeCard.Handle>
        <div class="bg-gray-100 p-4">
          <div class="flex justify-between items-center">
            <h3 class="text-lg font-medium">리사이즈 가능한 카드</h3>
          </div>
        </div>
        <div class="p-4">
          <p>이 카드는 크기를 조절할 수 있습니다.</p>
          <p>이 카드는 크기를 조절할 수 있습니다.</p>
          <p>이 카드는 크기를 조절할 수 있습니다.</p>
          <p>이 카드는 크기를 조절할 수 있습니다.</p>
          <p>이 카드는 크기를 조절할 수 있습니다.</p>
          <p>이 카드는 크기를 조절할 수 있습니다.</p>
          <p>이 카드는 크기를 조절할 수 있습니다.</p>
          <p class="mt-2">??</p>
        </div>
      </ResizeCard.Body>
    </ResizeCard.Provider>
  )
}

const meta = {
  args: {
    maxSize: {
      height: 400,
    },
    minSize: {
      height: 150,
    },
  },
  argTypes: {
    maxSize: {
      control: false,
    },
    minSize: {
      control: false,
    },
  },
  component: Template,
  parameters: {
    layout: 'centered',
  },
  title: 'Coong/Components/ResizeCard',
} satisfies Meta

export default meta
type Story = StoryObj

export const Default: Story = {
  args: {
    maxSize: {
      height: 400,
    },
    minSize: {
      height: 150,
    },
  },
}

export const RowSize: Story = {
  args: {
    maxSize: {
      width: 500,
    },
    minSize: {
      width: 250,
    },
  },
}

export const MaxContentSize: Story = {
  args: {
    maxContentSize: true,
    minSize: {
      height: 150,
    },
  },
}

interface ResizePlayContext {
  args: ResizeCardProviderProps
  canvasElement: HTMLElement
}

const verifyResize = ({args, canvasElement}: ResizePlayContext) => {
  const handles = canvasElement.querySelectorAll('button')
  const vertical = args.preventWidthResize === true
  const handle = handles[vertical ? 0 : 1]
  const body = handle.parentElement!
  const initial = {height: body.offsetHeight, width: body.offsetWidth}
  const point = (delta: number) => ({clientX: vertical ? 0 : delta, clientY: vertical ? -delta : 0})
  const mouse = (type: string, delta: number, target: EventTarget = document.defaultView!) =>
    target.dispatchEvent(new MouseEvent(type, {bubbles: true, ...point(delta)}))
  const touch = (type: string, delta: number, target: EventTarget = document.defaultView!) => {
    const value = new Touch({identifier: 1, target: handle, ...point(delta)})
    target.dispatchEvent(
      new TouchEvent(type, {
        bubbles: true,
        changedTouches: [value],
        touches: type === 'touchend' ? [] : [value],
      }),
    )
  }
  const expected = (delta: number) => ({
    height: initial.height + (vertical ? delta : 0),
    width: initial.width + (vertical ? 0 : delta),
  })

  mouse('mousedown', 0, handle)
  mouse('mouseup', 0)
  expect(args.onResize).not.toHaveBeenCalled()
  mouse('mousedown', 0, handle)
  mouse('mousemove', 40)
  expect(args.onResize).toHaveBeenLastCalledWith(expected(40))
  mouse('mouseup', 60)
  expect(args.onResize).toHaveBeenLastCalledWith(expected(60))
  expect(args.onResize).toHaveBeenCalledTimes(2)
  touch('touchstart', 0, handle)
  touch('touchmove', 20)
  touch('touchend', 40)
  expect(args.onResize).toHaveBeenLastCalledWith(expected(100))
  expect(args.onResize).toHaveBeenCalledTimes(4)
  expect({height: body.offsetHeight, width: body.offsetWidth}).toEqual(expected(100))
  mouse('mousemove', 150)
  expect(args.onResize).toHaveBeenCalledTimes(4)
}

export const ResizeCallback: Story = {
  args: {onResize: fn()},
  play: verifyResize,
}

export const FixedWidthCallback: Story = {
  args: {onResize: fn(), preventWidthResize: true},
  play: verifyResize,
}

export const FixedHeightCallback: Story = {
  args: {onResize: fn(), preventHeightResize: true},
  play: verifyResize,
}
