import {createSignal, For} from 'solid-js'
import {expect, fn, userEvent, waitFor, within} from 'storybook/test'
import type {Meta, StoryObj} from 'storybook-solidjs-vite'

import * as m from '@paraglide/message'
import {PButton} from '../PButton'
import {PTour, type PTourProps, type PTourStep} from './PTour'

interface DemoStep extends PTourStep {
  readonly icon: string
}

interface TourStoryProps {
  readonly maskPadding?: number
  readonly onEvent?: PTourProps<DemoStep>['onEvent']
  readonly onOpenChange?: (isOpen: boolean) => void
}

interface TourPlayContext {
  readonly args: TourStoryProps
  readonly canvasElement: HTMLElement
}

const STEPS = [
  {
    description: '집중 시간과 휴식 시간을 한눈에 확인할 수 있어요.',
    icon: 'i-tabler-clock',
    id: 'timer',
    scrollIntoView: true,
    title: '집중 타이머',
  },
  {
    description: '집중에 어울리는 음악을 고르고 재생할 수 있어요.',
    icon: 'i-tabler-headphones',
    id: 'music',
    scrollIntoView: true,
    title: '음악 플레이어',
  },
  {
    description: '장면과 대화, 알림 설정을 원하는 방식으로 바꿔보세요.',
    icon: 'i-tabler-settings',
    id: 'settings',
    scrollIntoView: true,
    title: '설정',
  },
] as const satisfies ReadonlyArray<DemoStep>

const TourStory = (props: TourStoryProps) => {
  const [isOpen, setIsOpen] = createSignal(false)
  const targetElements = new Map<string, Element>()

  const handleOpenChange = (nextOpen: boolean) => {
    setIsOpen(nextOpen)
    props.onOpenChange?.(nextOpen)
  }

  return (
    <main class="grid min-h-screen place-items-center bg-background p-6 text-foreground">
      <section class="grid w-full max-w-4xl gap-4">
        <header class="flex items-center justify-between gap-4">
          <div>
            <p class="m-0 text-xs font-750 tracking-wide text-highlight">Pomo 둘러보기</p>
            <h1 class="mb-0 mt-1 text-2xl font-750">집중 화면</h1>
          </div>
          <PButton icon="i-tabler-route" onPress={() => handleOpenChange(true)} tone="glass">
            투어 보기
          </PButton>
        </header>

        <div
          aria-label="Pomo 기능"
          class="h-112 overflow-y-auto rounded-panel border border-solid border-border bg-surface-overlay p-5"
          role="region"
        >
          <div class="grid gap-64">
            <For each={STEPS}>
              {(step) => (
                <article
                  aria-label={step.title}
                  class={
                    'grid min-h-24 grid-cols-[auto_1fr] items-center gap-4 rounded-panel ' +
                    'border border-solid border-border bg-surface p-5 shadow-panel'
                  }
                  ref={(element) => targetElements.set(step.id, element)}
                >
                  <span
                    aria-hidden="true"
                    class={`${step.icon} size-8 rounded-control text-highlight`}
                  />
                  <div>
                    <h2 class="m-0 text-lg font-750">{step.title}</h2>
                    <p class="mb-0 mt-1 text-sm leading-6 text-muted-foreground">
                      {step.description}
                    </p>
                  </div>
                </article>
              )}
            </For>
          </div>
        </div>
      </section>

      <PTour
        getStepElement={(stepId) => targetElements.get(stepId) ?? null}
        isOpen={isOpen()}
        maskPadding={props.maskPadding}
        onEvent={(event) => props.onEvent?.(event)}
        onOpenChange={handleOpenChange}
        steps={STEPS}
      />
    </main>
  )
}

const meta = {
  args: {
    maskPadding: 8,
    onEvent: fn(),
    onOpenChange: fn(),
  },
  argTypes: {
    maskPadding: {control: {max: 32, min: 0, step: 1, type: 'range'}},
    onEvent: {table: {category: 'Events'}, type: {name: 'function'}},
    onOpenChange: {table: {category: 'Events'}, type: {name: 'function'}},
  },
  component: TourStory,
  parameters: {backgrounds: {default: 'black'}, layout: 'fullscreen'},
  title: 'Pomo/Components/PTour',
} satisfies Meta<typeof TourStory>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({args, canvasElement}: TourPlayContext) => {
    const page = within(canvasElement.ownerDocument.body)
    const viewport = page.getByRole('region', {name: 'Pomo 기능'})

    await userEvent.click(page.getByRole('button', {name: '투어 보기'}))
    await expect(page.getByRole('dialog', {name: '집중 타이머'})).toBeVisible()
    await expect(canvasElement.ownerDocument.querySelectorAll('[data-part="top"]')).toHaveLength(1)

    await userEvent.click(page.getByRole('button', {name: m.tour_next()}))
    await expect(page.getByRole('dialog', {name: '음악 플레이어'})).toBeVisible()
    await waitFor(() => expect(viewport.scrollTop).toBeGreaterThan(0))

    await userEvent.click(page.getByRole('button', {name: m.tour_next()}))
    await expect(page.getByRole('dialog', {name: '설정'})).toBeVisible()
    await userEvent.click(page.getByRole('button', {name: m.tour_finish()}))

    await waitFor(() => expect(page.queryByRole('dialog')).not.toBeInTheDocument())
    await expect(args.onEvent).toHaveBeenCalledTimes(4)
    await expect(args.onOpenChange).toHaveBeenLastCalledWith(false)
  },
}
