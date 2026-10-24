import {createMemo, For} from 'solid-js'
import {expect, fn, userEvent, within} from 'storybook/test'
import type {Meta, StoryObj} from 'storybook-solidjs-vite'

import {type TourEvent, type TourStep, useTour} from './'

interface DemoStep extends TourStep {
  readonly description: string
  readonly title: string
}

interface TourDemoProps {
  readonly onEvent?: (event: TourEvent<DemoStep>) => void
}

interface UseTourPlayContext {
  readonly args: TourDemoProps
  readonly canvasElement: HTMLElement
}

const STEPS: ReadonlyArray<DemoStep> = [
  {
    description: 'The first target is already visible, so the viewport stays in place.',
    id: 'overview',
    title: 'Overview',
  },
  {
    description: 'This target opts into conditional scrolling and sits below the viewport.',
    id: 'details',
    scrollIntoView: true,
    title: 'Details',
  },
  {
    description: 'The final target proves that every step transition can reveal its target.',
    id: 'finish',
    scrollIntoView: true,
    title: 'Finish',
  },
]

const targetClasses =
  'rounded-4 border border-solid border-slate-300 bg-white p-5 text-slate-800 shadow-sm ' +
  'data-[active=true]:border-blue-600 data-[active=true]:outline-3 ' +
  'data-[active=true]:outline-offset-3 data-[active=true]:outline-blue-500'

const buttonClasses =
  'rounded-3 border border-solid border-slate-300 bg-white px-4 py-2 text-sm font-600 ' +
  'text-slate-800 enabled:cursor-pointer enabled:hover:bg-slate-100 ' +
  'focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ' +
  'disabled:cursor-not-allowed disabled:opacity-45'

const TourDemo = (props: TourDemoProps) => {
  const targetElements = new Map<string, Element>()
  const tour = useTour<DemoStep>({
    getStepElement: (stepId) => targetElements.get(stepId) ?? null,
    get onEvent() {
      return props.onEvent
    },
    steps: () => STEPS,
  })
  const activePosition = createMemo(() => {
    const stepIndex = tour.stepIndex()

    return stepIndex < 0 ? 'Not running' : `Step ${stepIndex + 1} of ${tour.stepCount()}`
  })
  const isLastStep = createMemo(() => tour.stepIndex() === tour.stepCount() - 1)

  const registerTarget = (stepId: string) => (element: HTMLElement) => {
    targetElements.set(stepId, element)
  }

  return (
    <main class="min-h-screen bg-slate-100 p-6 text-slate-900">
      <div class="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <section
          aria-labelledby="tour-controls-title"
          class="self-start rounded-5 bg-white p-5 shadow-sm"
        >
          <p class="m-0 text-xs font-700 tracking-wide text-blue-700 uppercase">Headless tour</p>
          <h1 class="mb-2 mt-2 text-xl font-750" id="tour-controls-title">
            useTour controls
          </h1>
          <p class="m-0 text-sm leading-6 text-slate-600">
            Advance the tour to watch off-screen targets move into the scroll viewport only when
            needed.
          </p>

          <div aria-live="polite" class="my-5 rounded-3 bg-slate-100 p-4">
            <p class="m-0 text-xs font-700 text-slate-500 uppercase">{activePosition()}</p>
            <p class="mb-1 mt-2 font-700" data-testid="active-step">
              {tour.activeStep()?.title ?? 'Tour is idle'}
            </p>
            <p class="m-0 text-sm leading-5 text-slate-600">
              {tour.activeStep()?.description ?? 'Start the tour to activate the first target.'}
            </p>
          </div>

          <div class="grid grid-cols-2 gap-2">
            <button class={buttonClasses} onClick={() => tour.start()} type="button">
              {tour.isOpen() ? 'Restart' : 'Start tour'}
            </button>
            <button
              class={buttonClasses}
              disabled={tour.stepIndex() <= 0}
              onClick={() => tour.previous()}
              type="button"
            >
              Previous
            </button>
            <button
              class={buttonClasses}
              disabled={!tour.isOpen()}
              onClick={() => tour.next()}
              type="button"
            >
              {isLastStep() ? 'Finish tour' : 'Next step'}
            </button>
            <button
              class={buttonClasses}
              disabled={!tour.isOpen()}
              onClick={() => tour.dismiss()}
              type="button"
            >
              Dismiss
            </button>
          </div>
        </section>

        <section aria-labelledby="target-viewport-title" class="min-w-0">
          <div class="mb-3 flex items-end justify-between gap-4">
            <div>
              <h2 class="m-0 text-lg font-750" id="target-viewport-title">
                Scroll viewport
              </h2>
              <p class="mb-0 mt-1 text-sm text-slate-600">Active targets receive a blue outline.</p>
            </div>
            <span class="rounded-full bg-blue-100 px-3 py-1 text-xs font-700 text-blue-800">
              overflow: auto
            </span>
          </div>

          <div
            aria-label="Tour targets"
            class="overflow-auto rounded-5 border border-solid border-slate-300 bg-slate-200"
            data-testid="tour-viewport"
            role="region"
            style={{height: '24rem'}}
          >
            <div style={{display: 'grid', gap: '20rem', padding: '1.5rem'}}>
              <For each={STEPS}>
                {(step) => (
                  <article
                    aria-current={tour.activeStep()?.id === step.id ? 'step' : undefined}
                    aria-label={`${step.title} target`}
                    class={targetClasses}
                    data-active={tour.activeStep()?.id === step.id}
                    ref={registerTarget(step.id)}
                  >
                    <div class="flex items-center justify-between gap-4">
                      <h3 class="m-0 text-lg font-750">{step.title}</h3>
                      <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-650 text-slate-600">
                        {step.scrollIntoView === true ? 'Auto reveal' : 'No scroll'}
                      </span>
                    </div>
                    <p class="mb-0 mt-2 text-sm leading-6 text-slate-600">{step.description}</p>
                  </article>
                )}
              </For>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

const meta = {
  args: {onEvent: fn()},
  argTypes: {
    onEvent: {table: {category: 'Events'}, type: {name: 'function'}},
  },
  component: TourDemo,
  parameters: {backgrounds: {default: 'white'}, layout: 'fullscreen'},
  title: 'SolidUse/Use/UseTour',
} satisfies Meta<typeof TourDemo>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Interaction: Story = {
  play: async ({args, canvasElement}: UseTourPlayContext) => {
    const canvas = within(canvasElement)
    const viewport = canvas.getByRole('region', {name: 'Tour targets'})
    const overviewTarget = canvas.getByRole('article', {name: 'Overview target'})
    const detailsTarget = canvas.getByRole('article', {name: 'Details target'})
    const finishTarget = canvas.getByRole('article', {name: 'Finish target'})

    await expect(viewport.scrollTop).toBe(0)
    await expect(viewport.scrollHeight).toBeGreaterThan(viewport.clientHeight)
    await expect(detailsTarget.getBoundingClientRect().top).toBeGreaterThan(
      viewport.getBoundingClientRect().bottom,
    )
    await userEvent.click(canvas.getByRole('button', {name: 'Start tour'}))
    await expect(overviewTarget).toHaveAttribute('aria-current', 'step')

    await userEvent.click(canvas.getByRole('button', {name: 'Next step'}))
    await expect(detailsTarget).toHaveAttribute('aria-current', 'step')

    await userEvent.click(canvas.getByRole('button', {name: 'Next step'}))
    await expect(finishTarget).toHaveAttribute('aria-current', 'step')

    await userEvent.click(canvas.getByRole('button', {name: 'Finish tour'}))
    await expect(canvas.getByTestId('active-step')).toHaveTextContent('Tour is idle')
    await expect(args.onEvent).toHaveBeenCalledTimes(4)
  },
}
