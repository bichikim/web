import {A} from '@solidjs/router'
import {SFortuneTeller} from '../components/home/SFortuneTeller'
import {SReadingPolicy} from '../components/home/SReadingPolicy'
import {SPageMetadata} from '../components/metadata/SPageMetadata'

export default function Home() {
  return (
    <>
      <SPageMetadata />
      <section class="grid items-center gap-4 py-12 sm:py-20 md:grid-cols-2 md:gap-12">
        <div>
          <p class="mb-5 text-sm font-medium text-[#65488a]">사주와 타로, 캐릭터의 목소리로</p>
          <h1 class="text-4xl font-semibold leading-snug tracking-tight sm:text-5xl sm:leading-snug">
            당신의 이야기를,
            <br />
            조금 다른 시선으로.
          </h1>
          <p class="mt-6 max-w-sm text-base text-[#655d6c]">
            나의 성향이 궁금한 날에도, 작은 고민이 생긴 날에도.
            <br class="hidden sm:block" />
            캐릭터가 들려주는 사주와 타로를 만나보세요.
          </p>
          <div class="mt-8 flex flex-wrap items-center gap-4">
            <A class="fortune-link" href="/about">
              Fortune 알아보기
            </A>
            <span class="text-sm text-[#655d6c]">첫 만남을 준비하고 있어요</span>
          </div>
        </div>
        <SFortuneTeller />
      </section>
      <section aria-labelledby="readings-title" class="border-y border-[#e8e2dc] py-10 sm:py-12">
        <h2 class="mb-7 text-xl font-semibold tracking-tight" id="readings-title">
          나를 만나는 두 가지 방법
        </h2>
        <div class="grid gap-8 sm:grid-cols-2 sm:gap-12">
          <article>
            <h3 class="mb-2 text-lg font-semibold text-[#65488a]">사주</h3>
            <p class="text-sm text-[#655d6c]">태어난 날을 바탕으로 나의 성향과 고민을 풀어봐요.</p>
          </article>
          <article>
            <h3 class="mb-2 text-lg font-semibold text-[#516b56]">타로</h3>
            <p class="text-sm text-[#655d6c]">
              직접 고른 카드에서 지금의 고민을 바라볼 단서를 찾아요.
            </p>
          </article>
        </div>
      </section>
      <SReadingPolicy />
    </>
  )
}
