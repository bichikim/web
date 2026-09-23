import {A} from '@solidjs/router'

import {CARD_CLASSES} from './shared'

export const HwpCard = () => (
  <A class={CARD_CLASSES} href="/dev/hwp">
    <div class="flex items-start justify-between gap-5">
      <div>
        <p class="m-0 text-xs font-700 tracking-[0.2em] text-#f0c99a uppercase">
          rhwp · Rust + WebAssembly
        </p>
        <h2 class="mb-0 mt-3 text-2xl font-750">한글 문서 실험실</h2>
        <p class="mb-0 mt-3 max-w-sm text-sm leading-6 text-#aaa0b1">
          HWP와 HWPX를 브라우저에서 열고 편집한 뒤 다시 저장해 봐요.
        </p>
      </div>
      <span class="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-#f0c99a/12 text-xl text-#f4d7b5">
        한
      </span>
    </div>
    <span class="mt-8 text-sm font-700 text-#f4d7b5">한글 편집기 열기 →</span>
  </A>
)
