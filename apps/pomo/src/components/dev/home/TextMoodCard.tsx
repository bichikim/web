import {A} from '@solidjs/router'
import {CARD_CLASSES} from './shared'

export const TextMoodCard = () => (
  <A class={CARD_CLASSES} href="/dev/text-mood">
    <div class="flex items-start justify-between gap-5">
      <div>
        <p class="m-0 text-xs font-700 tracking-[0.2em] text-#f0c99a uppercase">
          MiniLM · 12 moods
        </p>
        <h2 class="mb-0 mt-3 text-2xl font-750">글 분위기 분석</h2>
        <p class="mb-0 mt-3 max-w-sm text-sm leading-6 text-#aaa0b1">
          한국어 문장을 열두 가지 주 분위기와 장난·냉소 말투로 나눠 점수를 비교해요.
        </p>
      </div>
      <span class="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-#f0c99a/12 text-xl text-#f4d7b5">
        😶‍🌫️
      </span>
    </div>
    <span class="mt-8 text-sm font-700 text-#f4d7b5">분위기 실험실 열기 →</span>
  </A>
)
