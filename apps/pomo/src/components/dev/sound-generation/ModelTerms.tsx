export function ModelTerms() {
  return (
    <section aria-label="모델 이용 조건" class="mt-6 text-sm leading-6 text-#bdb2c4">
      <p class="font-700 text-#f8edf1">Powered by Stability AI</p>
      <p>
        생성 기능을 이용하면{' '}
        <a
          class="text-#b8e8d0 underline"
          href="/licenses/stable-audio-3/stability.txt"
          target="_blank"
          rel="noreferrer"
        >
          Stability AI Community License
        </a>
        와{' '}
        <a
          class="text-#b8e8d0 underline"
          href="/licenses/stable-audio-3/gemma.txt"
          target="_blank"
          rel="noreferrer"
        >
          Gemma 이용 약관
        </a>
        에 동의합니다. 각 약관의 이용 제한과{' '}
        <a
          class="text-#b8e8d0 underline"
          href="https://ai.google.dev/gemma/prohibited_use_policy"
          target="_blank"
          rel="noreferrer"
        >
          Gemma 금지 용도 정책
        </a>
        을 준수해야 합니다.
      </p>
      <a
        class="text-#b8e8d0 underline"
        href="/licenses/stable-audio-3/NOTICE.txt"
        target="_blank"
        rel="noreferrer"
      >
        모델 배포 고지
      </a>
    </section>
  )
}
