import * as m from '@paraglide/message'
import {createMemo, type JSX, Show} from 'solid-js'
import {
  type DrawnTarotCard,
  TAROT_ARTWORK,
  TAROT_CARD_FRAME,
  type TarotLocale,
} from '../../features/tarot'
import {Image} from '../image'
import {CardPlaceholder} from './CardPlaceholder'
import {CARD_FRAME_SIZE} from './card-layout'

interface TarotCardArtworkProps {
  readonly class?: string
  readonly onInspect?: JSX.EventHandler<HTMLButtonElement, MouseEvent>
  readonly showUpright?: boolean
  readonly card: DrawnTarotCard
  readonly locale: TarotLocale
}

export const TarotCardArtwork = (props: TarotCardArtworkProps) => {
  const artwork = createMemo(() => TAROT_ARTWORK[props.card.id])
  const isFlipped = () => props.card.orientation === 'reversed' && props.showUpright === false

  return (
    <div
      class={`relative shrink-0 overflow-hidden rounded-[5%]
          bg-[#33251b] shadow-[0_8px_20px_#0004]
          [container-type:inline-size] ${props.class ?? `w-full ${CARD_FRAME_SIZE}`}`}
      classList={{'rotate-180': isFlipped()}}
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
        <div class="pointer-events-none absolute inset-0">
          <Image
            alt=""
            class="h-full w-full"
            imageClass="object-contain"
            height={1536}
            src={TAROT_CARD_FRAME}
            width={1024}
            placeholder={<CardPlaceholder />}
            fallback={
              <CardPlaceholder>
                <h3
                  class="m-0 break-keep text-center text-sm font-650"
                  classList={{'rotate-180': isFlipped()}}
                >
                  {props.card.name[props.locale]}
                </h3>
              </CardPlaceholder>
            }
          >
            <span
              class="pointer-events-none absolute left-[41%] top-[1.7%] flex h-[5.2%] w-[18%]
              items-center justify-center font-750 leading-none text-[#56391f]
              [font-size:max(0.375rem,4cqi)]"
            >
              {artwork()?.marker[props.locale]}
            </span>
            <h3
              class="pointer-events-none absolute bottom-[5.5%] left-[15%] m-0 flex h-[11%] w-[70%]
              items-center justify-center break-keep text-center font-750 leading-tight text-[#56391f]
              [font-size:max(0.5rem,5cqi)]"
            >
              {props.card.name[props.locale]}
            </h3>
          </Image>
        </div>
      </Image>
      <Show when={props.onInspect}>
        <button
          type="button"
          aria-haspopup="dialog"
          aria-label={m.tarot_card_expand({card: props.card.name[props.locale]})}
          class="absolute inset-0 cursor-zoom-in border-0 bg-transparent p-0
              focus-visible:outline focus-visible:outline-2
              focus-visible:outline-offset-[-4px] focus-visible:outline-[#d8b97e]"
          onClick={(event) => props.onInspect?.(event)}
        />
      </Show>
    </div>
  )
}
