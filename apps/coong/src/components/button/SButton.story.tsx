import type {Meta, StoryObj} from 'storybook-solidjs-vite'
import {fn} from 'storybook/test'
import {SButton} from './SButton'
import {createEffect, createSignal, onCleanup} from 'solid-js'

type ButtonHandler = (event: MouseEvent | TouchEvent) => Promise<void> | void

const meta = {
  args: {onClick: fn<ButtonHandler>(), onDoubleClick: fn<ButtonHandler>()},
  argTypes: {
    autoLoading: {
      control: 'boolean',
      description: 'Whether the button is auto loading or not',
      table: {
        category: 'Props',
        defaultValue: {summary: 'false'},
      },
    },
    color: {
      control: 'select',
      description: 'Button variant',
      options: [
        'primary',
        'secondary',
        'default',
        'transparent',
        'error',
        'warning',
        'info',
        'success',
        'aurora',
      ],
      table: {
        category: 'Props',
        defaultValue: {summary: 'primary'},
      },
    },
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
    fit: {
      control: 'boolean',
      description: 'Whether the button is fit or not',
      table: {
        category: 'Props',
        defaultValue: {summary: 'false'},
      },
    },
    flat: {
      control: 'boolean',
      description: 'Whether the button is flat or not',
      table: {
        category: 'Props',
        defaultValue: {summary: 'false'},
      },
    },
    glass: {
      control: 'boolean',
      description: 'Whether the button is glass or not',
      table: {
        category: 'Props',
        defaultValue: {summary: 'false'},
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
    outline: {
      control: 'boolean',
      description: 'Whether the button has an outline or not',
      table: {
        category: 'Props',
        defaultValue: {summary: 'false'},
      },
    },
    preventLoadingDisabled: {
      control: 'boolean',
      description: 'Whether the button is prevent loading disabled or not',
      table: {
        category: 'Props',
        defaultValue: {summary: 'false'},
      },
    },
    preventLoadingPulse: {
      control: 'boolean',
      description: 'Whether the button is prevent loading pulse or not',
      table: {
        category: 'Props',
        defaultValue: {summary: 'false'},
      },
    },
    size: {
      control: 'select',
      description: 'Button size',
      options: ['sm', 'md', 'lg', 'xl', 'xs'],
      table: {
        category: 'Props',
        defaultValue: {summary: 'md'},
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
  component: SButton,
  tags: ['autodocs'],
  title: 'Coong/Components/SButton',
} satisfies Meta<typeof SButton>

export default meta
type Story = StoryObj<typeof meta>

export const PrimaryColor: Story = {
  args: {
    children: 'primary button',
    color: 'primary',
    size: 'md',
  },
}

export const SecondaryColor: Story = {
  args: {
    children: 'secondary button',
    color: 'secondary',
    size: 'md',
  },
}

export const OverrideClass: Story = {
  args: {
    children: 'primary button',
    class: 'animate-bounce',
    color: 'primary',
    size: 'md',
  },
}

export const ErrorColor: Story = {
  args: {
    children: 'error button',
    color: 'error',
    size: 'md',
  },
}

export const WarningColor: Story = {
  args: {
    children: 'warning button',
    color: 'warning',
    size: 'md',
  },
}

export const DefaultColor: Story = {
  args: {
    children: 'default button',
    color: 'default',
    size: 'md',
  },
}

export const AuroraColor: Story = {
  args: {
    children: 'aurora button',
    color: 'aurora',
    size: 'md',
  },
}

export const Small: Story = {
  args: {
    children: 'small button',
    size: 'sm',
  },
}

export const Large: Story = {
  args: {
    children: 'large button',
    size: 'lg',
  },
}

export const Flat: Story = {
  args: {
    children: 'flat button',
    color: 'primary',
    flat: true,
    size: 'md',
  },
}

export const Glass: Story = {
  args: {
    children: 'glass button',
    color: 'primary',
    glass: true,
    size: 'md',
  },
}

export const Disabled: Story = {
  args: {
    children: 'disabled button',
    disabled: true,
  },
}

export const Loading: Story = {
  args: {
    children: 'loading button',
    loading: true,
  },
}

export const AutoLoading: Story = {
  args: {
    autoLoading: true,
    children: 'Click me to trigger loading automatically',
    color: 'primary',
    onClick: fn<ButtonHandler>(async () => {
      await new Promise((resolve) => {
        setTimeout(resolve, 3000)
      })
    }),
  },
}

export const LoadingNumber: Story = {
  args: {
    children: 'loading button',
    loading: 10,
  },
  render: (args: any) => {
    const [loading, setLoading] = createSignal(args.loading)

    createEffect(() => {
      const clear = setInterval(() => {
        setLoading((value) => {
          if (value < 100) {
            return value + 10
          }

          return 10
        })
      }, 500)

      onCleanup(() => {
        clearInterval(clear)
      })
    })

    return (
      <SButton {...args} loading={loading()}>
        Loading {loading()}%
      </SButton>
    )
  },
}
