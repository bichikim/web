import {Meta, StoryObj} from 'storybook-solidjs-vite'
import {Button, ButtonBodyProps, ButtonProviderProps} from './'
import {splitProps} from 'solid-js'
import {fn} from '@storybook/test'

const Template = (props: ButtonBodyProps & ButtonProviderProps) => {
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
    <Button.Provider {...innerProps}>
      <Button.Body {...restProps}>Click me</Button.Body>
    </Button.Provider>
  )
}

const meta = {
  argTypes: {
    disabled: {
      control: 'boolean',
      description: 'Whether the button is disabled or not',
      table: {
        category: 'Props',
        defaultValue: {summary: 'false'},
      },
    },
    doubleClickGap: {
      control: 'number',
      description: 'The gap between clicks to consider a double click',
      table: {
        category: 'Props',
        defaultValue: {summary: '250'},
      },
    },
    href: {
      control: 'text',
      description: 'Button href link',
      table: {
        category: 'Props',
        defaultValue: {summary: 'undefined'},
      },
    },
    loading: {
      control: 'boolean',
      description: 'Whether the button is loading or not',
      table: {
        category: 'Props',
        defaultValue: {summary: 'false'},
      },
    },
    onClick: {
      description: 'Click event handler',
      table: {
        category: 'Events',
      },
      type: {name: 'function', required: false},
    },
    onDoubleClick: {
      description: 'Double click event handler',
      table: {
        category: 'Events',
      },
      type: {name: 'function', required: false},
    },
    onTouchEnd: {
      description: 'Touch end event handler',
      table: {
        category: 'Events',
      },
      type: {name: 'function', required: false},
    },
    onTouchStart: {
      description: 'Touch start event handler',
      table: {
        category: 'Events',
      },
      type: {name: 'function', required: false},
    },
    preventLoadingDisabled: {
      control: 'boolean',
      description: 'Whether the button is prevent loading disabled or not',
      table: {
        category: 'Props',
        defaultValue: {summary: 'false'},
      },
    },
    type: {
      control: 'select',
      description: 'Button type',
      options: ['button', 'anchor', 'anchor-button'],
      table: {
        category: 'Props',
        defaultValue: {summary: 'button'},
      },
    },
  },
  args: {
    doubleClickGap: 250,
    onClick: fn(),
    onDoubleClick: fn(),
    onTouchEnd: fn(),
    onTouchStart: fn(),
    type: 'button',
  },
  component: Template,
  title: 'Solid/Components/button/Button',
} satisfies Meta<typeof Template>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    class: 'bg-red-500',
  },
}
