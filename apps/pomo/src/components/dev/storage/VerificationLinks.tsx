import {A} from '@solidjs/router'
import {cx} from 'class-variance-authority'
import {For} from 'solid-js'

export const VerificationLinks = () => (
  <section aria-labelledby="verify-heading">
    <h2 class="m-0 text-xl font-750" id="verify-heading">
      다시 다운로드 검증
    </h2>
    <div class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <For
        each={
          [
            ['/dev/dialogue', '문장 만들기'],
            ['/dev/voice', '음성 생성'],
            ['/dev/speech-to-text', '받아쓰기'],
            ['/dev/text-mood', '문장 분위기'],
          ] as const
        }
      >
        {([href, label]) => (
          <A
            class={cx(
              'rounded-4 border border-white/10 bg-white/4 px-4 py-4 text-sm font-700',
              'text-#f4d7b5 no-underline hover:bg-white/8',
            )}
            href={href}
          >
            {label} →
          </A>
        )}
      </For>
    </div>
  </section>
)
