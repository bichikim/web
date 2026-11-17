export function SReadingCards() {
  return (
    <div aria-hidden="true" class="grid h-72 place-items-center sm:h-88">
      <div class="fortune-card -translate-x-16 rotate-[-16deg] border-[#d9cde3] bg-[#eee6f4]">
        <div class="grid h-full place-items-center rounded-2xl border border-[#c7b4d7] text-5xl text-[#65488a]">
          ☾
        </div>
      </div>
      <div class="fortune-card translate-x-16 rotate-[16deg] border-[#d4ddd5] bg-[#e8eee6]">
        <div class="grid h-full place-items-center rounded-2xl border border-[#b7c9b9] text-4xl text-[#516b56]">
          ✧
        </div>
      </div>
      <div class="fortune-card isolate border-[#d9cba9] bg-[#fbf4df] shadow-lg">
        <div
          class="flex h-full flex-col items-center justify-between rounded-2xl border
            border-[#d9cba9] py-5 text-[#78602b]"
        >
          <span class="text-xs tracking-[0.2em]">FORTUNE</span>
          <span class="text-6xl">✦</span>
          <span class="text-xs tracking-widest">YOUR STORY</span>
        </div>
      </div>
    </div>
  )
}
