import {Show} from 'solid-js'
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
const CONTENT_LINK_CLASSES = cx(
  'text-#d8cbd9 underline decoration-white/25 underline-offset-4 transition-colors',
  'hover:text-white focus-visible:text-white',
)
const CARD_CLASSES = 'mt-4 rounded-5 border border-white/10 bg-white/4 p-5'
const CARD_HEADING_CLASSES = 'm-0 text-base font-750 text-#ffd4de'
const BACK_LINK_CLASSES =
  'w-fit text-sm font-700 text-#d8cbd9 no-underline hover:text-white focus-visible:text-white'
const FOOTER_CLASSES = cx(
  'grid gap-2 border-t border-white/8 pt-6 text-xs leading-6 text-#8f8297',
  'sm:flex sm:items-end sm:justify-between',
)

export type PrivacyPolicyPlatform = 'apps-in-toss' | 'web'

export interface PPrivacyPolicyProps {
  backHref?: string
  backLabel?: string
  platform?: PrivacyPolicyPlatform
}

const PolicyIntro = (props: PPrivacyPolicyProps) => (
  <header>
    <p class="m-0 text-xs font-750 tracking-[0.24em] text-#f2a7b8 uppercase">
      <Show fallback="Web privacy policy" when={props.platform === 'apps-in-toss'}>
        Apps in Toss privacy policy
      </Show>
    </p>
    <h1 class="mb-0 mt-4 max-w-3xl text-3xl font-800 tracking--0.04em xs:text-5xl xs:leading-tight">
      Pomofi 개인정보처리방침
    </h1>
    <p class="mb-0 mt-5 max-w-3xl text-sm leading-7 text-#d8cbd9 xs:text-base xs:leading-8">
      개인사업자 {SERVICE_OPERATOR.businessName}은 Pomofi 이용자의 개인정보를 필요한 범위에서만
      처리하고 안전하게 보호합니다.
    </p>
    <p class="mb-0 mt-3 text-xs text-#a99cab">시행일 2026년 8월 22일 · 문서 버전 1.1</p>
  </header>
)

const PolicyNavigation = () => (
  <nav aria-label="개인정보처리방침 목차" class="lg:sticky lg:top-8 lg:self-start">
    <p class="m-0 text-xs font-750 tracking-[0.18em] text-#8f8297 uppercase">Contents</p>
    <ol class="mb-0 mt-4 grid list-none gap-3 p-0 text-sm">
      <li>
        <a class={CONTENT_LINK_CLASSES} href="#controller">
          1. 개인정보처리자
        </a>
      </li>
      <li>
        <a class={CONTENT_LINK_CLASSES} href="#data">
          2. 처리 항목과 목적
        </a>
      </li>
      <li>
        <a class={CONTENT_LINK_CLASSES} href="#local-data">
          3. 기기 내 정보
        </a>
      </li>
      <li>
        <a class={CONTENT_LINK_CLASSES} href="#retention">
          4. 보유기간
        </a>
      </li>
      <li>
        <a class={CONTENT_LINK_CLASSES} href="#sharing">
          5. 제3자 제공
        </a>
      </li>
      <li>
        <a class={CONTENT_LINK_CLASSES} href="#processors">
          6. 처리위탁
        </a>
      </li>
      <li>
        <a class={CONTENT_LINK_CLASSES} href="#overseas">
          7. 국외 이전
        </a>
      </li>
      <li>
        <a class={CONTENT_LINK_CLASSES} href="#rights">
          8. 이용자의 권리
        </a>
      </li>
      <li>
        <a class={CONTENT_LINK_CLASSES} href="#deletion">
          9. 파기
        </a>
      </li>
      <li>
        <a class={CONTENT_LINK_CLASSES} href="#automatic">
          10. 자동 수집과 보안
        </a>
      </li>
      <li>
        <a class={CONTENT_LINK_CLASSES} href="#children">
          11. 아동의 개인정보
        </a>
      </li>
      <li>
        <a class={CONTENT_LINK_CLASSES} href="#contact">
          12. 문의와 변경
        </a>
      </li>
    </ol>
  </nav>
)

const ControllerAndDataSections = (props: PPrivacyPolicyProps) => (
  <>
    <section class={SECTION_CLASSES} id="controller">
      <h2 class={HEADING_CLASSES}>1. 개인정보처리자</h2>
      <ul class={LIST_CLASSES}>
        <li>상호: {SERVICE_OPERATOR.businessName}</li>
        <li>대표자: {SERVICE_OPERATOR.representative}</li>
        <li>
          개인정보 보호 문의:{' '}
          <a class={CONTENT_LINK_CLASSES} href={`mailto:${SERVICE_OPERATOR.supportEmail}`}>
            {SERVICE_OPERATOR.supportEmail}
          </a>
        </li>
        <li>전화번호: {SERVICE_OPERATOR.supportPhone}</li>
      </ul>
    </section>

    <section class={SECTION_CLASSES} id="data">
      <h2 class={HEADING_CLASSES}>2. 처리하는 개인정보 항목과 목적</h2>
      <Show
        fallback={
          <div class={CARD_CLASSES}>
            <h3 class={CARD_HEADING_CLASSES}>웹 계정</h3>
            <p class={PARAGRAPH_CLASSES}>
              이메일 주소, Neon Auth 회원 식별값, 내부 사용자 ID, 로그인 쿠키와 세션 정보를 회원
              식별, 로그인 유지, 계정 보안과 고객지원 목적으로 처리합니다.
            </p>
          </div>
        }
        when={props.platform === 'apps-in-toss'}
      >
        <div class={CARD_CLASSES}>
          <h3 class={CARD_HEADING_CLASSES}>앱인토스 계정</h3>
          <p class={PARAGRAPH_CLASSES}>
            토스가 제공하는 앱별 사용자 식별값(userKey), 내부 사용자 ID, 로그인 제공자, 앱 세션
            토큰의 해시값과 생성·만료·최근 이용·해지 시각을 회원 식별, 로그인 유지, 계정 보안과
            고객지원 목적으로 처리합니다.
          </p>
        </div>
      </Show>
      <div class={CARD_CLASSES}>
        <h3 class={CARD_HEADING_CLASSES}>선택적 계정 연결</h3>
        <p class={PARAGRAPH_CLASSES}>
          웹 계정과 앱인토스 계정을 연결할 때 이메일 주소, 이메일 해시값, 인증 토큰 해시값과
          만료·사용 시각을 본인 확인과 중복 연결 방지 목적으로 처리합니다.
        </p>
      </div>
      <div class={CARD_CLASSES}>
        <h3 class={CARD_HEADING_CLASSES}>유료 음악 구매 시</h3>
        <p class={PARAGRAPH_CLASSES}>
          주문·결제 식별정보, 구매한 곡 또는 앨범, 결제·환불 상태와 처리 시각을 구매 권한 제공, 구매
          복원, 환불, 분쟁 대응과 법정 거래기록 보존 목적으로 처리할 수 있습니다. 카드번호와
          계좌번호 등 결제수단 정보는 Pomofi가 직접 저장하지 않습니다.
        </p>
      </div>
      <div class={CARD_CLASSES}>
        <h3 class={CARD_HEADING_CLASSES}>서비스 접속 과정</h3>
        <p class={PARAGRAPH_CLASSES}>
          IP 주소, 브라우저·운영체제 정보, 접속 일시, 요청 기록과 오류 기록이 서비스 제공, 장애
          대응, 부정 이용 방지와 보안 목적으로 자동 생성될 수 있습니다.
        </p>
      </div>
      <div class={CARD_CLASSES}>
        <h3 class={CARD_HEADING_CLASSES}>외부 콘텐츠와 실행 파일 요청</h3>
        <p class={PARAGRAPH_CLASSES}>
          음악·AI 모델·음성 실행 파일을 내려받을 때 이용자의 기기는 storage.pomofi.io(Cloudflare
          R2), cdn.jsdelivr.net 또는 huggingface.co에 직접 연결할 수 있습니다. 이 과정에서 IP 주소,
          브라우저·기기 정보, 요청 일시, 요청·참조 URL이 각 제공자에게 전달될 수 있습니다. 이용자가
          외부 피드 주소를 추가하면 해당 피드 운영자에게도 같은 유형의 접속정보가 전달됩니다.
        </p>
        <p class={PARAGRAPH_CLASSES}>
          계정 식별정보, 이용자가 작성한 대화문과 기기에서 생성한 음성은 이러한 리소스 요청에
          포함하지 않습니다.
        </p>
      </div>
      <p class={PARAGRAPH_CLASSES}>
        Pomofi는 주민등록번호, 생체정보, 위치정보 등 고유식별정보나 민감정보를 요구하지 않습니다.
        이용자의 권리 또는 의무에 중대한 영향을 미치는 완전 자동화된 결정을 하지 않습니다.
      </p>
    </section>
  </>
)

const LocalAndRetentionSections = () => (
  <>
    <section class={SECTION_CLASSES} id="local-data">
      <h2 class={HEADING_CLASSES}>3. 이용자 기기에만 저장되는 정보</h2>
      <p class={PARAGRAPH_CLASSES}>
        타이머 상태와 설정, 화면 설정, 대화문과 초안, 기기에서 생성한 음성, 피드 구독과 재생 설정
        등은 브라우저 저장소, IndexedDB, Cache Storage 또는 앱인토스 기기 저장소에 저장될 수
        있습니다. 현재 Pomofi 서버는 이러한 내용 자체를 계정에 업로드하거나 동기화하지 않습니다.
      </p>
      <p class={PARAGRAPH_CLASSES}>
        이용자는 서비스 안에서 해당 항목을 삭제하거나 브라우저·토스 앱의 저장공간을 삭제하여 기기 내
        정보를 지울 수 있습니다. 기기를 변경하거나 저장공간을 초기화하면 복구되지 않을 수 있습니다.
      </p>
    </section>

    <section class={SECTION_CLASSES} id="retention">
      <h2 class={HEADING_CLASSES}>4. 개인정보의 처리 및 보유기간</h2>
      <ul class={LIST_CLASSES}>
        <li>계정과 회원 식별정보: 해당 웹 또는 앱인토스 계정의 탈퇴 시까지</li>
        <li>
          앱 로그인 세션: 세션 토큰은 발급 후 최대 30일간 유효하며, 관련 기록은 계정 탈퇴 시까지
        </li>
        <li>
          계정 연결 인증정보: 계정 탈퇴 시까지. 다만, 연결용 인증 토큰은 발급 후 30분간만 유효
        </li>
        <li>서비스 접속·보안 기록: 원칙적으로 생성일부터 3개월 이내</li>
        <li>계약 또는 청약철회 기록: 5년</li>
        <li>대금결제 및 콘텐츠 공급 기록: 5년</li>
        <li>소비자 불만 또는 분쟁처리 기록: 3년</li>
        <li>표시·광고 기록: 6개월</li>
      </ul>
      <p class={PARAGRAPH_CLASSES}>
        관계 법령에 따라 보존하는 거래기록은 일반 계정정보와 분리하여 법정 목적에만 사용하고, 해당
        기간이 끝나면 파기합니다.
      </p>
    </section>
  </>
)

const SharingAndProcessingSections = () => (
  <>
    <section class={SECTION_CLASSES} id="sharing">
      <h2 class={HEADING_CLASSES}>5. 개인정보의 제3자 제공</h2>
      <p class={PARAGRAPH_CLASSES}>
        쿠웅은 이용자의 개인정보를 제3자에게 판매하지 않습니다. 이용자가 동의하거나 법령에 특별한
        규정이 있는 경우에는 필요한 범위에서 제공할 수 있습니다.
      </p>
      <p class={PARAGRAPH_CLASSES}>
        토스, Google Play 및 Apple은 로그인·결제 플랫폼 운영자로서 각자의 개인정보처리방침에 따라
        정보를 처리합니다.
      </p>
      <p class={PARAGRAPH_CLASSES}>
        제2항에 안내한 외부 리소스와 이용자가 선택한 피드는 이용자의 기기에서 해당 제공자에게 직접
        요청되며, 제공자는 자신의 개인정보처리방침에 따라 접속정보를 처리할 수 있습니다.
      </p>
    </section>

    <section class={SECTION_CLASSES} id="processors">
      <h2 class={HEADING_CLASSES}>6. 개인정보 처리업무의 위탁</h2>
      <ul class={LIST_CLASSES}>
        <li>Neon, LLC: PostgreSQL 데이터베이스 운영, 웹 회원 인증 및 인증 이메일 발송</li>
        <li>Vercel Inc.: 웹·API 호스팅, 네트워크 전송, 접속·오류 기록 처리</li>
        <li>Cloudflare, Inc.: R2 기반 음악·AI 모델 저장소와 콘텐츠 전송</li>
      </ul>
      <p class={PARAGRAPH_CLASSES}>
        쿠웅은 위탁계약을 통해 목적 외 처리 금지, 안전성 확보조치, 재위탁 관리와 개인정보 파기 등
        개인정보 보호에 필요한 사항을 관리합니다.
      </p>
    </section>

    <section class={SECTION_CLASSES} id="overseas">
      <h2 class={HEADING_CLASSES}>7. 개인정보의 국외 이전</h2>
      <p class={PARAGRAPH_CLASSES}>
        서비스 계약의 체결·이행에 필요한 데이터베이스, 인증 및 호스팅을 제공하기 위해 「개인정보
        보호법」 제28조의8 제1항 제3호에 근거하여 다음과 같이 개인정보를 국외로 이전·보관합니다.
      </p>
      <div class={CARD_CLASSES}>
        <h3 class={CARD_HEADING_CLASSES}>Neon, LLC</h3>
        <ul class={LIST_CLASSES}>
          <li>국가 및 연락처: 싱가포르, privacy@neon.tech</li>
          <li>항목: 계정 식별정보, 이메일 인증정보, 세션 해시값, 구매·환불 기록</li>
          <li>목적: 데이터베이스 저장, 회원 인증과 인증 이메일 발송</li>
          <li>시기·방법: 서비스 이용 시 암호화된 네트워크로 수시 전송</li>
          <li>기간: 제4항의 항목별 보유기간 또는 위탁계약 종료 시까지</li>
        </ul>
      </div>
      <div class={CARD_CLASSES}>
        <h3 class={CARD_HEADING_CLASSES}>Vercel Inc.</h3>
        <ul class={LIST_CLASSES}>
          <li>국가 및 연락처: 미국, privacy@vercel.com</li>
          <li>항목: IP 주소, 접속·요청·오류 기록 및 서비스 요청에 포함된 계정·세션 정보</li>
          <li>목적: 웹·API 호스팅, 서비스 전송, 장애 대응과 보안</li>
          <li>시기·방법: 서비스 접속 및 API 이용 시 암호화된 네트워크로 수시 전송</li>
          <li>기간: 제4항의 항목별 보유기간 또는 위탁계약 종료 시까지</li>
        </ul>
      </div>
      <div class={CARD_CLASSES}>
        <h3 class={CARD_HEADING_CLASSES}>Cloudflare, Inc.</h3>
        <ul class={LIST_CLASSES}>
          <li>
            국가 및 연락처: 미국 및 전 세계 Cloudflare 네트워크, privacyquestions@cloudflare.com
          </li>
          <li>항목: IP 주소, 브라우저·기기 정보, 요청 일시, 요청·참조 URL</li>
          <li>목적: R2에 저장된 음악·AI 모델 제공, 네트워크 전송과 보안</li>
          <li>시기·방법: 음악 재생 또는 AI 기능 준비 시 암호화된 네트워크로 전송</li>
          <li>기간: 위탁계약 종료 또는 Cloudflare의 관련 로그 보유기간까지</li>
        </ul>
      </div>
      <div class={CARD_CLASSES}>
        <h3 class={CARD_HEADING_CLASSES}>외부 AI 리소스 및 이용자 선택 피드</h3>
        <ul class={LIST_CLASSES}>
          <li>
            제공자·국가: Hugging Face, Inc.(미국), Volentio JSD의 jsDelivr(영국 및 글로벌 CDN 처리
            지역), 이용자가 입력한 피드의 운영자(국가는 피드 주소에 따라 다름)
          </li>
          <li>항목: IP 주소, 브라우저·기기 정보, 요청 일시, 요청·참조 URL</li>
          <li>목적: AI 모델·음성 실행 파일 또는 이용자가 요청한 피드 콘텐츠 제공과 보안</li>
          <li>시기·방법: 해당 기능을 사용할 때 이용자 기기에서 암호화된 네트워크로 직접 전송</li>
          <li>기간: 각 제공자의 개인정보처리방침 및 로그 보유정책에 따름</li>
        </ul>
        <p class={PARAGRAPH_CLASSES}>
          외부 AI 리소스 전송을 원하지 않으면 해당 AI 기능을 사용하지 않을 수 있고, 외부 피드 전송을
          원하지 않으면 피드를 추가하지 않거나 저장된 피드를 삭제할 수 있습니다.
        </p>
      </div>
      <p class={PARAGRAPH_CLASSES}>
        국외 이전을 원하지 않으면 회원가입·로그인을 사용하지 않거나 계정 탈퇴를 요청할 수 있습니다.
        국외 이전을 거부하면 계정, 구매 복원과 온라인 고객지원 등 서버 기반 기능을 이용할 수 없지만,
        로그인 없이 제공되는 기기 내 기능은 이용할 수 있습니다.
      </p>
    </section>
  </>
)

const RightsAndProtectionSections = () => (
  <>
    <section class={SECTION_CLASSES} id="rights">
      <h2 class={HEADING_CLASSES}>8. 이용자와 법정대리인의 권리 및 행사방법</h2>
      <p class={PARAGRAPH_CLASSES}>
        이용자는 자신의 개인정보에 대해 열람, 정정, 삭제, 처리정지, 동의 철회와 계정 탈퇴를 요구할
        수 있습니다. 본인 확인을 위해 필요한 최소 정보를 요청할 수 있으며, 법정대리인이나 위임받은
        사람도 관계 법령에 따라 권리를 행사할 수 있습니다.
      </p>
      <p class={PARAGRAPH_CLASSES}>
        웹 계정과 앱인토스 계정은 별도로 관리되므로 각각 탈퇴할 수 있습니다. 요청은{' '}
        <a class={CONTENT_LINK_CLASSES} href={`mailto:${SERVICE_OPERATOR.supportEmail}`}>
          {SERVICE_OPERATOR.supportEmail}
        </a>
        로 접수할 수 있으며, 쿠웅은 관계 법령이 정한 기간과 방법에 따라 처리합니다.
      </p>
    </section>

    <section class={SECTION_CLASSES} id="deletion">
      <h2 class={HEADING_CLASSES}>9. 개인정보의 파기절차 및 방법</h2>
      <p class={PARAGRAPH_CLASSES}>
        보유기간이 끝나거나 처리 목적이 달성된 개인정보는 지체 없이 파기합니다. 전자적 파일은 복구할
        수 없는 방법으로 삭제하고, 종이 문서가 발생한 경우에는 분쇄하거나 소각합니다.
      </p>
      <p class={PARAGRAPH_CLASSES}>
        법령상 보존 의무가 있는 정보는 별도 저장공간으로 분리한 뒤 보존기간 종료 후 파기합니다.
      </p>
    </section>

    <section class={SECTION_CLASSES} id="automatic">
      <h2 class={HEADING_CLASSES}>10. 자동 수집 장치와 안전성 확보조치</h2>
      <p class={PARAGRAPH_CLASSES}>
        웹 로그인 유지와 보안을 위해 필수 쿠키를 사용할 수 있고, 앱인토스에서는 기기 저장소에 앱
        세션 토큰을 저장합니다. 브라우저 설정에서 쿠키를 차단하거나 앱 저장공간을 삭제할 수 있지만
        로그인 기능이 정상적으로 동작하지 않을 수 있습니다. 맞춤형 광고를 위한 추적 쿠키는 사용하지
        않습니다.
      </p>
      <p class={PARAGRAPH_CLASSES}>
        쿠웅은 전송구간 암호화, 인증정보 해시 처리, 접근권한 제한, 보안 업데이트와 접속기록 점검 등
        개인정보의 분실·도난·유출·변조를 방지하기 위한 조치를 적용합니다.
      </p>
    </section>

    <section class={SECTION_CLASSES} id="children">
      <h2 class={HEADING_CLASSES}>11. 만 14세 미만 아동의 개인정보</h2>
      <p class={PARAGRAPH_CLASSES}>
        Pomofi는 만 14세 미만을 대상으로 서비스를 제공하거나 개인정보를 수집하지 않습니다. 만 14세
        미만의 개인정보가 처리된 사실을 확인하면 본인 또는 법정대리인의 요청에 따라 필요한 조치를
        합니다.
      </p>
    </section>

    <section class={SECTION_CLASSES} id="contact">
      <h2 class={HEADING_CLASSES}>12. 개인정보 보호 문의 및 방침 변경</h2>
      <ul class={LIST_CLASSES}>
        <li>개인정보 보호책임자: {SERVICE_OPERATOR.representative}</li>
        <li>
          이메일:{' '}
          <a class={CONTENT_LINK_CLASSES} href={`mailto:${SERVICE_OPERATOR.supportEmail}`}>
            {SERVICE_OPERATOR.supportEmail}
          </a>
        </li>
        <li>전화번호: {SERVICE_OPERATOR.supportPhone}</li>
      </ul>
      <p class={PARAGRAPH_CLASSES}>
        처리 내용이나 법령이 변경되면 이 방침을 개정할 수 있습니다. 중요한 변경은 시행 전에 서비스
        화면에서 알리고, 이전 버전과 시행일을 확인할 수 있도록 관리합니다.
      </p>
    </section>
  </>
)

export const PPrivacyPolicy = (props: PPrivacyPolicyProps) => (
  <main class={MAIN_CLASSES}>
    <div class={BACKGROUND_CLASSES} />
    <div class="relative mx-auto grid w-full max-w-6xl gap-8">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <a class={BACK_LINK_CLASSES} href={props.backHref ?? '/'}>
          ← {props.backLabel ?? 'Pomofi로 돌아가기'}
        </a>
        <PServicePolicyLinks
          currentPolicy="privacy"
          platform={props.platform ?? 'web'}
          tone="overlay"
        />
      </div>
      <PolicyIntro platform={props.platform} />
      <aside class="rounded-5 border border-#f2a7b8/20 bg-#f2a7b8/7 p-5" role="note">
        <h2 class="m-0 text-base font-750 text-#ffd4de">핵심 안내</h2>
        <p class="mb-0 mt-2 text-sm leading-7 text-#d8cbd9">
          대화문, 기기에서 생성한 음성과 집중 설정은 현재 서버에 업로드되지 않습니다. 계정 운영에
          필요한 식별정보와 세션 정보만 서버에서 처리합니다.
        </p>
      </aside>
      <div class="grid gap-8 lg:grid-cols-[13rem_minmax(0,1fr)] lg:items-start">
        <PolicyNavigation />
        <article class={ARTICLE_CLASSES}>
          <div class="grid gap-8">
            <ControllerAndDataSections platform={props.platform} />
            <LocalAndRetentionSections />
            <SharingAndProcessingSections />
            <RightsAndProtectionSections />
          </div>
        </article>
      </div>
      <footer class={FOOTER_CLASSES}>
        <span>
          개인정보 문의:{' '}
          <a class={CONTENT_LINK_CLASSES} href={`mailto:${SERVICE_OPERATOR.supportEmail}`}>
            {SERVICE_OPERATOR.supportEmail}
          </a>
        </span>
        <span>© Pomofi</span>
      </footer>
    </div>
  </main>
)
