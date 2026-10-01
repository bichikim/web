import {Show} from 'solid-js'
import {ToastRegion, useToast} from '@winter-love/solid-components'
import * as m from '@paraglide/message'
import type {PSceneStyle} from 'src/features/focus-room-animation'
import {PToastCard} from './PToastCard'

export interface PToastRegionProps {
  readonly sceneStyle?: PSceneStyle
}

export const PToastRegion = (props: PToastRegionProps) => {
  const toast = useToast()

  return (
    <Show when={toast.count() > 0}>
      <section
        aria-label={m.toast_label()}
        class="pointer-events-auto grid w-88 max-w-[calc(100vw_-_3.5rem_-_var(--pomo-safe-area-inset-left))] gap-2"
      >
        <div class="max-h-[min(60dvh,_32rem)] flex flex-col overflow-y-auto">
          <ToastRegion deferDismiss>
            {(notification, dismiss, exit) => (
              <PToastCard
                closing={exit.closing()}
                notification={notification}
                onDismiss={dismiss}
                onExitComplete={exit.completeDismiss}
                sceneStyle={props.sceneStyle}
              />
            )}
          </ToastRegion>
        </div>
        <Show when={toast.waitingCount() > 0}>
          <div class="flex justify-end gap-2 text-xs font-650 text-foreground">
            <span class="rounded-control bg-surface px-2 py-1 backdrop-blur-surface">
              {m.toast_count({count: toast.count()})}
              {' · '}
              {m.toast_waiting({count: toast.waitingCount()})}
            </span>
          </div>
        </Show>
      </section>
    </Show>
  )
}
