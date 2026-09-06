import {Show} from 'solid-js'
import * as m from '@paraglide/message'
import {PButton} from '../PButton'
import {HTour, type HTourController} from './headless'
import {PTourMask} from './PTourMask'
import {type PTourStep} from './step'

interface PTourBodyProps<Step extends PTourStep> {
  readonly maskPadding?: number
  readonly titleId: string
  readonly tour: HTourController<Step>
}

const DEFAULT_MASK_PADDING = 8

export const PTourBody = <Step extends PTourStep>(props: PTourBodyProps<Step>) => (
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
                bordered
                transparent
                disabled={props.tour.isFirstStep()}
                onPress={() => props.tour.previous()}
                size="small"
                tone="secondary"
              >
                {m.tour_previous()}
              </PButton>
              <PButton raised onPress={() => props.tour.next()} size="small">
                {props.tour.isLastStep() ? m.tour_finish() : m.tour_next()}
              </PButton>
            </footer>
          </HTour.Content>
        </>
      )}
    </HTour.Spotlight>
  </HTour.Portal>
)
