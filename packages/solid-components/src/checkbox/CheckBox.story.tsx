import {Meta, StoryObj} from 'storybook-solidjs-vite'
import {Checkbox, CheckboxProviderProps} from './index'

const Template = (props: CheckboxProviderProps) => {
  return (
    <Checkbox.Provider {...props}>
      <Checkbox.Body component="div" class="b-gray b-1 block w-20px h-20px overflow-hidden">
        <Checkbox.Indicator component="span" class="w-15px h-15px block data-[checked=true]:i-tabler:check text-5" />
      </Checkbox.Body>
      <Checkbox.Label>hello</Checkbox.Label>
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
