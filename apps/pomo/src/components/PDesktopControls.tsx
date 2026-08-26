import {Title} from '@solidjs/meta'
import {cx} from 'class-variance-authority'
import {Show} from 'solid-js'

import {useDesktopBackgroundInteraction, useDesktopMode} from '../features/desktop-mode'
import {PDesktopInteractionControl} from './PDesktopInteractionControl'
import {PMusicPlayer} from './PMusicPlayer'
import {PDesktopModeControl} from './PDesktopModeControl'
import {PPomodoro} from './PPomodoro'
import * as m from '@paraglide/message'

export const PDesktopControls = () => {
  const desktopMode = useDesktopMode()
  const backgroundInteraction = useDesktopBackgroundInteraction()

  return (
    <main class="box-border flex min-h-dvh w-full items-end justify-center bg-transparent p-3 text-foreground">
      <Title>{m.desktop_controls_title()}</Title>
      <Show when={desktopMode.mode() === 'desktop'}>
        <section
          aria-label={m.desktop_controls_label()}
          class={cx(
            'relative flex min-h-72 w-full flex-col justify-between gap-4 overflow-hidden rounded-3xl',
            'border border-solid border-border bg-surface/88 p-4 shadow-panel backdrop-blur-surface',
          )}
        >
          <header class="flex items-center justify-between gap-3">
            <div>
              <p class="m-0 text-sm font-700">Pomofi</p>
              <p class="m-0 text-xs text-muted-foreground">{m.desktop_controls_description()}</p>
            </div>
            <div class="flex items-start gap-2">
              <PDesktopInteractionControl
                error={backgroundInteraction.error()}
                interaction={backgroundInteraction.interaction()}
                isChanging={backgroundInteraction.isChanging()}
                onInteractionChange={backgroundInteraction.onInteractionChange}
              />
              <PDesktopModeControl
                error={desktopMode.error()}
                isChanging={desktopMode.isChanging()}
                mode={desktopMode.mode()}
                onModeChange={desktopMode.onModeChange}
              />
            </div>
          </header>
          <div class="relative min-h-20 [&_.pomo-pomodoro]:relative [&_.pomo-pomodoro]:inset-auto">
            <PPomodoro />
          </div>
          <div
            class={cx(
              'relative min-h-24 [&_.pomo-player-stage]:relative',
              '[&_.pomo-player-stage]:inset-auto [&_.pomo-player-stage]:w-full',
            )}
          >
            <PMusicPlayer />
          </div>
        </section>
      </Show>
    </main>
  )
}
