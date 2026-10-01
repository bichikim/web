import * as m from '@paraglide/message'
import {createMemo, Show} from 'solid-js'
import {
  type DrawnTarotCard,
  TAROT_ARTWORK,
  type TarotLocale,
  type TarotSpreadPosition,
} from '../../features/tarot'
import {CARD_COLUMN_SIZE, CARD_FRAME_SIZE} from './card-layout'
import {Image} from '../image'
import {CardPlaceholder} from './CardPlaceholder'

export interface TarotCardViewProps {
  readonly showUpright?: boolean
  readonly card: DrawnTarotCard
  readonly locale: TarotLocale
  readonly position?: TarotSpreadPosition
}

export const TarotCardView = (props: TarotCardViewProps) => {
  const direction = createMemo(() =>
    props.card.orientation === 'reversed' ? m.tarot_reversed() : m.tarot_upright(),
  )
  const artwork = createMemo(() => TAROT_ARTWORK[props.card.id])
  const isFlipped = () => props.card.orientation === 'reversed' && props.showUpright === false

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
      <div
        classList={{
          'rotate-180': isFlipped(),
        }}
        class={`relative w-full shrink-0 overflow-hidden rounded-[5%]
          bg-[#33251b] shadow-[0_8px_20px_#0004] [container-type:inline-size] ${CARD_FRAME_SIZE}`}
      >
        <Image
          alt=""
          class="h-full w-full"
          imageClass="object-contain"
          height={1536}
          src={artwork()?.image}
          width={1024}
          placeholder={<CardPlaceholder />}
          fallback={
            <CardPlaceholder>
              <h3
                classList={{'rotate-180': isFlipped()}}
                class="m-0 break-keep p-4 text-center text-base font-650 leading-relaxed text-[#d8b97e]"
              >
                {props.card.name[props.locale]}
              </h3>
            </CardPlaceholder>
          }
        >
          <span
            class="pointer-events-none absolute left-[41%] top-[1.7%] flex h-[5.2%] w-[18%]
              items-center justify-center font-750 leading-none text-[#56391f]
              [font-size:clamp(0.375rem,4cqi,0.875rem)]"
          >
            {artwork()?.marker[props.locale]}
          </span>
          <h3
            class="pointer-events-none absolute bottom-[5.5%] left-[15%] m-0 flex h-[11%] w-[70%]
              items-center justify-center break-keep text-center font-750 leading-tight text-[#56391f]
              [font-size:clamp(0.5rem,5cqi,1.125rem)]"
          >
            {props.card.name[props.locale]}
          </h3>
        </Image>
      </div>
    </article>
  )
}
