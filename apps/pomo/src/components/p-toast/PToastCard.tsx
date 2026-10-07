import {cx} from 'class-variance-authority'
import type {JSX} from 'solid-js'
import type {Message} from '@winter-love/solid-components'
import * as m from '@paraglide/message'
import type {PSceneStyle} from 'src/features/focus-room-animation'
import {HButton} from '../h-button'
import {POverflowMarquee} from '../p-overflow-marquee/POverflowMarquee'
import {PScribblePanel} from '../scribble/Panel'

export interface PToastCardProps {
  readonly closing?: boolean
  readonly onExitComplete?: () => void
  readonly sceneStyle?: PSceneStyle
  readonly notification: Message
  readonly onDismiss: () => void
}

export const PToastCard = (props: PToastCardProps) => {
  const handleAnimationEnd: JSX.EventHandler<HTMLDivElement, AnimationEvent> = (event) => {
    if (
      props.closing &&
      event.target === event.currentTarget &&
      event.animationName === 'toast-exit'
    ) {
      props.onExitComplete?.()
    }
  }
  return (
    <div
      class={cx(
        'mb-2 min-h-0 min-w-0 w-full flex-none last:mb-0 motion-reduce:[animation-duration:1ms]',
        props.closing ? 'overflow-hidden animate-toast-exit' : 'animate-toast-enter',
      )}
      role={props.notification.tone === 'error' ? 'alert' : 'status'}
      aria-atomic="true"
      onAnimationEnd={handleAnimationEnd}
    >
      <PScribblePanel enabled={props.sceneStyle === 'scribble'} class="min-w-0 w-full">
        <div
          class={cx(
            'pointer-events-auto flex min-h-8 min-w-0 w-full items-center gap-2 bg-surface px-3 py-0.5',
            'text-sm leading-5 text-foreground shadow-panel backdrop-blur-surface',
            props.sceneStyle === 'scribble'
              ? 'rounded-none border-0'
              : 'border border-solid border-border rounded-control',
          )}
        >
          <span
            aria-hidden="true"
            class={cx(
              'size-4.5 flex-none',
              props.notification.tone === 'error'
                ? 'i-tabler-alert-circle text-danger'
                : 'i-tabler-info-circle text-highlight',
            )}
          />
          <POverflowMarquee class="flex-1" text={props.notification.message} />
          <HButton.Root
            aria-label={m.toast_close()}
            class={cx(
              'size-6 flex flex-none cursor-pointer items-center justify-center',
              'border-0 rounded-control bg-transparent p-0 text-foreground outline-none',
              'hover:bg-surface-interactive focus-visible:shadow-focus disabled:cursor-default',
            )}
            disabled={props.closing}
            onClick={props.onDismiss}
          >
            <span aria-hidden="true" class="i-tabler-x size-4 flex-none" />
          </HButton.Root>
        </div>
      </PScribblePanel>
    </div>
  )
}
