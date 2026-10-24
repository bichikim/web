import {A} from '@solidjs/router'
import {CARD_CLASSES} from './shared'

export function SoundGenerationCard() {
  return (
    <A class={CARD_CLASSES} href="/dev/sound-generation">
      <div>
        <p class="m-0 text-xs font-700 tracking-[0.2em] text-#9ed6bb uppercase">
          Stable Audio 3 Small SFX
        </p>
        <h2 class="mb-0 mt-3 text-2xl font-750">환경음 생성 스튜디오</h2>
        <p class="mb-0 mt-3 max-w-sm text-sm leading-6 text-#aaa0b1">
          빗소리, 파도, 숲과 카페의 소리를 텍스트로 묘사하고 환경음 생성을 실험해요.
        </p>
      </div>
      <span class="mt-8 text-sm font-700 text-#b8e8d0">환경음 생성 열기 →</span>
    </A>
  )
}
