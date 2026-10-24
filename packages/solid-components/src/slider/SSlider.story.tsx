import {Meta, StoryObj} from 'storybook-solidjs-vite'
import {SSlider} from './'

const meta = {
  component: SSlider.Root,
  title: 'Solid/components/SSlider',
} satisfies Meta

export default meta

type Story = StoryObj<typeof meta>

export const Horizontal: Story = {
  render: () => (
    <SSlider.Root>
      <SSlider.Bar component="div" class="h-2rem w-20rem bg-blue-500 relative ml-30px">
        <SSlider.Handle
          component="div"
          class="h-full w-2rem bg-blue-200 absolute left-var-position"
        />
      </SSlider.Bar>
    </SSlider.Root>
  ),
}
