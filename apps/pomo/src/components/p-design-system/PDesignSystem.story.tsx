import {For} from 'solid-js'
import {expect, within} from 'storybook/test'
import type {Meta, StoryObj} from 'storybook-solidjs-vite'

import dayReadingImage from '../../features/focus-room-animation/assets/concept-art/day-reading.webp'
import {PPanel} from '../p-panel/PPanel'

const SWATCHES = [
  {class: 'bg-background', label: 'Canvas', value: '#17130F'},
  {class: 'bg-surface', label: 'Glass', value: '#0A0A0A / 68%'},
  {class: 'bg-foreground', label: 'Cream', value: '#FFFAF1'},
  {class: 'bg-highlight', label: 'Brass', value: '#D9B98A'},
  {class: 'bg-secondary', label: 'Secondary', value: '#727B60'},
  {class: 'bg-primary', label: 'Hairpin', value: '#D86845'},
] as const

const RADII = [
  {class: 'rounded-control', label: 'control', pixels: 14, usage: '컨트롤', value: '0.875rem'},
  {class: 'rounded-panel', label: 'panel', pixels: 20, usage: '패널 · 모달', value: '1.25rem'},
  {
    class: 'rounded-panel-inner',
    label: 'panel-inner',
    pixels: 12,
    usage: '패널 내부 · 8px 안쪽 여백',
    value: '1.25rem − 0.5rem',
  },
  {class: 'rounded-full', label: 'full', pixels: 15984, usage: '필 · 원형', value: '999rem'},
] as const

const SPACES = [
  {class: 'pl-1', label: '1', pixels: 4, value: '0.25rem'},
  {class: 'pl-2', label: '2', pixels: 8, value: '0.5rem'},
  {class: 'pl-3', label: '3', pixels: 12, value: '0.75rem'},
  {class: 'pl-4', label: '4', pixels: 16, value: '1rem'},
  {class: 'pl-5', label: '5', pixels: 20, value: '1.25rem'},
  {class: 'pl-6', label: '6', pixels: 24, value: '1.5rem'},
  {class: 'pl-8', label: '8', pixels: 32, value: '2rem'},
  {class: 'pl-layout', label: 'layout', pixels: 24, value: '1.5rem'},
  {class: 'pl-layout-mobile', label: 'layout-mobile', pixels: 16, value: '1rem'},
] as const

const SHADOWS = [
  {
    class: 'shadow-panel',
    dark: '0 18px 54px rgb(8 6 4 / 42%)',
    geometry: '0px 18px 54px 0px',
    label: 'panel',
    light: '0 18px 54px rgb(25 31 40 / 16%)',
    usage: '패널 · 모달',
  },
  {
    class: 'shadow-player',
    dark: '0 22px 70px rgb(5 4 3 / 46%), inset 0 1px 0 rgb(255 255 255 / 10%)',
    geometry: '0px 22px 70px 0px',
    label: 'player',
    light: '0 18px 54px rgb(25 31 40 / 18%), inset 0 1px 0 rgb(255 255 255 / 55%)',
    usage: '플레이어 · 내부 상단 하이라이트',
  },
  {
    class: 'shadow-switch-thumb',
    dark: '0 2px 6px rgb(8 6 4 / 35%)',
    geometry: '0px 2px 6px 0px',
    label: 'switch-thumb',
    light: '0 2px 6px rgb(25 31 40 / 24%)',
    usage: '스위치 손잡이',
  },
  {
    class: 'shadow-focus',
    dark: '0 0 0 0.125rem highlight',
    geometry: '0px 0px 0px 2px',
    label: 'focus',
    light: '0 0 0 0.125rem highlight',
    usage: '키보드 포커스 링',
  },
  {
    class: 'shadow-tab-active',
    dark: 'inset 0 -0.1875rem 0 highlight',
    geometry: '0px -3px 0px 0px inset',
    label: 'tab-active',
    light: 'inset 0 -0.1875rem 0 highlight',
    usage: '선택된 탭의 아래쪽 표시',
  },
  {
    class: 'shadow-track-active',
    dark: 'inset 0.125rem 0 0 primary',
    geometry: '2px 0px 0px 0px inset',
    label: 'track-active',
    light: 'inset 0.125rem 0 0 primary',
    usage: '선택된 트랙의 왼쪽 표시',
  },
] as const

const ShadowTokens = () => (
  <section aria-labelledby="shadow-title">
    <h2 class="mb-3 text-sm font-700" id="shadow-title">
      Shadow
    </h2>
    <p class="mb-4 text-sm leading-6 text-muted-foreground">
      현재 미리보기는 다크 테마입니다. 패널·플레이어·스위치 그림자는 테마별로 달라지며, 포커스·선택
      표시는 highlight와 primary 색상 토큰을 따릅니다.
    </p>
    <div class="grid gap-6 sm:grid-cols-2">
      <For each={SHADOWS}>
        {(token) => (
          <article class="min-w-0">
            <div class="px-6 pb-10 pt-6">
              <div
                data-testid={`shadow-${token.label}`}
                class={`grid h-20 place-items-center rounded-control bg-background text-sm ${token.class}`}
              >
                {token.usage}
              </div>
            </div>
            <code class="block text-sm font-700">{token.class}</code>
            <dl class="mb-0 mt-2 grid gap-2 text-xs leading-5 text-muted-foreground">
              <div>
                <dt>Dark</dt>
                <dd class="m-0 break-words font-mono">{token.dark}</dd>
              </div>
              <div>
                <dt>Light</dt>
                <dd class="m-0 break-words font-mono">{token.light}</dd>
              </div>
            </dl>
          </article>
        )}
      </For>
    </div>
  </section>
)

const meta = {
  component: PPanel,
  parameters: {
    backgrounds: {default: 'black'},
    layout: 'fullscreen',
  },
  title: 'Pomo/Components/Foundation',
} satisfies Meta<typeof PPanel>

export default meta
type Story = StoryObj<typeof meta>

export const Foundation: Story = {
  args: {
    children: <span />,
  },
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement)
    await Promise.all(
      SHADOWS.map(async (token) => {
        await expect(
          getComputedStyle(canvas.getByTestId(`shadow-${token.label}`)).boxShadow,
        ).toContain(token.geometry)
      }),
    )
    await Promise.all(
      RADII.map(async (token) => {
        await expect(
          getComputedStyle(canvas.getByTestId(`radius-${token.label}`)).borderTopLeftRadius,
        ).toBe(`${token.pixels}px`)
      }),
    )
    await Promise.all(
      SPACES.map(async (token) => {
        await expect(getComputedStyle(canvas.getByTestId(`space-${token.label}`)).paddingLeft).toBe(
          `${token.pixels}px`,
        )
      }),
    )
  },
  render: () => (
    <main class="relative min-h-screen overflow-hidden p-6 xs:p-10">
      <img
        alt=""
        aria-hidden="true"
        class="pointer-events-none absolute inset-0 size-full object-cover object-center"
        src={dayReadingImage}
      />
      <div
        aria-hidden="true"
        class="pointer-events-none absolute inset-0 bg-[linear-gradient(rgb(12_9_7_/_38%),rgb(12_9_7_/_68%))]"
      />
      <PPanel class="relative mx-auto max-w-4xl rounded-panel" padding="spacious">
        <div class="grid gap-8">
          <header class="max-w-2xl">
            <p class="m-0 text-xs font-700 tracking-[0.18em] text-primary uppercase">
              Pomo visual language
            </p>
            <h1 class="mb-2 mt-3 text-3xl font-750">조용하고 따뜻한 집중</h1>
            <p class="m-0 text-sm leading-6 text-muted-foreground">
              방의 짙은 목재와 크림 조명을 바탕으로, 카디건의 올리브 그린은 보조 상호작용에,
              머리핀의 테라코타는 중요한 선택과 재생 상태에 사용합니다.
            </p>
          </header>

          <section aria-labelledby="palette-title">
            <h2 class="mb-3 text-sm font-700" id="palette-title">
              Color
            </h2>
            <div class="grid grid-cols-2 gap-3 xs:grid-cols-3 2xl:grid-cols-6">
              <For each={SWATCHES}>
                {(swatch) => (
                  <article class={'overflow-hidden rounded-4 border border-border bg-black/22'}>
                    <div class={`h-20 ${swatch.class}`} />
                    <div class="p-3">
                      <strong class="block text-xs">{swatch.label}</strong>
                      <span class="mt-1 block text-[0.6875rem] text-muted-foreground">
                        {swatch.value}
                      </span>
                    </div>
                  </article>
                )}
              </For>
            </div>
          </section>

          <section aria-labelledby="radius-title">
            <h2 class="mb-3 text-sm font-700" id="radius-title">
              Radius
            </h2>
            <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <For each={RADII}>
                {(token) => (
                  <article class="grid gap-2">
                    <div
                      data-testid={`radius-${token.label}`}
                      class={`h-20 w-full border border-solid border-highlight bg-primary-soft ${token.class}`}
                    />
                    <code class="text-sm">rounded-{token.label}</code>
                    <span class="text-xs text-muted-foreground">{token.value}</span>
                    <span class="text-xs text-muted-foreground">{token.usage}</span>
                  </article>
                )}
              </For>
            </div>
          </section>

          <section aria-labelledby="spacing-title">
            <h2 class="mb-3 text-sm font-700" id="spacing-title">
              Spacing
            </h2>
            <p class="mb-4 text-sm text-muted-foreground">
              기본 간격 단위는 0.25rem입니다. 아래는 주요 사용 값이며, px는 루트 글꼴 16px
              기준입니다.
            </p>
            <div class="grid gap-3">
              <For each={SPACES}>
                {(token) => (
                  <div class="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_3rem] items-center gap-3">
                    <code class="text-sm">{token.label}</code>
                    <span class="text-xs text-muted-foreground">
                      {token.value} · {token.pixels}px
                    </span>
                    <div
                      data-testid={`space-${token.label}`}
                      class={`h-3 w-0 bg-highlight ${token.class}`}
                    />
                  </div>
                )}
              </For>
            </div>
            <p class="mb-0 mt-4 text-sm leading-6 text-muted-foreground">
              패널 안쪽 여백: compact 8px · medium 12px · spacious 20px. 모달 상단 간격: 32px, 작은
              화면 20px에 기기 상단 안전 영역을 더합니다. safe-* 간격은 화면 가장자리의 안전 영역을
              반영합니다.
            </p>
          </section>

          <ShadowTokens />

          <section aria-labelledby="usage-title">
            <h2 class="mb-3 text-sm font-700" id="usage-title">
              Usage
            </h2>
            <div class="flex flex-wrap gap-3">
              <button class="h-11 rounded-full bg-primary px-5 text-sm font-750 text-white">
                주요 행동
              </button>
              <button class="h-11 rounded-full bg-secondary-strong px-5 text-sm font-700 text-white">
                보조 행동
              </button>
              <span
                class={
                  'inline-flex items-center gap-2 rounded-full bg-primary-soft px-4 ' +
                  'text-xs font-700 text-primary'
                }
              >
                <span class="size-2 rounded-full bg-primary" /> 재생 중
              </span>
            </div>
          </section>
        </div>
      </PPanel>
    </main>
  ),
}
