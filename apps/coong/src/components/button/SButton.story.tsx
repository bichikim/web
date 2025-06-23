import type {Meta, StoryObj} from 'storybook-solidjs'
import {fn} from '@storybook/test'
import {SButton} from './SButton'
import {createEffect, createSignal, onCleanup} from 'solid-js'

const meta = {
  argTypes: {
    color: {
      control: 'select',
      description: 'Button variant',
      options: ['primary', 'secondary', 'default', 'transparent', 'error', 'warning', 'info', 'success'],
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
        defaultValue: {summary: 'undefined'},
      },
    },
    onDoubleClick: {
      description: 'Double click event handler',
      table: {
        category: 'Events',
        defaultValue: {summary: 'undefined'},
      },
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
    size: {
      control: 'select',
      description: 'Button size',
      options: ['sm', 'md', 'lg'],
      table: {
        category: 'Props',
        defaultValue: {summary: 'md'},
      },
    },
  },
  args: {onClick: fn(), onDoubleClick: fn()},
  component: SButton,
  title: 'BPlan/Components/SButton',
} satisfies Meta<typeof SButton>

export default meta
type Story = StoryObj<typeof meta>

export const OverrideClass: Story = {
  args: {
    children: 'primary button',
    class: 'absolute left-20 top-20',
    color: 'primary',
    size: 'md',
  },
}

export const Primary: Story = {
  args: {
    children: 'primary button',
    color: 'primary',
    size: 'md',
  },
}

export const Secondary: Story = {
  args: {
    children: 'secondary button',
    color: 'secondary',
    size: 'md',
  },
}

export const Error: Story = {
  args: {
    children: 'error button',
    color: 'error',
    size: 'md',
  },
}

export const Warning: Story = {
  args: {
    children: 'warning button',
    color: 'warning',
    size: 'md',
  },
}

export const Default: Story = {
  args: {
    children: 'default button',
    color: 'default',
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
    onClick: async () => {
      await new Promise((resolve) => {
        setTimeout(resolve, 3000)
      })
    },
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
