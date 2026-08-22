import {A} from '@solidjs/router'
import {cx} from 'class-variance-authority'

import {SERVICE_OPERATOR} from 'src/features/service-operator'
import {PServicePolicyLinks} from 'src/features/service-terms'

const MAIN_CLASSES = cx(
  'relative min-h-dvh overflow-x-hidden bg-#17131f px-5 py-10 text-#f8edf1',
  'xs:px-8 xs:py-16',
)
const BACKGROUND_CLASSES = cx(
  'pointer-events-none absolute inset-0',
  'bg-[radial-gradient(circle_at_50%_0%,#594560_0%,#2a2135_34%,#17131f_72%)]',
)
const ARTICLE_CLASSES = cx(
  'rounded-8 border border-white/10 bg-#211a2b/88 p-5',
  'shadow-[0_28px_100px_rgba(5,2,10,0.38)] backdrop-blur-xl xs:p-8 lg:p-10',
)
const SECTION_CLASSES = 'scroll-mt-8 border-t border-white/8 pt-8 first:border-0 first:pt-0'
const HEADING_CLASSES = 'm-0 text-xl font-750 tracking--0.02em text-#f8edf1'
const PARAGRAPH_CLASSES = 'mb-0 mt-3 text-sm leading-7 text-#d8cbd9 xs:text-base xs:leading-8'
const LIST_CLASSES =
  'mb-0 mt-4 grid list-disc gap-2 pl-5 text-sm leading-7 text-#d8cbd9 xs:text-base xs:leading-8'
const EMPHASIS_CLASSES = 'font-750 text-#ffd4de'
const CONTENT_LINK_CLASSES = cx(
  'text-#d8cbd9 underline decoration-white/25 underline-offset-4 transition-colors',
  'hover:text-white focus-visible:text-white',
)
const FOOTER_CLASSES = cx(
  'grid gap-3 border-t border-white/8 pt-6 text-xs leading-6 text-#8f8297',
  'sm:flex sm:items-end sm:justify-between',
)

const PolicyIntro = () => (
  <header>
    <p class="m-0 text-xs font-750 tracking-[0.24em] text-#f2a7b8 uppercase">
      Consumer refund policy
    </p>
    <h1 class="mb-0 mt-4 max-w-3xl text-3xl font-800 tracking--0.04em xs:text-5xl xs:leading-tight">
      Pomofi 환불 및 청약철회 정책
    </h1>
    <p class="mb-0 mt-5 max-w-3xl text-sm leading-7 text-#d8cbd9 xs:text-base xs:leading-8">
      앱인토스에서 1회 결제로 판매하는 곡·앨범 단위 음악 이용권의 청약철회와 환불 기준을 안내합니다.
    </p>
    <p class="mb-0 mt-3 text-xs text-#a99cab">시행일 2026년 8월 22일 · 문서 버전 1.1</p>
  </header>
)

const PolicyNavigation = () => (
  <nav aria-label="환불 정책 목차" class="lg:sticky lg:top-8 lg:self-start">
    <p class="m-0 text-xs font-750 tracking-[0.18em] text-#8f8297 uppercase">Contents</p>
    <ol class="mb-0 mt-4 grid list-none gap-3 p-0 text-sm">
      <li>
        <a class={CONTENT_LINK_CLASSES} href="#music-license">
          1. 음악 이용권
        </a>
      </li>
      <li>
        <a class={CONTENT_LINK_CLASSES} href="#withdrawal">
          2. 청약철회
        </a>
      </li>
      <li>
        <a class={CONTENT_LINK_CLASSES} href="#nonconforming">
          3. 계약과 다른 제공
        </a>
      </li>
      <li>
        <a class={CONTENT_LINK_CLASSES} href="#request">
          4. 신청 및 처리 방법
        </a>
      </li>
      <li>
        <a class={CONTENT_LINK_CLASSES} href="#refund">
          5. 환불 시점
        </a>
      </li>
      <li>
        <a class={CONTENT_LINK_CLASSES} href="#disputes">
          6. 증명, 분쟁 및 법령
        </a>
      </li>
    </ol>
  </nav>
)

const PurchasePolicySections = () => (
  <>
    <section class={SECTION_CLASSES} id="music-license">
      <h2 class={HEADING_CLASSES}>1. 음악 이용권</h2>
      <p class={PARAGRAPH_CLASSES}>
        Pomofi는 앱인토스에서 곡 또는 앨범 단위의 음악 이용권을 1회 결제로 판매합니다. 이용권에는
        정기결제나 자동 갱신이 없으며, 구매한 앱인토스 계정으로 Pomofi 서비스가 존속하는 동안 해당
        음악을 계속 이용할 수 있습니다.
      </p>
      <p class={PARAGRAPH_CLASSES}>
        음악 이용권은 음원 파일의 소유권이나 지식재산권을 이전하는 상품이 아닙니다. Pomofi는 음악
        파일의 다운로드 기능을 제공하지 않으며, 이용권은 다른 계정이나 사람에게 양도할 수 없습니다.
      </p>
      <p class={PARAGRAPH_CLASSES}>
        가격, 이용 가능한 곡 또는 앨범, 제공 내용과 이용 조건은 구매 전에 표시합니다. Pomofi가
        서비스를 종료하여 구매한 음악을 더 이상 제공할 수 없는 경우에는 관계 법령과
        소비자분쟁해결기준에 따라 처리합니다.
      </p>
    </section>

    <section class={SECTION_CLASSES} id="withdrawal">
      <h2 class={HEADING_CLASSES}>2. 청약철회</h2>
      <p class={PARAGRAPH_CLASSES}>
        소비자는 계약내용에 관한 전자문서를 받은 날부터{' '}
        <strong class={EMPHASIS_CLASSES}>7일 이내</strong>에 청약철회를 신청할 수 있습니다. 음악
        이용권이 더 늦게 활성화된 경우에는 활성화된 날부터 7일 이내에 신청할 수 있습니다.
      </p>
      <p class={PARAGRAPH_CLASSES}>
        구매한 음악의 재생이 시작되면 디지털콘텐츠의 제공이 개시된 것으로 볼 수 있어 청약철회가
        제한될 수 있습니다. Pomofi는 이러한 제한을 적용하려면 구매 전에 제한 사실을 명확히 알리고
        관계 법령이 요구하는 동의를 받으며, 미리듣기 또는 이에 준하는 정보를 제공합니다.
      </p>
      <p class={PARAGRAPH_CLASSES}>
        필요한 사전 고지·동의 또는 시험 사용 수단을 제공하지 않은 경우에는 관계 법령이 보장하는
        청약철회 권리를 제한하지 않습니다.
      </p>
    </section>
  </>
)

const RefundProcessSections = () => (
  <>
    <section class={SECTION_CLASSES} id="nonconforming">
      <h2 class={HEADING_CLASSES}>3. 표시·광고 또는 계약과 다른 제공</h2>
      <p class={PARAGRAPH_CLASSES}>
        음악 이용권이 표시·광고 내용과 다르거나 계약내용과 다르게 제공된 경우 소비자는 공급받은
        날부터 <strong class={EMPHASIS_CLASSES}>3개월 이내</strong>이면서 그 사실을 안 날 또는 알 수
        있었던 날부터 <strong class={EMPHASIS_CLASSES}>30일 이내</strong>에 청약철회 또는 계약
        이행을 요구할 수 있습니다.
      </p>
      <p class={PARAGRAPH_CLASSES}>
        Pomofi의 책임으로 구매한 음악을 이용할 수 없고 합리적인 기간 안에 복구되지 않은 경우에는
        관계 법령과 소비자분쟁해결기준에 따라 환불 또는 이에 상응하는 조치를 제공합니다.
      </p>
    </section>

    <section class={SECTION_CLASSES} id="request">
      <h2 class={HEADING_CLASSES}>4. 신청 및 처리 방법</h2>
      <ul class={LIST_CLASSES}>
        <li>
          Android 결제는 토스 앱의 환불 신청 절차를 이용하며, 쿠웅의 검토 후 Google Play에서 최종
          처리합니다.
        </li>
        <li>iOS 결제의 환불 신청과 결정은 Apple의 환불 절차에 따릅니다.</li>
        <li>
          절차 안내나 추가 지원이 필요하면 주문번호 또는 결제 식별정보와 구매 상품을{' '}
          <a class={CONTENT_LINK_CLASSES} href={`mailto:${SERVICE_OPERATOR.supportEmail}`}>
            {SERVICE_OPERATOR.supportEmail}
          </a>
          로 보내 문의할 수 있습니다.
        </li>
      </ul>
      <p class={PARAGRAPH_CLASSES}>
        쿠웅은 환불 처리에 필요한 최소 정보만 요청하며, 신청 접수 및 처리 결과는 앱인토스 또는
        운영체제별 앱 마켓이 제공하는 방법으로 안내될 수 있습니다.
      </p>
    </section>

    <section class={SECTION_CLASSES} id="refund">
      <h2 class={HEADING_CLASSES}>5. 환불 시점</h2>
      <p class={PARAGRAPH_CLASSES}>
        쿠웅이 직접 환급할 의무가 있는 경우 청약철회 또는 환불 신청을 받은 날부터{' '}
        <strong class={EMPHASIS_CLASSES}>3영업일 이내</strong>에 결제금액을 환급하거나 환급에 필요한
        조치를 합니다. 법정 기한을 넘긴 경우에는 관계 법령에 따른 지연배상금을 지급합니다.
      </p>
      <p class={PARAGRAPH_CLASSES}>
        앱 마켓이 환불을 처리하는 경우 실제 취소 또는 입금 시점은 해당 앱 마켓과 결제수단의 처리
        일정에 따라 달라질 수 있습니다. 환불이 완료되면 해당 음악 이용권은 회수될 수 있습니다.
      </p>
    </section>
  </>
)

const LegalPolicySection = () => (
  <section class={SECTION_CLASSES} id="disputes">
    <h2 class={HEADING_CLASSES}>6. 증명, 분쟁 및 법령의 우선 적용</h2>
    <p class={PARAGRAPH_CLASSES}>
      계약 체결·공급 시기, 음악 재생 개시 여부 등 청약철회 제한과 관련하여 다툼이 있는 경우 관계
      법령에 따라 쿠웅이 필요한 사실을 증명합니다.
    </p>
    <p class={PARAGRAPH_CLASSES}>
      이 정책은{' '}
      <a
        class={CONTENT_LINK_CLASSES}
        href="https://www.law.go.kr/법령/전자상거래등에서의소비자보호에관한법률"
        rel="noreferrer"
        target="_blank"
      >
        「전자상거래 등에서의 소비자보호에 관한 법률」
      </a>{' '}
      제17조 및 제18조를 기본으로 하며, 「콘텐츠산업 진흥법」, 「소비자기본법」 및
      소비자분쟁해결기준 등 적용되는 관계 법령을 따릅니다. 이 정책은 관계 법령이 보장하는 소비자의
      권리를 제한하지 않습니다.
    </p>
  </section>
)

const PolicyArticle = () => (
  <article class={ARTICLE_CLASSES}>
    <div class="grid gap-8">
      <PurchasePolicySections />
      <RefundProcessSections />
      <LegalPolicySection />
    </div>
  </article>
)

export default function RefundPolicyPage() {
  return (
    <main class={MAIN_CLASSES}>
      <div class={BACKGROUND_CLASSES} />

      <div class="relative mx-auto grid w-full max-w-6xl gap-8">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <A class="w-fit text-sm font-700 text-#d8cbd9 no-underline hover:text-white" href="/">
            ← Pomofi로 돌아가기
          </A>
          <PServicePolicyLinks currentPolicy="refund" platform="apps-in-toss" tone="overlay" />
        </div>

        <PolicyIntro />
        <div class="grid gap-8 lg:grid-cols-[13rem_minmax(0,1fr)] lg:items-start">
          <PolicyNavigation />
          <PolicyArticle />
        </div>

        <footer class={FOOTER_CLASSES}>
          <div>
            <p class="m-0 font-700 text-#a99cab">환불 접수 및 문의</p>
            <p class="mb-0 mt-1">
              <a class={CONTENT_LINK_CLASSES} href={`mailto:${SERVICE_OPERATOR.supportEmail}`}>
                {SERVICE_OPERATOR.supportEmail}
              </a>
            </p>
          </div>
          <span>© Pomofi</span>
        </footer>
      </div>
    </main>
  )
}
