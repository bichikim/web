import {Meta, StoryObj} from 'storybook-solidjs'
import {Foo} from 'src/Foo'

const Test = () => {
  return <div>hello</div>
}

const meta = {
  component: Foo,
  title: 'Test',
} satisfies Meta<typeof Test>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  //
}
