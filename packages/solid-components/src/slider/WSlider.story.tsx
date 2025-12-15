import {Meta, StoryObj} from 'storybook-solidjs-vite'
import {WSlider} from './'

const meta = {
  component: WSlider.Root,
  title: 'Solid/components/WSlider',
} satisfies Meta

export default meta

type Story = StoryObj<typeof meta>

export const Horizontal: Story = {
  render: () => (
    <WSlider.Root>
      <WSlider.Bar component="div" class="h-2rem w-20rem bg-blue-500 relative ml-30px">
        <WSlider.Handle component="div" class="h-full w-2rem bg-blue-200 absolute left-var-position" />
      </WSlider.Bar>
    </WSlider.Root>
  ),
}
