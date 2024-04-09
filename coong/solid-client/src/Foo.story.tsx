import {Meta, StoryObj} from 'storybook-solidjs'
import {Foo} from 'src/Foo'

const meta = {
  component: Foo,
} satisfies Meta<typeof Foo>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  //
}
