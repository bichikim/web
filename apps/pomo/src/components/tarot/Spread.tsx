import * as m from '@paraglide/message'
import {createMemo, For, Show} from 'solid-js'
import {PHorizontalScroll} from '../p-horizontal-scroll'
import {type DrawnTarotCard, getTarotSpread, type TarotLocale} from '../../features/tarot'
import {TarotCardView} from './TarotCardView'
import {CardPlaceholder} from './CardPlaceholder'
import {CARD_COLUMN_SIZE, CARD_FRAME_SIZE} from './card-layout'

export interface SpreadProps {
  readonly showUpright?: boolean
  readonly cards: ReadonlyArray<DrawnTarotCard>
  readonly count: number
  readonly locale: TarotLocale
}

export const Spread = (props: SpreadProps) => {
  const positions = createMemo(() => getTarotSpread(props.cards.length || props.count))
  const cardLayout =
    'grid grid-flow-col auto-cols-[minmax(12rem,1fr)] justify-items-center gap-2 sm:gap-4'
  return (
    <PHorizontalScroll
      accessibleLabel={m.tarot_tab()}
      buttonClass="border-[#d8b97e80] bg-[#102720ed] text-[#e3c58c]
        hover:bg-[#354638] focus-visible:outline-[#e3c58c]"
      edgeClass="inset-y-10 from-[#102720] to-transparent"
      leftLabel={m.tarot_previous_cards()}
      rightLabel={m.tarot_next_cards()}
      viewportClass="border-t border-solid border-[#d8b97e30] pt-4 pb-3
        focus-visible:outline-[#d8b97e80]"
    >
      <Show
        when={props.cards.length > 0}
        fallback={
          <div aria-hidden="true" class={cardLayout}>
            <For each={Array.from({length: props.count})}>
              {(_, index) => (
                <div class={`flex h-full flex-col gap-2 ${CARD_COLUMN_SIZE}`}>
                  <div
                    class="min-h-6 flex items-center justify-center text-xs
                      font-650 tracking-widest text-[#d8b97e] sm:text-sm"
                  >
                    {positions()[index()]?.name[props.locale]}
                  </div>
                  <div class={`w-full shrink-0 shadow-[0_8px_20px_#0005] ${CARD_FRAME_SIZE}`}>
                    <CardPlaceholder />
                  </div>
                </div>
              )}
            </For>
          </div>
        }
      >
        <div class={cardLayout}>
          <For each={props.cards}>
            {(card, index) => (
              <TarotCardView
                card={card}
                locale={props.locale}
                showUpright={props.showUpright}
                position={positions()[index()]}
              />
            )}
          </For>
        </div>
      </Show>
    </PHorizontalScroll>
  )
}
