import {A} from '@solidjs/router'
import {SReadingPolicy} from '../components/home/SReadingPolicy'
import {SPageMetadata} from '../components/metadata/SPageMetadata'

export default function About() {
  return (
    <>
      <SPageMetadata path="/about" title="서비스 소개" />
      <section class="mx-auto max-w-2xl py-14 sm:py-20">
        <p class="mb-4 text-sm font-medium text-[#65488a]">ABOUT FORTUNE</p>
        <h1 class="text-3xl font-semibold leading-snug tracking-tight sm:text-4xl">
          글로 보는 풀이를,
          <br />
          목소리로 만나는 시간.
        </h1>
        <div class="mt-8 space-y-5 text-[#655d6c]">
          <p>
            Fortune은 사주와 타로 풀이를 캐릭터가 읽어주는 서비스예요. 나의 성향이나 지금의 고민을
            조금 다른 시선으로 돌아볼 수 있도록 준비하고 있어요.
          </p>
          <p>첫 버전에서는 풀이와 음성 낭독을 제공할 예정이에요.</p>
          <p class="text-sm">풀이는 나를 돌아보기 위한 참고로 즐겨주세요.</p>
        </div>
        <SReadingPolicy />
        <A class="fortune-link" href="/">
          처음으로 돌아가기
        </A>
      </section>
    </>
  )
}
