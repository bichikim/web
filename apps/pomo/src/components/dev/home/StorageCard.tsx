import {A} from '@solidjs/router'

import {CARD_CLASSES} from './shared'

export const StorageCard = () => (
  <A class={CARD_CLASSES} href="/dev/storage">
    <div class="flex items-start justify-between gap-5">
      <div>
        <p class="m-0 text-xs font-700 tracking-[0.2em] text-#f0c99a uppercase">Cache API · OPFS</p>
        <h2 class="mb-0 mt-3 text-2xl font-750">모델 저장소 관리</h2>
        <p class="mb-0 mt-3 max-w-sm text-sm leading-6 text-#aaa0b1">
          저장된 모델과 다운로드 조각을 지우고 최초 다운로드 흐름을 다시 검증해요.
        </p>
      </div>
      <span class="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-#f0c99a/12 text-xl text-#f4d7b5">
        ▣
      </span>
    </div>
    <span class="mt-8 text-sm font-700 text-#f4d7b5">저장소 열기 →</span>
  </A>
)
