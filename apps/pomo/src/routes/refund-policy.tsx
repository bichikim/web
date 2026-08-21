import {A} from '@solidjs/router'
import {cx} from 'class-variance-authority'

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
const FORMULA_CLASSES = cx(
  'mb-0 mt-5 rounded-5 border border-#f2a7b8/20 bg-#f2a7b8/7 px-5 py-4',
  'text-center text-sm font-750 leading-7 text-#ffd4de xs:text-base',
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
      실물 응원 굿즈와 주간·월간 서비스 접근권의 청약철회, 계약 해지 및 환불 기준을 안내합니다.
    </p>
    <p class="mb-0 mt-3 text-xs text-#a99cab">시행일 2026년 8월 19일 · 문서 버전 1.0</p>
  </header>
)

const PolicyNavigation = () => (
  <nav aria-label="환불 정책 목차" class="lg:sticky lg:top-8 lg:self-start">
    <p class="m-0 text-xs font-750 tracking-[0.18em] text-#8f8297 uppercase">Contents</p>
    <ol class="mb-0 mt-4 grid list-none gap-3 p-0 text-sm">
      <li>
        <a class={CONTENT_LINK_CLASSES} href="#withdrawal-period">
          1. 청약철회 신청 기간
        </a>
      </li>
      <li>
        <a class={CONTENT_LINK_CLASSES} href="#goods">
          2. 실물 응원 굿즈
        </a>
      </li>
      <li>
        <a class={CONTENT_LINK_CLASSES} href="#access-pass">
          3. 주간·월간 접근권
        </a>
      </li>
      <li>
        <a class={CONTENT_LINK_CLASSES} href="#nonconforming">
          4. 계약과 다른 제공
        </a>
      </li>
      <li>
        <a class={CONTENT_LINK_CLASSES} href="#request">
          5. 신청 및 반환 방법
        </a>
      </li>
      <li>
        <a class={CONTENT_LINK_CLASSES} href="#refund">
          6. 반품 비용과 환불 시점
        </a>
      </li>
      <li>
        <a class={CONTENT_LINK_CLASSES} href="#disputes">
          7. 증명, 분쟁 및 법령
        </a>
      </li>
    </ol>
  </nav>
)

const PurchasePolicySections = () => (
  <>
    <section class={SECTION_CLASSES} id="withdrawal-period">
      <h2 class={HEADING_CLASSES}>1. 청약철회 신청 기간</h2>
      <p class={PARAGRAPH_CLASSES}>
        소비자는 계약내용에 관한 서면(전자문서 포함)을 받은 날부터{' '}
        <strong class={EMPHASIS_CLASSES}>7일 이내</strong>에 청약철회를 신청할 수 있습니다. 재화
        또는 서비스의 공급이 더 늦게 시작된 경우에는 공급받거나 공급이 시작된 날부터 7일 이내에
        신청할 수 있습니다.
      </p>
      <p class={PARAGRAPH_CLASSES}>
        계약내용에 관한 서면을 받지 못했거나 Pomofi의 주소 등이 적히지 않은 서면을 받은 경우에는
        Pomofi의 주소를 안 날 또는 알 수 있었던 날부터 7일 이내에 신청할 수 있습니다. 청약철회 방해
        행위가 있었던 경우에는 그 행위가 끝난 날부터 7일 이내에 신청할 수 있습니다.
      </p>
      <p class={PARAGRAPH_CLASSES}>
        상품 또는 서비스가 표시·광고 내용과 다르거나 계약내용과 다르게 제공된 경우에는{' '}
        <strong class={EMPHASIS_CLASSES}>
          공급받은 날부터 3개월 이내이면서 그 사실을 안 날 또는 알 수 있었던 날부터 30일 이내
        </strong>
        에 신청할 수 있습니다.
      </p>
    </section>

    <section class={SECTION_CLASSES} id="goods">
      <h2 class={HEADING_CLASSES}>2. 실물 응원 굿즈</h2>
      <p class={PARAGRAPH_CLASSES}>
        단순 변심에 따른 청약철회는 제1항의 기간 안에 신청할 수 있습니다. 소비자는 상품을 받은 상태
        그대로 반환해야 하며, 상품 내용을 확인하기 위한 통상적인 포장 개봉만으로 청약철회가
        제한되지는 않습니다.
      </p>
      <p class={PARAGRAPH_CLASSES}>
        다음 사유가 소비자에게 책임 있는 사유로 발생한 경우에는 청약철회가 제한될 수 있습니다.
      </p>
      <ul class={LIST_CLASSES}>
        <li>상품이 멸실되거나 훼손된 경우(내용 확인을 위한 포장 훼손은 제외)</li>
        <li>사용 또는 일부 소비로 상품 가치가 현저히 감소한 경우</li>
        <li>시간이 지나 재판매가 곤란할 정도로 상품 가치가 현저히 감소한 경우</li>
        <li>복제 가능한 상품의 포장을 훼손한 경우</li>
        <li>
          소비자의 주문에 따라 개별 제작되는 상품으로서 청약철회를 인정하면 Pomofi에 회복하기 어려운
          중대한 피해가 예상되고, Pomofi가 주문 전에 그 사실을 별도로 고지하여 소비자의 전자적
          동의를 받은 경우
        </li>
      </ul>
      <p class={PARAGRAPH_CLASSES}>
        Pomofi는 청약철회 제한 사유를 상품 상세 화면 또는 소비자가 쉽게 볼 수 있는 곳에 명확히
        표시합니다. 필요한 표시나 별도 동의를 갖추지 않은 경우에는 관계 법령이 허용하는 범위에서
        청약철회를 제한하지 않습니다.
      </p>
    </section>

    <section class={SECTION_CLASSES} id="access-pass">
      <h2 class={HEADING_CLASSES}>3. 주간·월간 서비스 접근권</h2>
      <p class={PARAGRAPH_CLASSES}>
        서비스 접근권은 결제가 완료되고 소비자 계정에 이용 권한이 활성화된 때부터 제공이 시작됩니다.
      </p>
      <ul class={LIST_CLASSES}>
        <li>
          <strong class={EMPHASIS_CLASSES}>이용 권한 활성화 전</strong> — 제1항의 기간 안에
          청약철회하면 결제금액 전액을 환불합니다.
        </li>
        <li>
          <strong class={EMPHASIS_CLASSES}>이용 권한 활성화 후</strong> — Pomofi는 소비자에게 유리한
          자율 기준으로 언제든 해지를 허용하고, 환불 신청 접수 시점부터 남은 이용시간에 해당하는
          금액을 환불합니다.
        </li>
        <li>
          <strong class={EMPHASIS_CLASSES}>이용기간 종료 후</strong> — 남은 이용시간이 없으므로
          환불금이 발생하지 않습니다. 다만, 표시·광고 또는 계약과 다르게 제공된 경우의 권리는
          제한되지 않습니다.
        </li>
      </ul>
      <p class={FORMULA_CLASSES}>환불금 = 실제 결제금액 × (남은 이용시간 ÷ 전체 이용시간)</p>
      <p class={PARAGRAPH_CLASSES}>
        원 미만 금액은 소비자에게 유리하게 올림합니다. 할인된 접근권은 정가가 아닌 실제 결제금액을
        기준으로 계산합니다. 환불 신청이 접수되면 해당 접근권의 이용은 종료됩니다.
      </p>
      <p class={PARAGRAPH_CLASSES}>
        상품과 접근권을 함께 판매한 경우에는 각 항목의 실제 결제금액을 구분하여 이 정책에 따라 각각
        환불합니다. Pomofi가 자동 갱신을 제공하는 경우 소비자는 다음 결제 전에 언제든 갱신을 해지할
        수 있으며, 이미 갱신된 이용권은 위 기준에 따라 환불합니다.
      </p>
    </section>
  </>
)

const RefundProcessSections = () => (
  <>
    <section class={SECTION_CLASSES} id="nonconforming">
      <h2 class={HEADING_CLASSES}>4. 표시·광고 또는 계약과 다른 제공</h2>
      <p class={PARAGRAPH_CLASSES}>
        상품 또는 서비스가 표시·광고 내용과 다르거나 계약과 다르게 제공된 경우 소비자는 제1항의 특별
        청약철회 기간 안에 환불, 교환 또는 계약 이행을 요구할 수 있습니다. 이 경우 반품에 필요한
        비용은 Pomofi가 부담합니다.
      </p>
      <p class={PARAGRAPH_CLASSES}>
        Pomofi의 책임으로 서비스를 전혀 이용할 수 없었고 합리적인 기간 안에 복구되지 않은 경우에는
        이용하지 못한 기간에 해당하는 금액을 환불하거나 소비자와 합의하여 이용기간을 연장합니다.
        관계 법령 또는 소비자분쟁해결기준이 더 유리한 권리를 정한 경우에는 그 기준을 적용합니다.
      </p>
    </section>

    <section class={SECTION_CLASSES} id="request">
      <h2 class={HEADING_CLASSES}>5. 신청 및 반환 방법</h2>
      <p class={PARAGRAPH_CLASSES}>
        소비자는 <strong class={EMPHASIS_CLASSES}>Pomofi 앱 내 고객지원</strong> 또는{' '}
        <strong class={EMPHASIS_CLASSES}>구매·결제 화면의 환불 요청 기능</strong>으로 다음 정보를
        보내 신청할 수 있습니다.
      </p>
      <ul class={LIST_CLASSES}>
        <li>주문번호 또는 결제 식별정보</li>
        <li>구매자 확인에 필요한 최소 정보</li>
        <li>환불을 요청하는 상품 또는 접근권</li>
        <li>표시·광고 또는 계약과 다른 제공을 이유로 하는 경우 그 내용을 확인할 수 있는 자료</li>
      </ul>
      <p class={PARAGRAPH_CLASSES}>
        서면으로 청약철회를 신청한 경우에는 서면을 발송한 날에 효력이 발생합니다. 실물 상품은 신청
        안내에 표시된 반품 주소와 방법에 따라 반환합니다. Pomofi는 신청 접수 사실과 처리 결과를
        전자문서로 안내합니다.
      </p>
    </section>

    <section class={SECTION_CLASSES} id="refund">
      <h2 class={HEADING_CLASSES}>6. 반품 비용과 환불 시점</h2>
      <p class={PARAGRAPH_CLASSES}>
        단순 변심에 따른 실물 상품의 반환 비용은 소비자가 부담합니다. Pomofi는 단순 변심을 이유로
        위약금이나 손해배상을 청구하지 않습니다. 상품이 표시·광고 또는 계약과 다르게 제공된 경우의
        반환 비용은 Pomofi가 부담합니다.
      </p>
      <p class={PARAGRAPH_CLASSES}>
        Pomofi는 다음 기준일부터 <strong class={EMPHASIS_CLASSES}>3영업일 이내</strong>에 결제금액을
        환불하거나 환불에 필요한 조치를 합니다.
      </p>
      <ul class={LIST_CLASSES}>
        <li>실물 상품 — 반환된 상품을 받은 날</li>
        <li>서비스 접근권 — 청약철회 또는 환불 신청을 받은 날</li>
        <li>아직 공급하지 않은 상품 또는 서비스 — 청약철회 신청을 받은 날</li>
      </ul>
      <p class={PARAGRAPH_CLASSES}>
        카드 등 결제수단을 사용한 경우 Pomofi는 지체 없이 결제 취소 또는 환급을 요청합니다.
        결제사업자의 처리 일정에 따라 실제 입금 시점은 달라질 수 있습니다. Pomofi가 법정 환급기한을
        넘긴 경우에는 관계 법령에 따른 지연배상금을 지급합니다.
      </p>
    </section>
  </>
)

const LegalPolicySection = () => (
  <section class={SECTION_CLASSES} id="disputes">
    <h2 class={HEADING_CLASSES}>7. 증명, 분쟁 및 법령의 우선 적용</h2>
    <p class={PARAGRAPH_CLASSES}>
      계약 체결·공급 시기, 이용 개시 여부, 상품 훼손의 책임 등 청약철회 제한과 관련하여 다툼이 있는
      경우 관계 법령에 따라 Pomofi가 필요한 사실을 증명합니다.
    </p>
    <p class={PARAGRAPH_CLASSES}>
      이 정책은{' '}
      <a
        class="font-700 text-#ffc0ce underline underline-offset-4 hover:text-#ffd4de"
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
        <A class="w-fit text-sm font-700 text-#d8cbd9 no-underline hover:text-white" href="/">
          ← Pomofi로 돌아가기
        </A>

        <PolicyIntro />
        <div class="grid gap-8 lg:grid-cols-[13rem_minmax(0,1fr)] lg:items-start">
          <PolicyNavigation />
          <PolicyArticle />
        </div>

        <footer class={FOOTER_CLASSES}>
          <div>
            <p class="m-0 font-700 text-#a99cab">환불 접수 및 문의</p>
            <p class="mb-0 mt-1">Pomofi 앱 내 고객지원 또는 구매·결제 화면의 환불 요청 기능</p>
          </div>
          <span>© Pomofi</span>
        </footer>
      </div>
    </main>
  )
}
