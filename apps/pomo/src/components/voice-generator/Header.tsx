export const VoiceHeader = () => (
  <header class="relative flex items-start justify-between gap-5">
    <div>
      <p class="m-0 text-xs font-700 tracking-[0.24em] text-#f2a7b8 uppercase">
        Supertonic voice lab
      </p>
      <h1 class="mb-0 mt-3 text-2xl font-750 tracking--0.02em xs:text-3xl">
        캐릭터의 목소리를 만들어 보세요
      </h1>
      <p class="mb-0 mt-3 max-w-xl text-sm leading-6 text-#bdb2c4 xs:text-base">
        기본 목소리를 고르거나 목소리 스타일 JSON을 불러와 기기 안에서 한국어 음성을 만들어요.
      </p>
    </div>
    <div class="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-#f2a7b8 text-xl text-#2d1723">
      ♪
    </div>
  </header>
)
