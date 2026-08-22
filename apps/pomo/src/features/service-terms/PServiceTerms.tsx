import {Show} from 'solid-js'
import {cx} from 'class-variance-authority'

import {SERVICE_OPERATOR} from 'src/features/service-operator'

import {PServicePolicyLinks} from './PServicePolicyLinks'

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
const CONTENT_LINK_CLASSES = cx(
  'text-#d8cbd9 underline decoration-white/25 underline-offset-4 transition-colors',
  'hover:text-white focus-visible:text-white',
)
const EMPHASIS_CLASSES = 'font-750 text-#ffd4de'
const BACK_LINK_CLASSES =
  'w-fit text-sm font-700 text-#d8cbd9 no-underline hover:text-white focus-visible:text-white'
const FOOTER_CLASSES = cx(
  'grid gap-2 border-t border-white/8 pt-6 text-xs leading-6 text-#8f8297',
  'sm:flex sm:items-end sm:justify-between',
)
const BUSINESS_INFORMATION_CLASSES = cx(
  'mb-0 mt-6 grid max-w-3xl gap-x-6 gap-y-2 rounded-4 border border-white/10',
  'bg-white/4 p-4 text-sm leading-6 text-#d8cbd9 sm:grid-cols-[auto_1fr]',
)

export type ServiceTermsPlatform = 'apps-in-toss' | 'web'

export interface PServiceTermsProps {
  backHref?: string
  backLabel?: string
  platform?: ServiceTermsPlatform
}

const TermsIntro = (props: PServiceTermsProps) => {
  const isAppsInToss = () => props.platform === 'apps-in-toss'

  return (
    <header>
      <p class="m-0 text-xs font-750 tracking-[0.24em] text-#f2a7b8 uppercase">
        <Show fallback="Web terms of service" when={isAppsInToss()}>
          Apps in Toss terms of service
        </Show>
      </p>
      <h1 class="mb-0 mt-4 max-w-3xl text-3xl font-800 tracking--0.04em xs:text-5xl xs:leading-tight">
        Pomofi 서비스 이용약관
      </h1>
      <p class="mb-0 mt-5 max-w-3xl text-sm leading-7 text-#d8cbd9 xs:text-base xs:leading-8">
        Pomofi의 집중 도구, 콘텐츠 및 AI 음성 기능을 이용할 때 적용되는 권리와 의무를 안내합니다.
      </p>
      <p class="mb-0 mt-3 text-xs text-#a99cab">시행일 2026년 8월 22일 · 문서 버전 1.0</p>
      <dl class={BUSINESS_INFORMATION_CLASSES}>
        <dt class="font-750 text-#f8edf1">상호</dt>
        <dd class="m-0">{SERVICE_OPERATOR.businessName}</dd>
        <dt class="font-750 text-#f8edf1">대표자</dt>
        <dd class="m-0">{SERVICE_OPERATOR.representative}</dd>
        <dt class="font-750 text-#f8edf1">사업자등록번호</dt>
        <dd class="m-0">{SERVICE_OPERATOR.businessRegistrationNumber}</dd>
        <dt class="font-750 text-#f8edf1">통신판매업 신고</dt>
        <dd class="m-0">신고 의무 면제(직전 연도 통신판매 거래 50회 미만)</dd>
        <dt class="font-750 text-#f8edf1">사업장 소재지</dt>
        <dd class="m-0">{SERVICE_OPERATOR.businessAddress}</dd>
        <dt class="font-750 text-#f8edf1">고객지원 전화번호</dt>
        <dd class="m-0">{SERVICE_OPERATOR.supportPhone}</dd>
        <dt class="font-750 text-#f8edf1">고객지원</dt>
        <dd class="m-0">
          <a class={CONTENT_LINK_CLASSES} href={`mailto:${SERVICE_OPERATOR.supportEmail}`}>
            {SERVICE_OPERATOR.supportEmail}
          </a>
        </dd>
      </dl>
    </header>
  )
}

const TermsNavigation = () => (
  <nav aria-label="서비스 이용약관 목차" class="lg:sticky lg:top-8 lg:self-start">
    <p class="m-0 text-xs font-750 tracking-[0.18em] text-#8f8297 uppercase">Contents</p>
    <ol class="mb-0 mt-4 grid list-none gap-3 p-0 text-sm">
      <li>
        <a class={CONTENT_LINK_CLASSES} href="#purpose">
          1. 목적과 적용 범위
        </a>
      </li>
      <li>
        <a class={CONTENT_LINK_CLASSES} href="#definitions">
          2. 용어의 정의
        </a>
      </li>
      <li>
        <a class={CONTENT_LINK_CLASSES} href="#agreement">
          3. 약관의 효력과 변경
        </a>
      </li>
      <li>
        <a class={CONTENT_LINK_CLASSES} href="#service">
          4. 서비스의 내용
        </a>
      </li>
      <li>
        <a class={CONTENT_LINK_CLASSES} href="#platform">
          5. 이용 환경
        </a>
      </li>
      <li>
        <a class={CONTENT_LINK_CLASSES} href="#account">
          6. 계정과 이용자의 의무
        </a>
      </li>
      <li>
        <a class={CONTENT_LINK_CLASSES} href="#ai-voice">
          7. AI 음성 기능
        </a>
      </li>
      <li>
        <a class={CONTENT_LINK_CLASSES} href="#restricted-uses">
          8. 금지 행위
        </a>
      </li>
      <li>
        <a class={CONTENT_LINK_CLASSES} href="#rights">
          9. 콘텐츠와 권리
        </a>
      </li>
      <li>
        <a class={CONTENT_LINK_CLASSES} href="#payment">
          10. 결제와 환불
        </a>
      </li>
      <li>
        <a class={CONTENT_LINK_CLASSES} href="#availability">
          11. 변경과 중단
        </a>
      </li>
      <li>
        <a class={CONTENT_LINK_CLASSES} href="#termination">
          12. 이용 종료
        </a>
      </li>
      <li>
        <a class={CONTENT_LINK_CLASSES} href="#responsibility">
          13. 책임 범위
        </a>
      </li>
      <li>
        <a class={CONTENT_LINK_CLASSES} href="#disputes">
          14. 문의와 분쟁 해결
        </a>
      </li>
    </ol>
  </nav>
)

const CoreTermsSections = () => (
  <>
    <section class={SECTION_CLASSES} id="purpose">
      <h2 class={HEADING_CLASSES}>제1조 목적과 적용 범위</h2>
      <p class={PARAGRAPH_CLASSES}>
        본 약관은 개인사업자 {SERVICE_OPERATOR.businessName}(대표자{' '}
        {SERVICE_OPERATOR.representative}, 이하 “쿠웅”)과 이용자 사이에서 Pomofi 서비스의 이용 조건,
        권리와 의무 및 책임 사항을 정합니다. 서비스 화면에서 별도로 안내하는 운영 정책과 개별 기능의
        조건도 본 약관과 함께 적용됩니다.
      </p>
    </section>
    <section class={SECTION_CLASSES} id="definitions">
      <h2 class={HEADING_CLASSES}>제2조 용어의 정의</h2>
      <ul class={LIST_CLASSES}>
        <li>“서비스”란 Pomofi가 제공하는 집중 도구, 콘텐츠, AI 음성 및 관련 기능을 말합니다.</li>
        <li>“이용자”란 본 약관에 따라 서비스를 이용하는 사람을 말합니다.</li>
        <li>
          “이용자 콘텐츠”란 이용자가 서비스에 입력, 저장, 업로드 또는 생성한 문장, 설정, 음원과 기타
          자료를 말합니다.
        </li>
        <li>“플랫폼”이란 서비스가 제공되는 앱인토스 또는 웹 환경을 말합니다.</li>
      </ul>
    </section>
    <section class={SECTION_CLASSES} id="agreement">
      <h2 class={HEADING_CLASSES}>제3조 약관의 효력과 변경</h2>
      <p class={PARAGRAPH_CLASSES}>
        본 약관은 이용자가 쉽게 확인할 수 있도록 서비스 화면에 게시합니다. 이용자가 서비스 이용을
        시작하거나 약관에 동의하면 본 약관이 적용됩니다.
      </p>
      <p class={PARAGRAPH_CLASSES}>
        관련 법령, 서비스 기능 또는 운영 정책이 변경되면 약관을 개정할 수 있습니다. 개정 내용과
        시행일은 시행 전에 서비스 화면으로 알리며, 이용자에게 불리하거나 중요한 변경은 합리적인
        기간을 두고 눈에 띄는 방법으로 안내합니다. 이용자는 변경에 동의하지 않으면 서비스 이용을
        종료할 수 있습니다.
      </p>
    </section>
    <section class={SECTION_CLASSES} id="service">
      <h2 class={HEADING_CLASSES}>제4조 서비스의 내용</h2>
      <p class={PARAGRAPH_CLASSES}>Pomofi는 다음 기능의 전부 또는 일부를 제공합니다.</p>
      <ul class={LIST_CLASSES}>
        <li>포모도로 타이머, 집중 장면, 음악 및 대화 기능</li>
        <li>집중 기록과 이용자 설정의 기기 내 저장</li>
        <li>텍스트를 바탕으로 한 AI 음성 생성 및 재생</li>
        <li>그 밖에 Pomofi가 서비스 화면에서 안내하는 기능</li>
      </ul>
      <p class={PARAGRAPH_CLASSES}>
        일부 기능은 기기 성능, 운영체제, 브라우저, 네트워크 상태 또는 외부 서비스의 지원 범위에 따라
        이용 방법과 품질이 달라질 수 있습니다.
      </p>
    </section>
  </>
)

const PlatformTermsSection = (props: PServiceTermsProps) => (
  <section class={SECTION_CLASSES} id="platform">
    <h2 class={HEADING_CLASSES}>제5조 플랫폼별 이용 환경</h2>
    <Show
      fallback={
        <>
          <p class={PARAGRAPH_CLASSES}>
            웹 서비스는 Pomofi가 안내하는 웹 주소와 지원 브라우저에서 제공됩니다. 브라우저 사업자,
            운영체제 사업자 또는 로그인 제공자의 서비스에는 각 사업자의 약관과 정책이 별도로
            적용됩니다.
          </p>
          <p class={PARAGRAPH_CLASSES}>
            브라우저 저장 공간, 쿠키 또는 네트워크를 차단하면 일부 기능이나 설정 저장이 정상적으로
            동작하지 않을 수 있습니다.
          </p>
        </>
      }
      when={props.platform === 'apps-in-toss'}
    >
      <p class={PARAGRAPH_CLASSES}>
        앱인토스용 서비스는 토스 앱 안의 미니앱 환경에서 제공됩니다. 토스 계정, 토스 앱 및 앱인토스
        플랫폼 자체의 이용에는 토스 또는 플랫폼 운영자가 정한 약관과 정책이 별도로 적용됩니다.
      </p>
      <p class={PARAGRAPH_CLASSES}>
        Pomofi가 직접 제공하는 기능과 콘텐츠에는 본 약관이 적용됩니다. 토스 앱 또는 앱인토스
        플랫폼의 점검, 정책 변경이나 장애로 서비스 이용이 제한될 수 있습니다.
      </p>
    </Show>
  </section>
)

const AccountAndAiSections = (props: PServiceTermsProps) => (
  <>
    <section class={SECTION_CLASSES} id="account">
      <h2 class={HEADING_CLASSES}>제6조 계정과 이용자의 의무</h2>
      <p class={PARAGRAPH_CLASSES}>
        이용자는 본인의 계정과 기기를 안전하게 관리하고, 등록하거나 제공한 정보가 변경되면 최신
        상태로 유지해야 합니다. 계정 또는 인증수단을 제3자에게 양도·대여하거나 부정하게 사용해서는
        안 됩니다.
      </p>
      <Show
        fallback={
          <p class={PARAGRAPH_CLASSES}>
            웹 서비스는 만 14세 이상만 이용할 수 있습니다. 미성년자가 유료 서비스를 구매하는
            경우에는 법정대리인의 동의가 필요할 수 있으며, 동의 없이 체결한 계약은 관계 법령에 따라
            취소될 수 있습니다.
          </p>
        }
        when={props.platform === 'apps-in-toss'}
      >
        <p class={PARAGRAPH_CLASSES}>앱인토스용 서비스는 만 19세 이상만 이용할 수 있습니다.</p>
      </Show>
      <p class={PARAGRAPH_CLASSES}>
        이용자는 관련 법령, 본 약관, 서비스 화면의 안내와 제3자의 권리를 준수해야 하며, 서비스의
        안정적인 운영을 방해해서는 안 됩니다.
      </p>
    </section>
    <section class={SECTION_CLASSES} id="ai-voice">
      <h2 class={HEADING_CLASSES}>제7조 AI 음성 기능</h2>
      <p class={PARAGRAPH_CLASSES}>
        Pomofi의 음성 합성은 Supertonic 3 모델 등을 이용해 이용자의 기기에서 처리될 수 있습니다.
        실행에 필요한 모델 파일은 외부 저장소에서 내려받을 수 있으며, 기기 환경에 따라 품질과 처리
        시간이 달라질 수 있습니다.
      </p>
      <p class={PARAGRAPH_CLASSES}>
        이용자는 생성 음성을 공개·배포하거나 다른 콘텐츠에 사용할 때 사람이 직접 녹음한 음성으로
        오인되지 않도록 <strong class={EMPHASIS_CLASSES}>“AI 생성 음성”</strong> 등 이해하기 쉬운
        방법으로 생성 사실을 표시해야 합니다.
      </p>
      <p class={PARAGRAPH_CLASSES}>
        Supertonic 3 모델에는 BigScience OpenRAIL-M License가 적용됩니다. 이용자는 본 약관과{' '}
        <a
          class={CONTENT_LINK_CLASSES}
          href="https://huggingface.co/Supertone/supertonic-3/blob/3cadd1e/LICENSE"
          rel="noreferrer"
          target="_blank"
        >
          모델 원문 라이선스
        </a>
        를 함께 준수해야 합니다.
      </p>
    </section>
    <section class={SECTION_CLASSES} id="restricted-uses">
      <h2 class={HEADING_CLASSES}>제8조 금지 행위</h2>
      <p class={PARAGRAPH_CLASSES}>이용자는 다음 행위를 해서는 안 됩니다.</p>
      <ul class={LIST_CLASSES}>
        <li>법령, 본 약관 또는 제3자의 권리를 위반하는 행위</li>
        <li>타인의 계정이나 정보를 도용하거나 동의 없이 타인을 사칭하는 행위</li>
        <li>AI 생성 사실을 숨기고 생성 음성을 사람이 직접 녹음한 것처럼 공개하는 행위</li>
        <li>타인을 비방·괴롭히거나 허위정보, 불법정보 또는 유해한 콘텐츠를 생성·유포하는 행위</li>
        <li>미성년자 또는 취약한 사람을 착취하거나 해치는 행위</li>
        <li>서비스의 보안, 네트워크 또는 정상적인 운영을 방해하는 행위</li>
        <li>허용되지 않은 자동화 수단으로 서비스나 데이터에 접근하는 행위</li>
        <li>그 밖에 서비스 화면에 게시된 모델 라이선스의 금지 용도를 위반하는 행위</li>
      </ul>
    </section>
  </>
)

const OperationTermsSections = (props: PServiceTermsProps) => (
  <>
    <section class={SECTION_CLASSES} id="rights">
      <h2 class={HEADING_CLASSES}>제9조 콘텐츠와 권리</h2>
      <p class={PARAGRAPH_CLASSES}>
        서비스, 소프트웨어, 브랜드와 Pomofi가 제공하는 콘텐츠에 관한 권리는 Pomofi 운영자 또는
        정당한 권리자에게 있습니다. 이용자는 서비스를 이용할 수 있는 범위에서만 이를 사용할 수
        있습니다.
      </p>
      <p class={PARAGRAPH_CLASSES}>
        Pomofi는 음악 파일의 다운로드 기능을 제공하지 않습니다. 음악 이용권을 구매해도 음원 파일의
        소유권이나 지식재산권이 이전되지 않으며, 구매한 계정으로 서비스 안에서 음악을 이용할 권리만
        부여됩니다.
      </p>
      <p class={PARAGRAPH_CLASSES}>
        이용자는 이용자 콘텐츠를 서비스에서 처리할 적법한 권한을 보유해야 합니다. 이용자 콘텐츠와
        생성 결과의 공개·배포 및 후속 사용에 대한 책임은 이용자에게 있으며, Pomofi는 생성 결과의
        권리 성립이나 특정 목적의 사용 가능성을 보장하지 않습니다.
      </p>
    </section>
    <section class={SECTION_CLASSES} id="payment">
      <h2 class={HEADING_CLASSES}>제10조 유료 서비스, 결제와 환불</h2>
      <Show
        fallback={
          <p class={PARAGRAPH_CLASSES}>
            웹 서비스에서는 현재 유료 상품을 판매하지 않습니다. 향후 유료 상품을 제공하는 경우 가격,
            제공 내용, 이용 조건 및 환불 기준을 구매 전에 별도로 안내합니다.
          </p>
        }
        when={props.platform === 'apps-in-toss'}
      >
        <p class={PARAGRAPH_CLASSES}>
          앱인토스에서는 곡 또는 앨범 단위의 음악 이용권을 1회 결제로 판매할 수 있습니다. 이용권에는
          정기결제나 자동 갱신이 없으며, 구매한 계정으로 Pomofi 서비스가 존속하는 동안 해당 음악을
          계속 이용할 수 있습니다.
        </p>
        <p class={PARAGRAPH_CLASSES}>
          가격, 대상 음악, 제공 내용과 결제 조건은 구매 전에 안내합니다. 결제 및 환불에는 앱인토스와
          운영체제별 앱 마켓의 절차 및{' '}
          <a class={CONTENT_LINK_CLASSES} href="/refund-policy">
            환불 및 청약철회 정책
          </a>
          이 함께 적용됩니다. 본 약관이나 별도 정책은 관계 법령이 보장하는 이용자의 권리를 제한하지
          않습니다.
        </p>
      </Show>
    </section>
    <section class={SECTION_CLASSES} id="availability">
      <h2 class={HEADING_CLASSES}>제11조 서비스의 변경과 중단</h2>
      <p class={PARAGRAPH_CLASSES}>
        기능 개선, 보안, 점검, 법령 준수 또는 운영상 필요에 따라 서비스의 전부 또는 일부를
        변경하거나 일시 중단할 수 있습니다. 예측 가능한 중요한 변경이나 중단은 사전에 알리고, 긴급한
        보안 문제 또는 통제할 수 없는 사유가 있으면 사후에 알릴 수 있습니다.
      </p>
      <p class={PARAGRAPH_CLASSES}>
        서비스를 종료하는 경우 이용자가 저장한 자료를 정리할 수 있도록 종료 일정과 이용 가능한
        방법을 합리적인 기간 전에 안내합니다.
      </p>
    </section>
    <section class={SECTION_CLASSES} id="termination">
      <h2 class={HEADING_CLASSES}>제12조 이용 종료와 제한</h2>
      <p class={PARAGRAPH_CLASSES}>
        이용자는 웹 계정과 앱인토스 계정을 각각 별도로 탈퇴하거나 삭제를 요청할 수 있습니다. 한
        플랫폼의 계정을 탈퇴해도 다른 플랫폼의 계정은 자동으로 삭제되지 않습니다. 처리 중인 결제,
        환불 또는 분쟁이 있으면 관련 법령과 정책에 필요한 범위에서 처리가 계속될 수 있습니다.
      </p>
      <p class={PARAGRAPH_CLASSES}>
        이용자가 법령이나 본 약관을 위반하거나 서비스의 안전을 중대하게 위협하는 경우 필요한
        범위에서 이용을 제한할 수 있습니다. 긴급한 조치가 필요한 경우를 제외하고 제한 사유와 이의
        제기 방법을 안내합니다.
      </p>
    </section>
    <section class={SECTION_CLASSES} id="responsibility">
      <h2 class={HEADING_CLASSES}>제13조 책임 범위</h2>
      <p class={PARAGRAPH_CLASSES}>
        Pomofi는 고의 또는 과실로 이용자에게 손해를 발생시킨 경우 관계 법령에 따라 책임을
        부담합니다. 이용자의 귀책사유, 기기·네트워크 문제 또는 Pomofi가 합리적으로 통제할 수 없는
        사유로 발생한 손해에 대해서는 책임을 부담하지 않습니다.
      </p>
      <p class={PARAGRAPH_CLASSES}>
        AI 기능은 부정확하거나 예상하지 못한 결과를 만들 수 있습니다. 이용자는 중요한 판단이나
        전문적 조언의 유일한 근거로 생성 결과를 사용해서는 안 됩니다. 본 조는 관계 법령상 제한할 수
        없는 Pomofi의 책임을 배제하지 않습니다.
      </p>
    </section>
    <section class={SECTION_CLASSES} id="disputes">
      <h2 class={HEADING_CLASSES}>제14조 문의와 분쟁 해결</h2>
      <p class={PARAGRAPH_CLASSES}>
        이용자는 고객지원 이메일{' '}
        <a class={CONTENT_LINK_CLASSES} href={`mailto:${SERVICE_OPERATOR.supportEmail}`}>
          {SERVICE_OPERATOR.supportEmail}
        </a>
        로 약관, 이용 제한, 결제 또는 환불에 관해 문의하고 이의를 제기할 수 있습니다. 쿠웅은 접수된
        의견을 합리적인 기간 안에 확인하고 처리 결과를 안내합니다.
      </p>
      <p class={PARAGRAPH_CLASSES}>
        본 약관은 대한민국 법령을 따릅니다. 분쟁이 해결되지 않으면 당사자는 관계 법령이 정한 절차에
        따라 조정 또는 소송으로 해결할 수 있으며, 관할법원은 민사소송법 등 관계 법령에 따릅니다.
      </p>
    </section>
  </>
)

export const PServiceTerms = (props: PServiceTermsProps) => (
  <main class={MAIN_CLASSES}>
    <div class={BACKGROUND_CLASSES} />
    <div class="relative mx-auto grid w-full max-w-6xl gap-8">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <a class={BACK_LINK_CLASSES} href={props.backHref ?? '/'}>
          ← {props.backLabel ?? 'Pomofi로 돌아가기'}
        </a>
        <PServicePolicyLinks
          currentPolicy="terms"
          platform={props.platform ?? 'web'}
          tone="overlay"
        />
      </div>
      <TermsIntro platform={props.platform} />
      <aside class="rounded-5 border border-#f2a7b8/20 bg-#f2a7b8/7 p-5" role="note">
        <h2 class="m-0 text-base font-750 text-#ffd4de">중요한 이용 조건</h2>
        <p class="mb-0 mt-2 text-sm leading-7 text-#d8cbd9">
          타인의 권리를 침해하거나 AI 생성 사실을 숨기는 용도로 음성 기능을 사용할 수 없습니다. 유료
          서비스의 해지와 환불 조건은 구매 전에 반드시 확인해 주세요.
        </p>
      </aside>
      <div class="grid gap-8 lg:grid-cols-[13rem_minmax(0,1fr)] lg:items-start">
        <TermsNavigation />
        <article class={ARTICLE_CLASSES}>
          <div class="grid gap-8">
            <CoreTermsSections />
            <PlatformTermsSection platform={props.platform} />
            <AccountAndAiSections platform={props.platform} />
            <OperationTermsSections platform={props.platform} />
          </div>
        </article>
      </div>
      <footer class={FOOTER_CLASSES}>
        <span>
          약관 문의:{' '}
          <a class={CONTENT_LINK_CLASSES} href={`mailto:${SERVICE_OPERATOR.supportEmail}`}>
            {SERVICE_OPERATOR.supportEmail}
          </a>
        </span>
        <span>© Pomofi</span>
      </footer>
    </div>
  </main>
)
