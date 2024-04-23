import {Meta, StoryObj} from 'storybook-solidjs'
import {Foo} from './Foo'

const meta = {
  component: Foo,
  title: 'Bplan/Foo',
} satisfies Meta<typeof Foo>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  //
}
