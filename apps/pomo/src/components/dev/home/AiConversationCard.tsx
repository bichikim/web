import {A} from '@solidjs/router'

import {CARD_CLASSES} from './shared'

export function AiConversationCard() {
  return (
    <A class={CARD_CLASSES} href="/dev/ai-conversation">
      <div class="flex items-start justify-between gap-5">
        <div>
          <p class="m-0 text-xs font-700 tracking-[0.2em] text-#f2a7b8 uppercase">
            Babylon.js · AI conversation
          </p>
          <h2 class="mb-0 mt-3 text-2xl font-750">AI끼리 대화</h2>
          <p class="mb-0 mt-3 max-w-sm text-sm leading-6 text-#aaa0b1">
            AI 캐릭터가 대화하는 장면을 만들어요. 먼저 기본 캐릭터 한 명을 전체 화면에 띄워요.
          </p>
        </div>
        <span class="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-#f2a7b8/12 text-xl text-#ffc0ce">
          ◌
        </span>
      </div>
      <span class="mt-8 text-sm font-700 text-#ffc0ce">대화 장면 열기 →</span>
    </A>
  )
}
