export const TextMoodInsufficientResult = () => (
  <article
    aria-labelledby="text-mood-insufficient-title"
    class="mt-8 rounded-6 border border-#c99b6e/45 bg-#33282f p-5 sm:p-7"
  >
    <div class="flex items-start gap-4">
      <span aria-hidden="true" class="text-4xl leading-none">
        ❓
      </span>
      <div>
        <p class="m-0 text-xs font-750 tracking-[0.18em] text-#e9b982 uppercase">분석 단서 부족</p>
        <h2 class="mb-0 mt-2 text-xl font-800 text-#fff1e7" id="text-mood-insufficient-title">
          조금 더 구체적으로 적어 주세요
        </h2>
        <p class="mb-0 mt-3 text-sm leading-6 text-#cabac2">
          ‘뚜두둥’처럼 소리만 있는 표현은 열두 분위기 중 하나로 억지로 분류하지 않아요. 무슨 일이
          있었는지, 어떤 느낌인지 한마디만 덧붙여 주세요.
        </p>
      </div>
    </div>
  </article>
)
