import {A} from '@solidjs/router'

import {CARD_CLASSES} from './shared'

export const OptionsCard = () => (
  <A class={CARD_CLASSES} href="/dev/options">
    <div class="flex items-start justify-between gap-5">
      <div>
        <p class="m-0 text-xs font-700 tracking-[0.2em] text-#9ed6bb uppercase">
          Local preferences · Reset
        </p>
        <h2 class="mb-0 mt-3 text-2xl font-750">각종 옵션 초기화</h2>
        <p class="mb-0 mt-3 max-w-sm text-sm leading-6 text-#aaa0b1">
          저장된 설정과 What’s new 열람 상태를 골라서 기본값으로 되돌려요.
        </p>
      </div>
      <span class="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-#9ed6bb/12 text-xl text-#b8e8d0">
        ↺
      </span>
    </div>
    <span class="mt-8 text-sm font-700 text-#b8e8d0">옵션 관리 열기 →</span>
  </A>
)
