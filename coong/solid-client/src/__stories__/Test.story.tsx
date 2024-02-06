import {Meta, StoryObj} from 'storybook-solidjs'

const Test = () => {
  return <div>hello</div>
}

const meta = {
  component: Test,
  title: 'Test',
} satisfies Meta<typeof Test>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  //
}
