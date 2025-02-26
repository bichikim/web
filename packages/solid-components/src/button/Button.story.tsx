import {Meta, StoryObj} from 'storybook-solidjs'
import {Button, HButtonBodyProps, HButtonRootProps} from './'
import {splitProps} from 'solid-js'
import {fn} from '@storybook/test'

const Template = (props: HButtonBodyProps & HButtonRootProps) => {
  const [innerProps, restProps] = splitProps(props, [
    'onClick',
    'onTouchEnd',
    'onDoubleClick',
    'onTouchStart',
    'doubleClickGap',
    'type',
    'href',
  ])

  return (
    <Button.Root {...innerProps}>
      <Button.Body {...restProps}>Click me</Button.Body>
    </Button.Root>
  )
}

const meta = {
  args: {
    doubleClickGap: 250,
    onClick: fn(),
    onDoubleClick: fn(),
    onTouchEnd: fn(),
    onTouchStart: fn(),
    type: 'button',
  },
  component: Template,
  title: 'Solid/Components/Button',
} satisfies Meta<typeof Template>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    class: 'bg-red-500',
  },
}
