import type {Meta, StoryObj} from 'storybook-solidjs'
import {fn} from '@storybook/test'
import {SButton} from './SButton'

const meta = {
  argTypes: {
    disabled: {
      control: 'boolean',
      description: '비활성화 상태',
      table: {
        category: 'Props',
        defaultValue: {summary: 'false'},
      },
    },
    flat: {
      control: 'boolean',
      description: '버튼 플랫 유무',
      table: {
        category: 'Props',
        defaultValue: {summary: 'false'},
      },
    },
    glass: {
      control: 'boolean',
      description: '버튼 배경 투명도',
      table: {
        category: 'Props',
        defaultValue: {summary: 'false'},
      },
    },
    loading: {
      control: 'boolean',
      description: '로딩 상태',
      table: {
        category: 'Props',
        defaultValue: {summary: 'false'},
      },
    },
    onClick: {
      description: '클릭 이벤트 핸들러',
      table: {
        category: 'Events',
        defaultValue: {summary: 'undefined'},
      },
    },
    onDoubleClick: {
      description: '더블 클릭 이벤트 핸들러',
      table: {
        category: 'Events',
        defaultValue: {summary: 'undefined'},
      },
    },
    outline: {
      control: 'boolean',
      description: '버튼 테두리 유무',
      table: {
        category: 'Props',
        defaultValue: {summary: 'false'},
      },
    },
    preventLoadingDisabled: {
      control: 'boolean',
      description: '로딩 비활성화 방지',
      table: {
        category: 'Props',
        defaultValue: {summary: 'false'},
      },
    },
    size: {
      control: 'select',
      description: '버튼 크기',
      options: ['sm', 'md', 'lg'],
      table: {
        category: 'Props',
        defaultValue: {summary: 'md'},
      },
    },
    variant: {
      control: 'select',
      description: '버튼 스타일 변형',
      options: ['primary', 'secondary', 'default'],
      table: {
        category: 'Props',
        defaultValue: {summary: 'primary'},
      },
    },
  },
  args: {onClick: fn(), onDoubleClick: fn()},
  component: SButton,
  title: 'BPlan/Components/SButton',
} satisfies Meta<typeof SButton>

export default meta
type Story = StoryObj<typeof meta>

export const Primary: Story = {
  args: {
    children: '주요 버튼',
    size: 'md',
    variant: 'primary',
  },
}

export const Secondary: Story = {
  args: {
    children: '보조 버튼',
    size: 'md',
    variant: 'secondary',
  },
}

export const Danger: Story = {
  args: {
    children: '위험 버튼',
    size: 'md',
    variant: 'danger',
  },
}

export const Warning: Story = {
  args: {
    children: '경고 버튼',
    size: 'md',
    variant: 'warning',
  },
}

export const Default: Story = {
  args: {
    children: '기본 버튼',
    size: 'md',
    variant: 'default',
  },
}

export const Small: Story = {
  args: {
    children: '작은 버튼',
    size: 'sm',
  },
}

export const Large: Story = {
  args: {
    children: '큰 버튼',
    size: 'lg',
  },
}

export const Disabled: Story = {
  args: {
    children: '비활성화 버튼',
    disabled: true,
  },
}

export const LoadingNumber: Story = {
  args: {
    children: '비활성화 버튼',
    loading: 50,
  },
}
