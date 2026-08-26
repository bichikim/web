import {Show} from 'solid-js'
import {cx} from 'class-variance-authority'

import type {DesktopBackgroundInteraction} from '../features/desktop-mode'
import * as m from '@paraglide/message'

export interface PDesktopInteractionControlProps {
  readonly error?: string | null
  readonly interaction: DesktopBackgroundInteraction
  readonly isChanging?: boolean
  readonly onInteractionChange: (interaction: DesktopBackgroundInteraction) => Promise<void>
}

export const PDesktopInteractionControl = (props: PDesktopInteractionControlProps) => {
  const isInteractive = () => props.interaction === 'interactive'
  const label = () =>
    isInteractive()
      ? m.desktop_background_interaction_disable()
      : m.desktop_background_interaction_enable()

  const requestInteractionChange = async () => {
    try {
      await props.onInteractionChange(isInteractive() ? 'passThrough' : 'interactive')
    } catch {}
  }

  return (
    <div class="flex flex-col items-end gap-1">
      <button
        aria-pressed={isInteractive()}
        class={cx(
          'inline-flex min-h-9 items-center gap-2 rounded-control border border-solid px-3',
          'border-border bg-surface text-xs text-foreground outline-none hover:bg-surface-interactive',
          'focus-visible:outline-2 focus-visible:outline-highlight',
          'aria-pressed:bg-highlight aria-pressed:text-background',
        )}
        disabled={props.isChanging}
        onClick={requestInteractionChange}
        title={m.desktop_background_interaction_hint()}
        type="button"
      >
        <span aria-hidden="true" class="i-tabler-pointer size-4" />
        {label()}
      </button>
      <Show when={props.error}>
        {(message) => (
          <p class="m-0 max-w-64 text-right text-xs text-danger" role="alert">
            {m.desktop_background_interaction_error({message: message()})}
          </p>
        )}
      </Show>
    </div>
  )
}
