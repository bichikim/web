import {CheckboxBody, CheckboxIndicator, CheckboxRoot} from './'
import {Meta, StoryObj} from 'storybook-solidjs'
import {LabelContent} from 'src/label'

const Root = (props: any) => {
  return (
    <CheckboxRoot {...props}>
      <CheckboxBody component="div">
        <CheckboxIndicator
          component="span"
          class="w-10px h-10px bg-gray block data-[checked=true]:bg-red"
        />
        <LabelContent>hello</LabelContent>
      </CheckboxBody>
    </CheckboxRoot>
  )
}

const meta = {
  component: Root,
  title: 'Solid/components/checkbox',
} satisfies Meta<typeof CheckboxRoot>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
