import {expect, fn, userEvent, waitFor, within} from 'storybook/test'
import type {Meta, StoryObj} from 'storybook-solidjs-vite'

import smilingFaceSource from './assets/pomodoro-status-icons/break.webp'
import {PButton, pButtonClasses} from './PButton'
import {GLASS_ICON_BUTTON} from './button-presets'
import {CLASSES as POMODORO_CLASSES} from './pomodoro/shared'

interface ButtonPlayContext {
  readonly canvasElement: HTMLElement
}

const meta = {
  args: {
    backdropBlur: false,
    bordered: false,
    children: '집중 시작',
    disabled: false,
    focusOutline: false,
    icon: 'i-tabler-player-play',
    leadingOverflow: false,
    onPress: fn(),
    pill: false,
    raised: false,
    size: 'medium',
    tone: 'primary',
    transparent: false,
  },
  argTypes: {
    accessibleLabel: {control: 'text', table: {category: 'Accessibility'}},
    backdropBlur: {control: 'boolean', table: {category: 'Props'}},
    bordered: {control: 'boolean', table: {category: 'Props'}},
    disabled: {control: 'boolean', table: {category: 'Props'}},
    focusOutline: {control: 'boolean', table: {category: 'Props'}},
    icon: {control: 'text', table: {category: 'Props'}},
    iconClass: {control: 'text', table: {category: 'Props'}},
    leadingImage: {control: 'text', table: {category: 'Props'}},
    leadingOverflow: {control: 'boolean', table: {category: 'Props'}},
    onPress: {table: {category: 'Events'}, type: {name: 'function'}},
    pill: {control: 'boolean', table: {category: 'Props'}},
    raised: {control: 'boolean', table: {category: 'Props'}},
    size: {
      control: 'select',
      options: ['small', 'medium'],
      table: {category: 'Props'},
    },
    tone: {
      control: 'select',
      options: ['primary', 'secondary', 'glass', 'danger'],
      table: {category: 'Props'},
    },
    tooltip: {control: 'text', table: {category: 'Props'}},
    trailingIcon: {control: 'text', table: {category: 'Props'}},
    transparent: {control: 'boolean', table: {category: 'Props'}},
  },
  component: PButton,
  decorators: [
    (Story) => (
      <main class="grid min-h-48 place-items-center p-6">
        <Story />
      </main>
    ),
  ],
  title: 'Pomo/Components/PButton',
} satisfies Meta<typeof PButton>

export default meta
type Story = StoryObj<typeof meta>

export const Primary: Story = {
  play: async ({canvasElement}: ButtonPlayContext) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', {name: '집중 시작'}))
    await expect(meta.args.onPress).toHaveBeenCalledOnce()
  },
}

export const Secondary: Story = {
  args: {bordered: true, children: '나중에', icon: 'i-tabler-clock-pause', tone: 'secondary'},
}

export const Pill: Story = {
  args: {pill: true},
}

export const Glass: Story = {
  args: {
    backdropBlur: true,
    bordered: true,
    children: '입장하기',
    icon: undefined,
    leadingImage: smilingFaceSource,
    tone: 'glass',
    trailingIcon: 'i-tabler-arrow-right',
    transparent: true,
  },
}

export const Danger: Story = {
  args: {
    bordered: true,
    children: '현재 세션 종료',
    icon: 'i-tabler-square',
    tone: 'danger',
    transparent: false,
  },
}

export const RaisedPrimary: Story = {
  args: {raised: true},
  play: async ({canvasElement}) => {
    const button = within(canvasElement).getByRole('button')
    await expect(getComputedStyle(button).boxShadow).toContain('inset')
  },
}

export const RaisedSecondary: Story = {
  args: {bordered: true, raised: true, tone: 'secondary'},
  play: RaisedPrimary.play,
}

export const ToneComparison: Story = {
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement)
    const primary = canvas.getByRole('button', {name: 'Primary'})
    const secondary = canvas.getByRole('button', {name: 'Secondary'})
    const primaryStyle = getComputedStyle(primary)
    const secondaryStyle = getComputedStyle(secondary)
    const properties = [
      'box-shadow',
      'transform',
      'border-radius',
      'border-width',
      'padding',
      'min-height',
      'font-weight',
      'transition',
    ]
    await Promise.all(
      properties.map((property) =>
        expect(primaryStyle.getPropertyValue(property)).toBe(
          secondaryStyle.getPropertyValue(property),
        ),
      ),
    )
    await expect(primaryStyle.boxShadow).toBe('none')
    await expect(primaryStyle.backgroundColor).not.toBe(secondaryStyle.backgroundColor)
  },
  render: (args) => (
    <div class="flex flex-wrap gap-4">
      <PButton {...args} raised={false} tone="primary">
        Primary
      </PButton>
      <PButton {...args} bordered raised={false} tone="secondary">
        Secondary
      </PButton>
    </div>
  ),
}

export const TransparentSecondary: Story = {
  args: {bordered: true, tone: 'secondary', transparent: true},
}

export const TransparencyComparison: Story = {
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement)
    const opaque = getComputedStyle(canvas.getByRole('button', {name: '불투명'}))
    const transparent = getComputedStyle(canvas.getByRole('button', {name: '반투명'}))
    await expect(opaque.backgroundColor).toMatch(/^rgb\(/u)
    await expect(transparent.backgroundColor).toMatch(/^rgba\(/u)
    await expect(opaque.opacity).toBe('1')
    await expect(transparent.opacity).toBe('1')
  },
  render: (args) => (
    <div class="flex flex-wrap gap-4">
      <PButton {...args} bordered tone="secondary" transparent={false}>
        불투명
      </PButton>
      <PButton {...args} bordered tone="secondary" transparent>
        반투명
      </PButton>
    </div>
  ),
}

export const BackdropBlur: Story = {
  args: {backdropBlur: true, bordered: true, tone: 'secondary', transparent: true},
  play: async ({canvasElement}) => {
    const style = getComputedStyle(within(canvasElement).getByRole('button'))
    await expect(style.backdropFilter).toContain('blur(')
    const background = getComputedStyle(
      canvasElement.ownerDocument.documentElement,
    ).getPropertyValue('--storybook-blur-background')
    await expect(background).toContain('repeating-linear-gradient(90deg')
    await expect(background).toContain('#38bdf8 0 64px')
  },
}

export const GlassWithoutBlur: Story = {
  args: {backdropBlur: false, bordered: true, tone: 'glass', transparent: true},
  play: async ({canvasElement}) => {
    const style = getComputedStyle(within(canvasElement).getByRole('button'))
    await expect(style.backdropFilter).toBe('none')
  },
}

export const OverflowImage: Story = {
  args: {icon: undefined, leadingImage: smilingFaceSource, leadingOverflow: true, raised: true},
  play: async ({canvasElement}) => {
    const button = within(canvasElement).getByRole('button')
    const leading = button.firstElementChild!
    const buttonBounds = button.getBoundingClientRect()
    const leadingBounds = leading.getBoundingClientRect()
    await expect(leadingBounds.top).toBeLessThan(buttonBounds.top)
    await expect(leadingBounds.bottom).toBeGreaterThan(buttonBounds.bottom)
  },
}

export const OverflowIcon: Story = {
  args: {leadingOverflow: true},
  play: OverflowImage.play,
}

export const Medium: Story = {
  args: {size: 'medium', trailingIcon: 'i-tabler-arrow-right'},
  play: async ({canvasElement}) => {
    const icons = within(canvasElement).getByRole('button').querySelectorAll('[aria-hidden="true"]')
    await Promise.all(
      Array.from(icons, async (icon) => {
        await expect(getComputedStyle(icon).width).toBe('24px')
        await expect(getComputedStyle(icon).height).toBe('24px')
      }),
    )
  },
}

export const Small: Story = {
  args: {size: 'small', trailingIcon: 'i-tabler-arrow-right'},
  play: async ({canvasElement}) => {
    const icons = within(canvasElement).getByRole('button').querySelectorAll('[aria-hidden="true"]')
    await Promise.all(
      Array.from(icons, async (icon) => {
        await expect(getComputedStyle(icon).width).toBe('18px')
        await expect(getComputedStyle(icon).height).toBe('18px')
      }),
    )
  },
}

export const MediumImage: Story = {
  args: {icon: undefined, leadingImage: smilingFaceSource, size: 'medium'},
  play: async ({canvasElement}) => {
    const image = within(canvasElement).getByRole('button').querySelector('img')!
    await expect(getComputedStyle(image).width).toBe('32px')
    await expect(getComputedStyle(image).height).toBe('32px')
  },
}

export const SmallImage: Story = {
  args: {icon: undefined, leadingImage: smilingFaceSource, size: 'small'},
  play: async ({canvasElement}) => {
    const image = within(canvasElement).getByRole('button').querySelector('img')!
    await expect(getComputedStyle(image).width).toBe('24px')
    await expect(getComputedStyle(image).height).toBe('24px')
  },
}

export const ImageHeightComparison: Story = {
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement)
    await Promise.all(
      ['Medium', 'Small'].map(async (size) => {
        const icon = canvas.getByRole('button', {name: `${size} 아이콘`})
        const image = canvas.getByRole('button', {name: `${size} 이미지`})
        await expect(image.getBoundingClientRect().height).toBe(icon.getBoundingClientRect().height)
        await expect(image.getBoundingClientRect().top).toBe(icon.getBoundingClientRect().top)
      }),
    )
  },
  render: (args) => (
    <div class="flex flex-col gap-6">
      <div class="flex items-center gap-4">
        <PButton {...args} size="medium" icon="i-tabler-player-play">
          Medium 아이콘
        </PButton>
        <PButton {...args} size="medium" icon={undefined} leadingImage={smilingFaceSource}>
          Medium 이미지
        </PButton>
      </div>
      <div class="flex items-center gap-4">
        <PButton {...args} size="small" icon="i-tabler-player-play">
          Small 아이콘
        </PButton>
        <PButton {...args} size="small" icon={undefined} leadingImage={smilingFaceSource}>
          Small 이미지
        </PButton>
      </div>
    </div>
  ),
}

export const IconOnly: Story = {
  args: {accessibleLabel: '재생', children: undefined},
  play: async ({canvasElement}) => {
    const button = within(canvasElement).getByRole('button', {name: '재생'})
    await expect(button.getBoundingClientRect().width).toBe(44)
    await expect(button.getBoundingClientRect().height).toBe(44)
  },
}

export const ImageOnly: Story = {
  args: {
    accessibleLabel: '입장',
    children: undefined,
    icon: undefined,
    leadingImage: smilingFaceSource,
  },
  play: async ({canvasElement}) => {
    const button = within(canvasElement).getByRole('button', {name: '입장'})
    await expect(button.getBoundingClientRect().width).toBe(44)
    await expect(button.getBoundingClientRect().height).toBe(44)
  },
}

export const SmallIconOnly: Story = {
  args: {accessibleLabel: '재생', children: undefined, size: 'small'},
  play: async ({canvasElement}) => {
    const button = within(canvasElement).getByRole('button', {name: '재생'})
    await expect(button.getBoundingClientRect().width).toBe(32)
    await expect(button.getBoundingClientRect().height).toBe(32)
  },
}

export const Tooltip: Story = {
  args: {tooltip: '집중 세션을 시작합니다'},
  play: async ({canvasElement}) => {
    const button = within(canvasElement).getByRole('button')
    await userEvent.hover(button)
    const tooltip = await within(document.body).findByRole('tooltip')
    await expect(tooltip).toHaveTextContent('집중 세션을 시작합니다')
    await expect(button).toHaveAttribute('aria-describedby', tooltip.id)
    await expect(tooltip.matches(':popover-open')).toBe(true)
    await userEvent.keyboard('{Escape}')
    await expect(tooltip).not.toBeVisible()
    await userEvent.unhover(button)
    button.focus()
    await expect(await within(document.body).findByRole('tooltip')).toBeVisible()
    button.blur()
  },
}

export const IconOnlyTooltip: Story = {
  args: {accessibleLabel: '집중 시작', children: undefined, tooltip: '집중 세션을 시작합니다'},
  play: Tooltip.play,
}

export const BorderComparison: Story = {
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement)
    const plain = canvas.getByRole('button', {name: '테두리 없음'})
    const bordered = canvas.getByRole('button', {name: '테두리 있음'})
    await expect(getComputedStyle(plain).borderTopColor).toBe('rgba(0, 0, 0, 0)')
    await expect(getComputedStyle(bordered).borderTopColor).not.toBe('rgba(0, 0, 0, 0)')
    await expect(plain.getBoundingClientRect().height).toBe(bordered.getBoundingClientRect().height)
    await userEvent.hover(plain)
    await expect(getComputedStyle(plain).borderTopColor).toBe('rgba(0, 0, 0, 0)')
    await userEvent.unhover(plain)
  },
  render: (args) => (
    <div class="flex items-center gap-4">
      <PButton {...args} bordered={false}>
        테두리 없음
      </PButton>
      <PButton {...args} bordered>
        테두리 있음
      </PButton>
    </div>
  ),
}

export const StationaryHover: Story = {
  play: async ({canvasElement}) => {
    const buttons = within(canvasElement).getAllByRole('button')
    /* oxlint-disable eslint/no-await-in-loop -- One pointer visits each button sequentially. */
    for (const button of buttons) {
      await userEvent.hover(button)
      await expect(getComputedStyle(button).transform).toBe('none')
      const icon = button.querySelector('[data-pomo-button-trailing-icon]')!
      await expect(getComputedStyle(icon).transform).toBe('none')
      await userEvent.unhover(button)
    }
    /* oxlint-enable eslint/no-await-in-loop */
  },
  render: (args) => (
    <div class="flex gap-4">
      <PButton {...args} raised tone="primary" trailingIcon="i-tabler-arrow-right">
        Primary
      </PButton>
      <PButton {...args} raised tone="secondary" trailingIcon="i-tabler-arrow-right">
        Secondary
      </PButton>
      <PButton {...args} tone="glass" trailingIcon="i-tabler-arrow-right">
        Glass
      </PButton>
    </div>
  ),
}

export const HoverComparison: Story = {
  render: (args) => (
    <div class="flex flex-wrap gap-4">
      <PButton {...args} tone="primary">
        Primary
      </PButton>
      <PButton {...args} tone="secondary">
        Secondary
      </PButton>
      <PButton {...args} tone="glass">
        Glass
      </PButton>
      <PButton {...args} tone="danger">
        Danger
      </PButton>
    </div>
  ),
}

export const TransparentHoverComparison: Story = {
  ...HoverComparison,
  args: {transparent: true},
}

export const TransparentDanger: Story = {
  args: {...Danger.args, transparent: true},
  play: async ({canvasElement}) => {
    const button = within(canvasElement).getByRole('button')
    const background = getComputedStyle(button).backgroundColor
    await expect(background).toBe('rgba(239, 138, 116, 0.2)')
  },
}

export const GlassIconMedium: Story = {
  args: {
    ...GLASS_ICON_BUTTON,
    accessibleLabel: '설정 열기',
    children: undefined,
    icon: 'i-tabler-settings',
    tooltip: '설정 열기',
  },
  play: async ({canvasElement}) => {
    const button = within(canvasElement).getByRole('button', {name: '설정 열기'})
    const icon = button.querySelector('[data-pomo-button-icon]')!
    await expect(button.getBoundingClientRect().width).toBe(44)
    await expect(button.getBoundingClientRect().height).toBe(44)
    await expect(icon.getBoundingClientRect().width).toBe(24)
  },
}

export const GlassIconSmall: Story = {
  args: {...GlassIconMedium.args, iconClass: 'size-4 text-highlight', size: 'small'},
  play: async ({canvasElement}) => {
    const button = within(canvasElement).getByRole('button', {name: '설정 열기'})
    const icon = button.querySelector('[data-pomo-button-icon]')!
    await expect(button.getBoundingClientRect().width).toBe(32)
    await expect(button.getBoundingClientRect().height).toBe(32)
    await expect(icon.getBoundingClientRect().width).toBe(16)
  },
}

export const ClippedIconTooltip: Story = {
  args: GlassIconMedium.args,
  decorators: [
    (Story) => (
      <div class="h-12 w-12 overflow-hidden rounded-control">
        <Story />
      </div>
    ),
  ],
  play: async (context) => {
    const canvas = within(context.canvasElement)
    const button = canvas.getByRole('button', {name: '설정 열기'})
    await userEvent.hover(button)
    const tooltip = await within(document.body).findByRole('tooltip')
    await expect(tooltip).toHaveTextContent('설정 열기')
    await expect(button).toHaveAttribute('aria-describedby', tooltip.id)
    await expect(tooltip.matches(':popover-open')).toBe(true)
    await expect(getComputedStyle(tooltip).zIndex).toBe('auto')

    const bounds = tooltip.getBoundingClientRect()
    await expect(bounds.top).toBeGreaterThanOrEqual(0)
    await expect(bounds.left).toBeGreaterThanOrEqual(0)
    await expect(bounds.right).toBeLessThanOrEqual(innerWidth)
    await expect(bounds.bottom).toBeLessThanOrEqual(innerHeight)
    await expect(
      tooltip.contains(
        document.elementFromPoint(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2),
      ),
    ).toBe(true)

    await userEvent.unhover(button)
    await userEvent.hover(tooltip)
    await expect(tooltip).toBeVisible()
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(tooltip).not.toBeVisible())
    await expect(button).not.toHaveAttribute('aria-describedby')
  },
}

export const StyledLink: Story = {
  render: (args) => (
    <a href="#button-link" class={pButtonClasses({...args, class: 'no-underline'})}>
      돌아가기
    </a>
  ),
}

export const PomodoroIconActions: Story = {
  play: async ({canvasElement}) => {
    const buttons = within(canvasElement).getAllByRole('button')
    await Promise.all(
      buttons.map(async (button) => {
        await expect(button.getBoundingClientRect().width).toBe(44)
        await expect(button.getBoundingClientRect().height).toBe(44)
        button.focus()
        await expect(getComputedStyle(button).boxShadow).not.toContain('54px')
        button.blur()
      }),
    )
    const icon = within(canvasElement)
      .getByRole('button', {name: '세션 종료'})
      .querySelector('[data-pomo-button-icon]')!
    await expect(getComputedStyle(icon).color).toBe('rgb(239, 138, 116)')
  },
  render: () => (
    <div class="flex gap-2.5">
      <PButton
        {...GLASS_ICON_BUTTON}
        accessibleLabel="다음 단계"
        tooltip="다음 단계"
        class={POMODORO_CLASSES.pomodoroPanelCompactAction}
        icon="i-tabler-player-track-next"
      />
      <PButton
        {...GLASS_ICON_BUTTON}
        accessibleLabel="세션 종료"
        tooltip="세션 종료"
        class={POMODORO_CLASSES.pomodoroPanelCompactActionDanger}
        icon="i-tabler-square"
      />
    </div>
  ),
}
