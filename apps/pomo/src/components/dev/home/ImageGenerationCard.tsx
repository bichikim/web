import {A} from '@solidjs/router'
import {CARD_CLASSES} from './shared'

export const ImageGenerationCard = () => (
  <A class={CARD_CLASSES} href="/dev/image-generation">
    <div>
      <p class="m-0 text-xs font-700 tracking-[0.2em] text-#f0c99a uppercase">
        Bonsai Image 4B · WebGPU
      </p>
      <h2 class="mb-0 mt-3 text-2xl font-750">이미지 생성 스튜디오</h2>
      <p class="mb-0 mt-3 max-w-sm text-sm leading-6 text-#aaa0b1">
        오늘의 생각을 영어 프롬프트로 다듬고, 기기 안에서 한 장의 그림으로 만들어요.
      </p>
    </div>
    <span class="mt-8 text-sm font-700 text-#f4d7b5">이미지 생성 열기 →</span>
  </A>
)
