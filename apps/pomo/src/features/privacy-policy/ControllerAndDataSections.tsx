import {Show} from 'solid-js'
import {SERVICE_OPERATOR} from 'src/features/service-operator'
import {
  CARD_CLASSES,
  CARD_HEADING_CLASSES,
  CONTENT_LINK_CLASSES,
  HEADING_CLASSES,
  LIST_CLASSES,
  PARAGRAPH_CLASSES,
  PPrivacyPolicyProps,
  SECTION_CLASSES,
} from './shared'

export const ControllerAndDataSections = (props: PPrivacyPolicyProps) => (
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
