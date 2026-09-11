import {A} from '@solidjs/router'
import {cx} from 'class-variance-authority'

import {AiConversationCard} from './AiConversationCard'
import {HwpCard} from './HwpCard'
import {ImageGenerationCard} from './ImageGenerationCard'
import {OptionsCard} from './OptionsCard'
import {StorageCard} from './StorageCard'
import {CARD_CLASSES} from './shared'
import {SoundGenerationCard} from './SoundGenerationCard'
import {TextMoodCard} from './TextMoodCard'

export function HomeCards() {
  return (
    <div class="mt-10 grid gap-4 md:grid-cols-2">
      <ImageGenerationCard />
      <SoundGenerationCard />
      <A class={CARD_CLASSES} href="/dev/sound-player">
        <h2>효과음 플레이어</h2>
        <p>여러 환경음을 함께 반복하고 개별 음량을 조절해요.</p>
      </A>
      <A class={CARD_CLASSES} href="/dev/loop-player">
        <h2>크로스페이드 루프 플레이어</h2>
        <p>같은 음원을 기본 4초씩 겹쳐 반복 재생해요.</p>
      </A>
      <A class={CARD_CLASSES} href="/dev/sound-loop">
        <h2>루프 연결</h2>
        <p>한 음원의 끝과 시작을 연결하고 반복 재생으로 비교해요.</p>
      </A>
      <A class={CARD_CLASSES} href="/dev/sound-joining">
        <h2>소리 연결</h2>
        <p>두 오디오의 연결 구간을 AI로 생성해요.</p>
      </A>
      <A class={CARD_CLASSES} href="/dev/focus-room-layer-review">
        <div class="flex items-start justify-between gap-5">
          <div>
            <p class="m-0 text-xs font-700 tracking-[0.2em] text-#f0c99a uppercase">
              PixiJS · Layer review
            </p>
            <h2 class="mb-0 mt-3 text-2xl font-750">집중방 캐릭터 프리뷰</h2>
            <p class="mb-0 mt-3 max-w-sm text-sm leading-6 text-#aaa0b1">
              시간대·행동·시선별 장면과 캐릭터 레이어, 움직임을 한 화면에서 확인해요.
            </p>
          </div>
          <span class="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-#f0c99a/12 text-xl text-#f4d7b5">
            ◉
          </span>
        </div>
        <span class="mt-8 text-sm font-700 text-#f4d7b5">프리뷰 열기 →</span>
      </A>

      <A class={CARD_CLASSES} href="/dev/character">
        <div class="flex items-start justify-between gap-5">
          <div>
            <p class="m-0 text-xs font-700 tracking-[0.2em] text-#9ed6bb uppercase">
              Babylon.js · Blender
            </p>
            <h2 class="mb-0 mt-3 text-2xl font-750">3D 캐릭터 스튜디오</h2>
            <p class="mb-0 mt-3 max-w-sm text-sm leading-6 text-#aaa0b1">
              GLB 캐릭터를 렌더링하고 Blender에서 내보낸 모델로 바로 교체해요.
            </p>
          </div>
          <span class="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-#9ed6bb/12 text-xl text-#b8e8d0">
            ◇
          </span>
        </div>
        <span class="mt-8 text-sm font-700 text-#b8e8d0">3D 실험실 열기 →</span>
      </A>
      <AiConversationCard />

      <A class={CARD_CLASSES} href="/dev/voice">
        <div class="flex items-start justify-between gap-5">
          <div>
            <p class="m-0 text-xs font-700 tracking-[0.2em] text-#f2a7b8 uppercase">
              Supertonic 3 · On-device
            </p>
            <h2 class="mb-0 mt-3 text-2xl font-750">음성 생성 스튜디오</h2>
            <p class="mb-0 mt-3 max-w-sm text-sm leading-6 text-#aaa0b1">
              기존 음성 생성 흐름을 독립된 페이지에서 준비하고 검증해요.
            </p>
          </div>
          <span class="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-#f2a7b8/12 text-xl text-#ffc0ce">
            ♪
          </span>
        </div>
        <span class="mt-8 text-sm font-700 text-#ffc0ce">음성 실험실 열기 →</span>
      </A>

      <A class={CARD_CLASSES} href="/dev/dialogue">
        <div class="flex items-start justify-between gap-5">
          <div>
            <p class="m-0 text-xs font-700 tracking-[0.2em] text-#9ed6bb uppercase">
              Qwen3.5 + Gemma 4 · WebGPU
            </p>
            <h2 class="mb-0 mt-3 text-2xl font-750">답변 생성 실험실</h2>
            <p class="mb-0 mt-3 max-w-sm text-sm leading-6 text-#aaa0b1">
              같은 요청으로 Qwen 3종과 Gemma q4·모바일 q2f16 답변을 나란히 비교해요.
            </p>
          </div>
          <span
            class={cx(
              'grid h-11 w-11 shrink-0 place-items-center rounded-full bg-#9ed6bb/12',
              'text-sm font-800 text-#b8e8d0',
            )}
          >
            Aa
          </span>
        </div>
        <span class="mt-8 text-sm font-700 text-#b8e8d0">답변 실험실 열기 →</span>
      </A>

      <HwpCard />

      <A class={CARD_CLASSES} href="/dev/chat">
        <div class="flex items-start justify-between gap-5">
          <div>
            <p class="m-0 text-xs font-700 tracking-[0.2em] text-#f2a7b8 uppercase">
              Qwen3.5 + Gemma 4 · Context memory
            </p>
            <h2 class="mb-0 mt-3 text-2xl font-750">온디바이스 채팅</h2>
            <p class="mb-0 mt-3 max-w-sm text-sm leading-6 text-#aaa0b1">
              Qwen과 Gemma 모델을 바꾸며 오래된 대화는 기억 메모로 압축해 이어 가요.
            </p>
          </div>
          <span class="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-#f2a7b8/12 text-xl text-#ffc0ce">
            ◌
          </span>
        </div>
        <span class="mt-8 text-sm font-700 text-#ffc0ce">채팅 열기 →</span>
      </A>

      <A class={CARD_CLASSES} href="/dev/speech-to-text">
        <div class="flex items-start justify-between gap-5">
          <div>
            <p class="m-0 text-xs font-700 tracking-[0.2em] text-#9ed6bb uppercase">
              Whisper tiny · WebGPU / WASM
            </p>
            <h2 class="mb-0 mt-3 text-2xl font-750">한국어 받아쓰기</h2>
            <p class="mb-0 mt-3 max-w-sm text-sm leading-6 text-#aaa0b1">
              마이크로 녹음한 한국어를 서버 전송 없이 브라우저 안에서 글로 바꿔요.
            </p>
          </div>
          <span class="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-#9ed6bb/12 text-xl text-#b8e8d0">
            ●
          </span>
        </div>
        <span class="mt-8 text-sm font-700 text-#b8e8d0">받아쓰기 실험실 열기 →</span>
      </A>

      <TextMoodCard />
      <StorageCard />
      <OptionsCard />
    </div>
  )
}
