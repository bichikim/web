import {useContext} from 'solid-js'
import {LabelContent, LabelContext, LabelRoot} from './Label'
import type {Meta, StoryObj} from 'storybook-solidjs'

const LabelContextConsumer = () => {
  const labelContext = useContext(LabelContext)

  return <input type="text" id={labelContext().targetId} />
}

const meta = {
  component: LabelRoot,
  title: 'Solid/Components/Label',
} satisfies Meta<typeof LabelRoot>

export default meta
type Story = StoryObj<typeof LabelRoot>

export const Default: Story = {
  render: () => {
    return (
      <div>
        <LabelRoot>
          <LabelContent class="pr-2">name</LabelContent>
          <LabelContextConsumer />
        </LabelRoot>
      </div>
    )
  },
}

export const CustomTargetId: Story = {
  render: () => {
    const customId = 'custom-input-id'

    return (
      <div>
        <LabelRoot targetId={customId}>
          <LabelContent>custom target id</LabelContent>
          <LabelContextConsumer />
        </LabelRoot>
      </div>
    )
  },
}
