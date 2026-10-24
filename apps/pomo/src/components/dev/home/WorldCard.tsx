import {A} from '@solidjs/router'

import {CARD_CLASSES} from './shared'

export function WorldCard() {
  return (
    <A class={CARD_CLASSES} href="/dev/3d-world">
      <div class="flex items-start justify-between gap-5">
        <div>
          <p class="m-0 text-xs font-700 tracking-[0.2em] text-#f0c99a uppercase">
            Babylon.js · PBR Lookdev
          </p>
          <h2 class="mb-0 mt-3 text-2xl font-750">3D 월드 조명 실험실</h2>
          <p class="mb-0 mt-3 max-w-sm text-sm leading-6 text-#aaa0b1">
            네모 하나로 환경광, PBR 재질, 그림자와 톤 매핑을 먼저 맞춰요.
          </p>
        </div>
        <span class="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-#f0c99a/12 text-xl text-#f5d6ad">
          ◆
        </span>
      </div>
      <span class="mt-8 text-sm font-700 text-#f5d6ad">조명 실험실 열기 →</span>
    </A>
  )
}
