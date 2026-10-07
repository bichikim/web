import * as m from '@paraglide/message'
import {clientOnly} from '@solidjs/start'
import {createMemo, createSignal, type JSX, Show} from 'solid-js'
import {type DrawnTarotCard, type TarotLocale, type TarotSpreadPosition} from '../../features/tarot'
import {CARD_COLUMN_SIZE} from './card-layout'
import {TarotCardArtwork} from './TarotCardArtwork'
import {useCardExpansion} from './use-card-expansion'

const TarotCardDepthView = clientOnly(
  async () => {
    const {TarotCardDepthView: component} = await import('./TarotCardDepthView')
    return {default: component}
  },
  {lazy: true},
)

export interface TarotCardViewProps {
  readonly showUpright?: boolean
  readonly card: DrawnTarotCard
  readonly locale: TarotLocale
  readonly position?: TarotSpreadPosition
}

const handleKeyDown: JSX.EventHandler<HTMLDialogElement, KeyboardEvent> = (event) => {
  if (event.key === 'Escape') {
    event.stopPropagation()
  }
}

export const TarotCardView = (props: TarotCardViewProps) => {
  const direction = createMemo(() =>
    props.card.orientation === 'reversed' ? m.tarot_reversed() : m.tarot_upright(),
  )
  const [dialogElement, setDialogElement] = createSignal<HTMLDialogElement | null>(null)
  const [expandedCard, setExpandedCard] = createSignal<HTMLDivElement | null>(null)
  const expansion = useCardExpansion({dialog: dialogElement, target: expandedCard})
  const handleCancel: JSX.EventHandler<HTMLDialogElement, Event> = (event) => {
    event.preventDefault()
    expansion.handleClose()
  }
  const handleBackdrop: JSX.EventHandler<HTMLDialogElement, PointerEvent> = (event) => {
    if (event.target !== event.currentTarget) {
      return
    }
    event.preventDefault()
    expansion.handleClose()
  }

  return (
    <article
      aria-label={
        props.position ? props.position.name[props.locale] : props.card.name[props.locale]
      }
      class={`flex h-full flex-col gap-2 ${CARD_COLUMN_SIZE}`}
    >
      <div class="min-h-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-[#d8b97e] sm:text-sm">
        <Show when={props.position}>
          {(position) => (
            <span class="font-650 tracking-widest">{position().name[props.locale]}</span>
          )}
        </Show>
        <span class="rounded-full bg-[#d8b97e15] px-2 py-0.5 font-500">{direction()}</span>
      </div>
      <div class="w-full shrink-0" classList={{invisible: expansion.isExpanded()}}>
        <TarotCardArtwork
          card={props.card}
          locale={props.locale}
          showUpright={props.showUpright}
          onInspect={expansion.handleOpen}
        />
      </div>
      <dialog
        ref={setDialogElement}
        aria-label={props.card.name[props.locale]}
        class="fixed inset-0 m-0 h-dvh w-screen max-h-[none] max-w-[none] box-border
          place-items-center overflow-hidden border-0 bg-transparent p-0 pointer-events-auto
          [&[open]]:grid [&::backdrop]:bg-[#0008] [&::backdrop]:backdrop-blur-xl"
        onCancel={handleCancel}
        onClose={expansion.handleClosed}
        onPointerDown={handleBackdrop}
        on:keydown={handleKeyDown}
      >
        <Show when={expansion.isExpanded()}>
          <div
            ref={setExpandedCard}
            data-phase={expansion.phase()}
            style={expansion.style()}
            class="w-[min(100vw,calc(100dvh*2/3))] aspect-[2/3] origin-center
              transition-transform duration-420 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none
              [transform:translate(var(--card-expansion-x),var(--card-expansion-y))_scale(var(--card-expansion-scale))]
              [&[data-phase=collapsed]]:transition-none [&[data-phase=expanding]]:[transform:none]
              [&[data-phase=expanded]]:[transform:none]"
            classList={{'pointer-events-none': expansion.phase() !== 'expanded'}}
          >
            <TarotCardDepthView
              card={props.card}
              locale={props.locale}
              showUpright={props.showUpright}
              fallback={
                <TarotCardArtwork
                  card={props.card}
                  locale={props.locale}
                  showUpright={props.showUpright}
                  class="w-full aspect-[2/3]"
                />
              }
            />
          </div>
          <button
            type="button"
            autofocus
            aria-label={m.common_close()}
            class="absolute left-[max(1rem,var(--pomo-safe-area-inset-left))]
              top-[max(1rem,var(--pomo-safe-area-inset-top))] h-11 w-11 flex items-center justify-center
              rounded-full border border-white/30 bg-black/60 text-xl text-white backdrop-blur-md cursor-pointer
              focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            onClick={expansion.handleClose}
          >
            <span aria-hidden="true" class="i-tabler-x" />
          </button>
        </Show>
      </dialog>
    </article>
  )
}
