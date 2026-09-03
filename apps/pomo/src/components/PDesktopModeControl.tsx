import {For, Show} from 'solid-js'
import {cx} from 'class-variance-authority'

import type {DesktopMode} from '../features/desktop-mode'
import * as m from '@paraglide/message'

interface ModeOption {
  readonly icon: string
  readonly label: string
  readonly value: DesktopMode
}

export interface PDesktopModeControlProps {
  readonly error?: string | null
  readonly isChanging?: boolean
  readonly mode: DesktopMode
  readonly onModeChange: (mode: DesktopMode) => Promise<void>
}

const getModeOptions = (): ReadonlyArray<ModeOption> => [
  {icon: 'i-tabler-app-window', label: m.desktop_mode_normal(), value: 'normal'},
  {icon: 'i-tabler-picture-in-picture', label: m.desktop_mode_widget(), value: 'widget'},
  {icon: 'i-tabler-wallpaper', label: m.desktop_mode_desktop(), value: 'desktop'},
  {
    icon: 'i-tabler-hand-click',
    label: m.desktop_mode_interactive_desktop(),
    value: 'interactiveDesktop',
  },
]

export const PDesktopModeControl = (props: PDesktopModeControlProps) => {
  const requestMode = async (mode: DesktopMode) => {
    try {
      await props.onModeChange(mode)
    } catch {}
  }

  return (
    <Show when={import.meta.env.VITE_POMO_IS_DESKTOP === 'true'}>
      <div
        aria-label={m.desktop_mode_label()}
        class="flex rounded-control border border-solid border-border bg-surface p-1 shadow-panel"
        role="group"
      >
        <For each={getModeOptions()}>
          {(option) => (
            <button
              aria-label={option.label}
              aria-pressed={props.mode === option.value}
              class={cx(
                'inline-flex min-h-9 min-w-9 items-center justify-center rounded-control',
                'border-0 bg-transparent text-foreground outline-none hover:bg-surface-interactive',
                'focus-visible:outline-2 focus-visible:outline-highlight',
                'aria-pressed:bg-highlight aria-pressed:text-background',
              )}
              disabled={props.isChanging}
              onClick={() => requestMode(option.value)}
              type="button"
            >
              <span aria-hidden="true" class={`${option.icon} size-4`} />
            </button>
          )}
        </For>
      </div>
      <Show when={props.error}>
        {(message) => (
          <p
            class="m-0 max-w-64 rounded-control bg-surface px-3 py-2 text-xs text-danger"
            role="alert"
          >
            {m.desktop_mode_error({message: message()})}
          </p>
        )}
      </Show>
    </Show>
  )
}
