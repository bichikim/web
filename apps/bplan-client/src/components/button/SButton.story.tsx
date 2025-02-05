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
    glass: {
      control: 'boolean',
      description: '버튼 배경 투명도',
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
      options: ['primary', 'secondary', 'outline', 'default'],
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
    children: '기본 버튼',
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

export const Default: Story = {
  args: {
    children: '기본 버튼',
    size: 'md',
    variant: 'default',
  },
}

export const Outline: Story = {
  args: {
    children: '외곽선 버튼',
    size: 'md',
    variant: 'outline',
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
