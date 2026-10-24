import {cx} from 'class-variance-authority'
import {type JSXElement} from 'solid-js'

import * as m from '@paraglide/message'

interface DesktopDialogFrameProps {
  readonly children: JSXElement
  readonly onClose: () => void
  readonly title: string
}

export const DesktopDialogFrame = (props: DesktopDialogFrameProps) => (
  <main
    class={cx(
      'pomo-desktop-dialog box-border flex min-h-dvh w-full flex-col overflow-hidden',
      'rounded-panel border border-solid border-border bg-modal-surface text-foreground',
      '[&_*:not(:focus-visible)]:shadow-none',
    )}
  >
    <header
      class="flex min-h-14 flex-none items-center justify-between gap-4 border-b border-solid border-border px-4"
      data-tauri-drag-region
    >
      <h1 class="m-0 min-w-0 truncate text-lg font-750 leading-6">{props.title}</h1>
      <button
        aria-label={m.common_close()}
        class={
          'grid size-10 flex-none cursor-pointer place-items-center rounded-full border-0 ' +
          'bg-transparent text-muted-foreground outline-none ' +
          'transition-[background-color_140ms_ease,color_140ms_ease] ' +
          'hover:bg-secondary-soft hover:text-foreground focus-visible:shadow-focus ' +
          'motion-reduce:transition-none'
        }
        onClick={() => props.onClose()}
        type="button"
      >
        <span aria-hidden="true" class="i-tabler-x size-5" />
      </button>
    </header>
    <div class="min-h-0 flex-1 overflow-y-auto p-5">{props.children}</div>
  </main>
)
