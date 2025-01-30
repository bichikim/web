import {CheckboxBody, CheckboxIndicator, CheckboxRoot} from './'
import {Meta, StoryObj} from 'storybook-solidjs'
import {LabelContent} from 'src/label'

const DefaultTemplate = (props: any) => {
  return (
    <CheckboxRoot {...props}>
      <CheckboxBody component="div">
        <CheckboxIndicator
          component="span"
          class="w-20px h-20px bg-gray block data-[checked=true]:bg-red"
        />
        <LabelContent>hello</LabelContent>
      </CheckboxBody>
    </CheckboxRoot>
  )
}

const meta = {
  component: CheckboxRoot,
  title: 'Solid/components/checkbox',
} satisfies Meta<typeof CheckboxRoot>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: (args) => <DefaultTemplate {...args} />,
}
