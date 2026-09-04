import {type TourEvent, type TourStep} from '@winter-love/solid-use/tour'
import {createUniqueId, Show} from 'solid-js'

import * as m from '@paraglide/message'
import {PButton} from '../PButton'
import {HTour, type HTourController} from './headless'
import {PTourMask} from './PTourMask'

export interface PTourStep extends TourStep {
  readonly description?: string
  readonly title: string
  readonly video?: {
    readonly label: string
    readonly source: string
  }
}

export interface PTourProps<Step extends PTourStep> {
  readonly getStepElement: (stepId: string) => Element | null
  readonly initialStepId?: string
  readonly isOpen: boolean
  readonly maskPadding?: number
  readonly onEvent?: (event: TourEvent<Step>) => void
  readonly onOpenChange?: (isOpen: boolean) => void
  readonly steps: ReadonlyArray<Step>
}

interface PTourBodyProps<Step extends PTourStep> {
  readonly maskPadding?: number
  readonly titleId: string
  readonly tour: HTourController<Step>
}

const DEFAULT_MASK_PADDING = 8

const PTourBody = <Step extends PTourStep>(props: PTourBodyProps<Step>) => (
  <HTour.Portal>
    <HTour.Spotlight
      element={props.tour.activeElement()}
      padding={props.maskPadding ?? DEFAULT_MASK_PADDING}
    >
      {(targetBounds) => (
        <>
          <PTourMask targetBounds={targetBounds()} />
          <HTour.Content
            aria-labelledby={props.titleId}
            class={
              'box-border max-h-[calc(100dvh-2rem)] w-[min(calc(100vw-2rem),22rem)] ' +
              'overflow-y-auto rounded-panel border border-solid border-border bg-surface-strong ' +
              'p-5 text-foreground shadow-panel outline-none backdrop-blur-surface ' +
              'focus-visible:border-highlight motion-reduce:transition-none ' +
              'transition-[top_160ms_ease,left_160ms_ease,bottom_160ms_ease]'
            }
            targetBounds={targetBounds()}
          >
            <header class="flex items-start justify-between gap-4">
              <div class="min-w-0">
                <p class="m-0 text-xs font-750 tracking-wide text-highlight">
                  {m.tour_progress({
                    current: String(props.tour.stepIndex() + 1),
                    total: String(props.tour.stepCount()),
                  })}
                </p>
                <HTour.Title class="mb-0 mt-2 text-lg font-750 leading-6" id={props.titleId}>
                  {props.tour.activeStep()?.title}
                </HTour.Title>
              </div>
              <HTour.CloseButton
                aria-label={m.common_close()}
                class={
                  'grid size-10 flex-none cursor-pointer place-items-center rounded-control ' +
                  'border-0 bg-transparent text-muted-foreground outline-none ' +
                  'hover:bg-secondary-soft hover:text-foreground focus-visible:shadow-focus'
                }
              >
                <span aria-hidden="true" class="i-tabler-x size-5" />
              </HTour.CloseButton>
            </header>
            <Show when={props.tour.activeStep()?.video}>
              {(video) => (
                <video
                  aria-label={video().label}
                  autoplay
                  class={
                    'mt-4 aspect-[4/3] w-full rounded-panel-inner border border-solid ' +
                    'border-border bg-background object-cover'
                  }
                  controls
                  loop
                  muted
                  playsinline
                  preload="metadata"
                  ref={(element) => {
                    element.muted = true
                  }}
                  src={video().source}
                />
              )}
            </Show>
            <Show when={props.tour.activeStep()?.description}>
              {(description) => (
                <HTour.Description class="mb-0 mt-3 text-sm leading-6 text-muted-foreground">
                  {description()}
                </HTour.Description>
              )}
            </Show>
            <footer class="mt-5 flex items-center justify-end gap-2">
              <PButton
                disabled={props.tour.isFirstStep()}
                onPress={() => props.tour.previous()}
                size="small"
                tone="secondary"
              >
                {m.tour_previous()}
              </PButton>
              <PButton onPress={() => props.tour.next()} size="small">
                {props.tour.isLastStep() ? m.tour_finish() : m.tour_next()}
              </PButton>
            </footer>
          </HTour.Content>
        </>
      )}
    </HTour.Spotlight>
  </HTour.Portal>
)

/** 헤드리스 투어 프리미티브를 Pomo의 안내 패널과 마스크로 구성합니다. */
export const PTour = <Step extends PTourStep>(props: PTourProps<Step>) => {
  const titleId = createUniqueId()

  return (
    <HTour.Root
      getStepElement={(stepId) => props.getStepElement(stepId)}
      initialStepId={props.initialStepId}
      isOpen={props.isOpen}
      onEvent={(event) => props.onEvent?.(event)}
      onOpenChange={(isOpen) => props.onOpenChange?.(isOpen)}
      steps={props.steps}
    >
      {(tour) => <PTourBody maskPadding={props.maskPadding} titleId={titleId} tour={tour} />}
    </HTour.Root>
  )
}
