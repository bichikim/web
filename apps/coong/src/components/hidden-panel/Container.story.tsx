import type {Meta, StoryObj} from 'storybook-solidjs'
import {cva} from 'class-variance-authority'
import {createSignal} from 'solid-js'

const rootStyle = cva(
  'h-100 bg-blue-400 top-0 left-0 rd-2 backdrop-blur-sm bg-opacity-90 @container',
  {
    defaultVariants: {
      size: 'custom',
    },
    variants: {
      size: {
        custom: 'w-10rem',
        md: 'w-28rem',
        sm: 'w-24rem',
      },
    },
  },
)

type Size = 'custom' | 'md' | 'sm'

const Container = () => {
  const [size, setSize] = createSignal<Size>('custom')

  return (
    <div class={rootStyle({size: size()})}>
      <div class="@md:bg-yellow-400 @sm:bg-red-400 @[10rem]:bg-green-400 w-50 h-50 rd-2"></div>
      <div class="flex gap-2">
        <button onClick={() => setSize('md')}>md</button>
        <button onClick={() => setSize('sm')}>sm</button>
        <button onClick={() => setSize('custom')}>custom</button>
      </div>
    </div>
  )
}

const meta = {
  component: Container,
  title: 'BPlan/Components/HiddenPanel/Container',
} satisfies Meta<typeof Container>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {},
}
