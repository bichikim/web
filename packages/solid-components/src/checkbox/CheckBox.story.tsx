import {Meta, StoryObj} from 'storybook-solidjs'
import {Checkbox, CheckboxProviderProps} from './index'

const Template = (props: CheckboxProviderProps) => {
  return (
    <Checkbox.Provider {...props}>
      <Checkbox.Body component="div">
        <Checkbox.Indicator
          component="span"
          class="w-20px h-20px bg-gray block data-[checked=true]:bg-red"
        />
        <Checkbox.Label>hello</Checkbox.Label>
      </Checkbox.Body>
    </Checkbox.Provider>
  )
}

const meta = {
  component: Template,
  title: 'Solid/Components/checkbox',
} satisfies Meta<typeof Template>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}
