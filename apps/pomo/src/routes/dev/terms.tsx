import {Meta, Title} from '@solidjs/meta'
import {A} from '@solidjs/router'
import {cx} from 'class-variance-authority'

const MAIN_CLASSES = cx(
  'relative min-h-dvh overflow-x-hidden bg-#17131f px-5 py-10 text-#f8edf1 xs:px-8 xs:py-16',
)
const BACKGROUND_CLASSES = cx(
  'pointer-events-none absolute inset-0',
  'bg-[radial-gradient(circle_at_50%_0%,#594560_0%,#2a2135_34%,#17131f_72%)]',
)
const ARTICLE_CLASSES = cx(
  'rounded-8 border border-white/10 bg-#211a2b/88 p-5',
  'shadow-[0_28px_100px_rgba(5,2,10,0.38)] backdrop-blur-xl xs:p-8',
)
const SECTION_CLASSES = 'border-t border-white/8 pt-8 first:border-0 first:pt-0'
const HEADING_CLASSES = 'mb-0 text-xl font-750 tracking--0.02em text-#f8edf1'
const PARAGRAPH_CLASSES = 'mb-0 mt-3 text-sm leading-7 text-#c7bccb xs:text-base'
const LIST_CLASSES = 'mb-0 mt-4 grid gap-2 pl-5 text-sm leading-7 text-#c7bccb xs:text-base'

const TermsIntro = () => (
  <>
    <header>
      <p class="m-0 text-xs font-750 tracking-[0.24em] text-#f2a7b8 uppercase">Terms of service</p>
      <h1 class="mb-0 mt-4 text-3xl font-800 tracking--0.04em xs:text-5xl">
        Pomo 서비스 이용약관 <span class="text-#f2a7b8">초안</span>
      </h1>
      <p class="mb-0 mt-4 max-w-2xl text-base leading-7 text-#bdb2c4">
        현재 Pomo는 프로토타입 단계입니다. 아래 내용은 정식 서비스 출시 전에 적용할 이용 조건과 운영
        계획을 정리한 초안입니다.
      </p>
      <p class="mb-0 mt-3 text-xs text-#8f8297">초안 검토일: 2026년 8월 11일</p>
    </header>

    <aside class="rounded-5 border border-#f2a7b8/20 bg-#f2a7b8/7 p-5" role="note">
      <h2 class="m-0 text-base font-750 text-#ffd4de">먼저 확인해 주세요</h2>
      <p class="mb-0 mt-2 text-sm leading-6 text-#d8cbd9">
        Pomo가 생성한 음성은 AI 생성물입니다. 타인을 사칭하거나 해치는 용도로 사용할 수 없으며,
        공개할 때는 AI 생성 음성임을 명확히 밝혀야 합니다.
      </p>
    </aside>
  </>
)

export default function TermsPage() {
  return (
    <main class={MAIN_CLASSES}>
      <Title>Pomo — 서비스 이용약관 초안</Title>
      <Meta
        content="Pomo AI 음성 생성 기능과 Supertonic 3 모델의 이용 조건을 안내합니다."
        name="description"
      />
      <div class={BACKGROUND_CLASSES} />

      <div class="relative mx-auto grid w-full max-w-3xl gap-6">
        <A class="w-fit text-sm font-650 text-#bdb2c4 no-underline hover:text-white" href="/dev">
          ← 실험실 목록
        </A>

        <TermsIntro />

        <article class={ARTICLE_CLASSES}>
          <div class="grid gap-8">
            <section class={SECTION_CLASSES} id="purpose">
              <h2 class={HEADING_CLASSES}>제1조 목적</h2>
              <p class={PARAGRAPH_CLASSES}>
                본 약관은 Pomo가 제공하는 온디바이스 AI 음성 생성 기능과 그 결과물의 이용 조건을
                정합니다. 이용자는 기능을 사용하기 전에 본 약관을 확인하고 준수해야 합니다.
              </p>
            </section>

            <section class={SECTION_CLASSES} id="service">
              <h2 class={HEADING_CLASSES}>제2조 서비스와 AI 모델</h2>
              <p class={PARAGRAPH_CLASSES}>
                Pomo의 음성 합성은 Supertonic 3 모델을 이용해 사용자의 기기 안에서 처리됩니다.
                실행에 필요한 모델 파일은 외부 저장소에서 내려받을 수 있으며, 기기·브라우저 환경에
                따라 품질과 처리 시간이 달라질 수 있습니다.
              </p>
              <p class={PARAGRAPH_CLASSES}>
                Supertonic 3 모델에는 BigScience OpenRAIL-M License가 적용됩니다. 이용자는 본 약관과
                해당 모델 라이선스를 함께 준수해야 합니다.
              </p>
            </section>

            <section class={SECTION_CLASSES} id="disclosure">
              <h2 class={HEADING_CLASSES}>제3조 AI 생성 사실의 표시</h2>
              <p class={PARAGRAPH_CLASSES}>
                이용자는 생성 음성을 공개·배포하거나 다른 콘텐츠에 사용할 때 사람이 직접 녹음한
                음성으로 오인되지 않도록 “AI 생성 음성” 등 이해하기 쉬운 방법으로 생성 사실을
                표시해야 합니다.
              </p>
            </section>

            <section class={SECTION_CLASSES} id="restricted-uses">
              <h2 class={HEADING_CLASSES}>제4조 금지 용도</h2>
              <p class={PARAGRAPH_CLASSES}>
                이용자는 Pomo의 AI 모델, 그 파생 모델 또는 생성 음성을 다음 목적으로 사용할 수
                없습니다.
              </p>
              <ol class={LIST_CLASSES}>
                <li>국내외 법령이나 규정을 위반하는 행위</li>
                <li>미성년자를 착취하거나 해치거나, 그러한 행위를 시도하는 행위</li>
                <li>타인을 해칠 목적으로 검증 가능한 허위정보를 생성·유포하는 행위</li>
                <li>개인을 해칠 수 있는 개인정보나 식별정보를 생성·유포하는 행위</li>
                <li>AI 생성 사실을 명확히 밝히지 않고 생성 음성을 공개·유포하는 행위</li>
                <li>타인을 비방·폄하·괴롭히거나 명예를 훼손하는 행위</li>
                <li>당사자의 동의 없이 타인을 사칭하거나 딥페이크를 만드는 행위</li>
                <li>개인의 법적 권리에 불리한 영향을 주는 완전 자동화 의사결정에 사용하는 행위</li>
                <li>사회적 행동이나 개인적 특성을 근거로 개인·집단을 차별하거나 해치는 행위</li>
                <li>연령·사회적·신체적·정신적 취약성을 악용해 신체적·정신적 피해를 주는 행위</li>
                <li>법적으로 보호되는 특성을 근거로 개인·집단을 차별하는 행위</li>
                <li>의학적 조언이나 의료 검사 결과의 해석을 제공하는 행위</li>
                <li>
                  사법·법 집행·이민·망명 절차에서 범죄 가능성 등을 예측하거나 사람을 임의로
                  프로파일링하는 행위
                </li>
              </ol>
            </section>

            <section class={SECTION_CLASSES} id="responsibility">
              <h2 class={HEADING_CLASSES}>제5조 이용자의 책임</h2>
              <ul class={LIST_CLASSES}>
                <li>입력한 문장과 생성 음원을 사용할 적법한 권리를 확보해야 합니다.</li>
                <li>
                  생성 음원의 내용, 공개, 배포 및 후속 사용에 대한 책임은 이용자에게 있습니다.
                </li>
                <li>제3자의 저작권, 퍼블리시티권, 개인정보 및 기타 권리를 침해해서는 안 됩니다.</li>
                <li>생성 음성을 사실 확인이 필요한 전문적 판단의 근거로 사용해서는 안 됩니다.</li>
              </ul>
            </section>

            <section class={SECTION_CLASSES} id="output">
              <h2 class={HEADING_CLASSES}>제6조 생성 결과와 권리</h2>
              <p class={PARAGRAPH_CLASSES}>
                Supertonic 3의 라이선스 제공자는 원칙적으로 이용자가 생성한 결과물에 권리를 주장하지
                않습니다. 다만 이는 생성 결과의 저작권이나 상업적 이용 가능성을 보장하는 의미가
                아니며, 이용자는 관련 법령과 제3자 권리를 직접 확인해야 합니다.
              </p>
            </section>

            <section class={SECTION_CLASSES} id="availability">
              <h2 class={HEADING_CLASSES}>제7조 서비스 제공과 제한</h2>
              <p class={PARAGRAPH_CLASSES}>
                Pomo는 실험적 기능을 포함할 수 있으며 특정 품질, 정확성, 연속성 또는 목적 적합성을
                보장하지 않습니다. 약관 위반, 보안 위험 또는 운영상 필요가 있는 경우 기능 사용을
                제한하거나 제공 내용을 변경할 수 있습니다.
              </p>
            </section>

            <section class={SECTION_CLASSES} id="license">
              <h2 class={HEADING_CLASSES}>제8조 제3자 라이선스</h2>
              <p class={PARAGRAPH_CLASSES}>
                Supertonic 3의 모델 사용에는 원문 라이선스가 우선 적용됩니다. 자세한 조건은{' '}
                <a
                  class="font-650 text-#ffc0ce underline underline-offset-3"
                  href="https://huggingface.co/Supertone/supertonic-3/blob/3cadd1e/LICENSE"
                  rel="noreferrer"
                  target="_blank"
                >
                  Supertonic 3 OpenRAIL-M License
                </a>
                에서 확인할 수 있습니다.
              </p>
            </section>

            <section class={SECTION_CLASSES} id="changes">
              <h2 class={HEADING_CLASSES}>제9조 약관 변경</h2>
              <p class={PARAGRAPH_CLASSES}>
                관련 법령, 서비스 기능 또는 제3자 모델 라이선스가 변경되면 본 약관을 개정할 수
                있습니다. 중요한 변경은 시행 전에 서비스 화면에서 알리며, 개정 후 기능을 계속
                사용하면 변경된 약관에 동의한 것으로 봅니다.
              </p>
            </section>
          </div>
        </article>

        <footer class="flex flex-wrap items-center justify-between gap-3 text-xs text-#8f8297">
          <span>© Pomo</span>
          <A class="font-650 text-#bdb2c4 no-underline hover:text-white" href="/dev/voice">
            음성 생성 스튜디오로 돌아가기 →
          </A>
        </footer>
      </div>
    </main>
  )
}
