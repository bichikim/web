import {useContext} from 'solid-js'
import {LabelContent, LabelContext, LabelProvider} from './Label'
import type {Meta, StoryObj} from 'storybook-solidjs-vite'

const LabelContextConsumer = () => {
  const labelContext = useContext(LabelContext)

  return <input type="text" id={labelContext().targetId} />
}

const meta = {
  component: LabelProvider,
  title: 'Solid/Components/Label',
} satisfies Meta<typeof LabelProvider>

export default meta
type Story = StoryObj<typeof LabelProvider>

export const Default: Story = {
  render: () => {
    return (
      <div>
        <LabelProvider>
          <LabelContent class="pr-2">name</LabelContent>
          <LabelContextConsumer />
        </LabelProvider>
      </div>
    )
  },
}

export const CustomTargetId: Story = {
  render: () => {
    const customId = 'custom-input-id'

    return (
      <div>
        <LabelProvider targetId={customId}>
          <LabelContent>custom target id</LabelContent>
          <LabelContextConsumer />
        </LabelProvider>
      </div>
    )
  },
}
