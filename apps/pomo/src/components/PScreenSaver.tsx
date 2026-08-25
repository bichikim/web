import {createEffect, onMount, Show} from 'solid-js'

import {POverflowMarquee} from './POverflowMarquee'
import * as m from '@paraglide/message'

const CLASSES = {
  screenSaver: [
    'pomo-screen-saver w-screen max-w-[none] h-dvh max-h-[none] box-border m-0 border-0 bg-[#000]',
    'pt-[max(1.5rem,_var(--pomo-safe-area-inset-top))]',
    'pr-[max(1.5rem,_var(--pomo-safe-area-inset-right))]',
    'pb-[max(1.5rem,_var(--pomo-safe-area-inset-bottom))]',
    'pl-[max(1.5rem,_var(--pomo-safe-area-inset-left))]',
    'text-[rgb(255_255_255_/_48%)] cursor-pointer outline-none overscroll-none',
    '[&::backdrop]:bg-[#000]',
  ].join(' '),
  screenSaverContent: [
    'pomo-screen-saver__content grid w-[min(calc(100%_-_4rem),_22rem)] justify-items-stretch gap-7',
    'animate-screen-saver-content-drift text-left',
    'motion-reduce:[animation-duration:64s]',
    'motion-reduce:[animation-timing-function:steps(4,_jump-none)]',
  ].join(' '),
  screenSaverHint: [
    'pomo-screen-saver__hint text-[rgb(255_255_255_/_46%)] text-xs leading-4.5 m-[0.25rem_0_0]',
    'font-normal',
  ].join(' '),
  screenSaverSafeArea: [
    'pomo-screen-saver__safe-area absolute',
    'top-[max(1.5rem,_var(--pomo-safe-area-inset-top))]',
    'right-[max(1.5rem,_var(--pomo-safe-area-inset-right))]',
    'bottom-[max(1.5rem,_var(--pomo-safe-area-inset-bottom))]',
    'left-[max(1.5rem,_var(--pomo-safe-area-inset-left))]',
    'grid place-items-center pointer-events-none',
  ].join(' '),
  screenSaverTimer: [
    'pomo-screen-saver__timer grid justify-items-start gap-1.5',
    '[&_>_span]:text-[rgb(255_255_255_/_46%)] [&_>_span]:text-sm [&_>_span]:font-semibold',
    '[&_>_span]:leading-5 [&_>_strong]:text-[rgb(255_255_255_/_52%)]',
    '[&_>_strong]:text-[clamp(3rem,_16vw,_5rem)] [&_>_strong]:tabular-nums',
    '[&_>_strong]:font-bold [&_>_strong]:tracking-[-0.04em] [&_>_strong]:leading-[1]',
  ].join(' '),
  screenSaverTrack: [
    'pomo-screen-saver__track grid w-full max-w-full gap-1 [&_>_p]:min-w-0 [&_>_p]:m-0',
    '[&_>_p]:relative',
    '[&_>_p]:text-[rgb(255_255_255_/_48%)] [&_>_p]:text-base [&_>_p]:font-semibold [&_>_p]:leading-6',
    '[&_>_span]:min-w-0 [&_>_span]:text-[rgb(255_255_255_/_46%)]',
    '[&_>_span]:text-[0.8125rem] [&_>_span]:font-normal [&_>_span]:leading-5',
  ].join(' '),
} as const

export interface PScreenSaverProps {
  readonly isActive?: boolean
  readonly isMusicPlaying?: boolean
  readonly onDismiss?: () => void
  readonly timer?: PScreenSaverTimer
  readonly track?: PScreenSaverTrack | null
}

export interface PScreenSaverTimer {
  readonly status: string
  readonly time: string
}

export interface PScreenSaverTrack {
  readonly artist: string
  readonly title: string
}

export const PScreenSaver = (props: PScreenSaverProps) => {
  let dialogElement: HTMLDialogElement | undefined

  const handleDismiss = () => {
    if (dialogElement?.open) {
      dialogElement.close()
    }
    props.onDismiss?.()
  }

  onMount(() => {
    createEffect(() => {
      if (props.isActive ?? false) {
        if (!dialogElement?.open) {
          dialogElement?.showModal()
        }
        return
      }

      if (dialogElement?.open) {
        dialogElement.close()
      }
    })
  })

  return (
    <dialog
      aria-label={m.screen_saver_label()}
      class={CLASSES.screenSaver}
      onCancel={(event) => {
        event.preventDefault()
        handleDismiss()
      }}
      onKeyDown={handleDismiss}
      onPointerDown={handleDismiss}
      ref={(element) => {
        dialogElement = element
      }}
    >
      <div class={CLASSES.screenSaverSafeArea}>
        <div class={CLASSES.screenSaverContent}>
          <Show when={props.timer}>
            {(timer) => (
              <section aria-label={m.screen_saver_pomodoro()} class={CLASSES.screenSaverTimer}>
                <strong>{timer().time}</strong>
                <span>{timer().status}</span>
              </section>
            )}
          </Show>
          <Show when={props.track}>
            {(track) => (
              <section aria-label={m.screen_saver_music()} class={CLASSES.screenSaverTrack}>
                <p>
                  <span
                    aria-hidden="true"
                    class="pomo-screen-saver__playback-icon absolute top-1/2 right-full mr-2 size-4 -translate-y-1/2"
                    classList={{
                      'i-tabler-player-pause': !(props.isMusicPlaying ?? false),
                      'i-tabler-player-play': props.isMusicPlaying ?? false,
                    }}
                  />
                  <POverflowMarquee focusable={false} text={track().title} />
                </p>
                <span>
                  <POverflowMarquee focusable={false} text={track().artist} />
                </span>
                <span class="sr-only">
                  {props.isMusicPlaying
                    ? m.screen_saver_music_playing()
                    : m.screen_saver_music_paused()}
                </span>
              </section>
            )}
          </Show>
          <p aria-hidden="true" class={CLASSES.screenSaverHint}>
            {m.screen_saver_hint()}
          </p>
        </div>
      </div>
      <span class="sr-only">{m.screen_saver_instructions()}</span>
    </dialog>
  )
}
