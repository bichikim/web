import {Meta, StoryObj} from 'storybook-solidjs'
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

const bodyStyle = cva(
  'border border-gray-300 rounded-md bg-white absolute bottom-0 left-0',
  {
    defaultVariants: {
      maxContentSize: false,
    },
    variants: {
      maxContentSize: {
        true: 'max-h-max',
      },
    },
  },
)

const Template = (args: ResizeCardProviderProps & {maxContentSize?: boolean}) => {
  return (
    <ResizeCard.Provider {...args}>
      <ResizeCard.Body
        component="div"
        class={bodyStyle({maxContentSize: args.maxContentSize})}
      >
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
  argTypes: {
    maxSize: {
      control: false,
    },
    minSize: {
      control: false,
    },
  },
  args: {
    maxSize: {
      height: 400,
    },
    minSize: {
      height: 150,
    },
  },
  component: Template,
  parameters: {
    layout: 'centered',
  },
  title: 'BPlan/Components/ResizeCard',
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
