import {For} from 'solid-js'
import type {Meta, StoryObj} from 'storybook-solidjs-vite'

import dayReadingImage from '../../assets/concept-art/focus-room-day-reading-concept.webp'
import './focus-room-tokens.css'
import {FocusRoomPanel} from './FocusRoomPanel'

const SWATCHES = [
  {color: 'var(--focus-room-canvas)', label: 'Canvas', value: '#17130F'},
  {color: 'var(--focus-room-glass)', label: 'Glass', value: '#0A0A0A / 68%'},
  {color: 'var(--focus-room-text)', label: 'Cream', value: '#FFFAF1'},
  {color: 'var(--focus-room-brass)', label: 'Brass', value: '#D9B98A'},
  {color: 'var(--focus-room-secondary)', label: 'Secondary', value: '#727B60'},
  {color: 'var(--focus-room-accent)', label: 'Hairpin', value: '#D86845'},
] as const

const meta = {
  component: FocusRoomPanel,
  parameters: {
    backgrounds: {default: 'black'},
    layout: 'fullscreen',
  },
  title: 'Pomo/Design System/Focus Room',
} satisfies Meta<typeof FocusRoomPanel>

export default meta
type Story = StoryObj<typeof meta>

export const Foundation: Story = {
  args: {
    children: <span />,
  },
  render: () => (
    <main
      class="min-h-screen bg-cover bg-center p-6 sm:p-10"
      style={{
        'background-image': `linear-gradient(rgb(12 9 7 / 38%), rgb(12 9 7 / 68%)), url(${dayReadingImage})`,
      }}
    >
      <FocusRoomPanel
        class="mx-auto max-w-4xl rounded-[var(--focus-room-radius-panel)]"
        padding="spacious"
      >
        <div class="grid gap-8">
          <header class="max-w-2xl">
            <p class="m-0 text-xs font-700 tracking-[0.18em] text-[var(--focus-room-accent)] uppercase">
              Focus room language
            </p>
            <h1 class="mb-2 mt-3 text-3xl font-750">조용하고 따뜻한 집중</h1>
            <p class="m-0 text-sm leading-6 text-[var(--focus-room-text-muted)]">
              방의 짙은 목재와 크림 조명을 바탕으로, 카디건의 올리브 그린은 보조 상호작용에,
              머리핀의 테라코타는 중요한 선택과 재생 상태에 사용합니다.
            </p>
          </header>

          <section aria-labelledby="palette-title">
            <h2 class="mb-3 text-sm font-700" id="palette-title">
              Color
            </h2>
            <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <For each={SWATCHES}>
                {(swatch) => (
                  <article
                    class={
                      'overflow-hidden rounded-4 border border-[var(--focus-room-border)] bg-black/22'
                    }
                  >
                    <div class="h-20" style={{background: swatch.color}} />
                    <div class="p-3">
                      <strong class="block text-xs">{swatch.label}</strong>
                      <span class="mt-1 block text-[11px] text-[var(--focus-room-text-muted)]">
                        {swatch.value}
                      </span>
                    </div>
                  </article>
                )}
              </For>
            </div>
          </section>

          <section aria-labelledby="usage-title">
            <h2 class="mb-3 text-sm font-700" id="usage-title">
              Usage
            </h2>
            <div class="flex flex-wrap gap-3">
              <button class="h-11 rounded-full bg-[var(--focus-room-accent)] px-5 text-sm font-750 text-white">
                주요 행동
              </button>
              <button
                class={
                  'h-11 rounded-full bg-[var(--focus-room-secondary-strong)] px-5 ' +
                  'text-sm font-700 text-white'
                }
              >
                보조 행동
              </button>
              <span
                class={
                  'inline-flex items-center gap-2 rounded-full bg-[var(--focus-room-accent-soft)] px-4 ' +
                  'text-xs font-700 text-[var(--focus-room-accent)]'
                }
              >
                <span class="size-2 rounded-full bg-[var(--focus-room-accent)]" /> 재생 중
              </span>
            </div>
          </section>
        </div>
      </FocusRoomPanel>
    </main>
  ),
}
