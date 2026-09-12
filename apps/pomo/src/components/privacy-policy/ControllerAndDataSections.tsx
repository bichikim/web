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
        <h3 class={CARD_HEADING_CLASSES}>선택적 Google Calendar 연결</h3>
        <p class={PARAGRAPH_CLASSES}>
          이용자가 Google 권한 동의 화면에서 연결을 허용하면 Google 계정 식별값과 이메일 주소,
          캘린더 식별값과 이름, 요청한 기간의 일정 식별값·제목·시작 및 종료 시각·종일 여부를
          처리합니다. Google 계정 정보는 연결된 계정을 식별하고 표시하는 데 사용하며, 일정 정보는
          앱의 캘린더 표시, 일정 알림과 이용자의 일정 질문에 대한 답변에 사용합니다. 캘린더는 읽기
          전용으로 접근하며 일정을 생성·수정·삭제하지 않습니다.
        </p>
        <p class={PARAGRAPH_CLASSES}>
          연결 유지를 위한 액세스 토큰과 갱신 토큰은 암호화하여 계정 연결정보와 함께 서버
          데이터베이스에 저장합니다. 일정은 요청 시 서버를 거쳐 조회하고 브라우저 세션 저장소에 임시
          저장할 수 있습니다. 일정 질문에 대한 답변에는 이용자 기기에서 실행하는 AI 모델을 사용하며,
          Google 사용자 데이터를 범용 AI·머신러닝 모델의 학습에 사용하지 않습니다.
        </p>
        <p class={PARAGRAPH_CLASSES}>
          Google 사용자 데이터와 그로부터 파생된 데이터는 앱 화면에 제공되는 위 기능을 제공하거나
          개선하는 목적으로만 사용합니다. 광고, 리타기팅, 신용평가, 대출 심사, 데이터 판매 또는 앱
          기능과 무관한 목적으로 사용하지 않습니다.
        </p>
        <p class={PARAGRAPH_CLASSES}>
          Pomofi의 Google API를 통해 받은 정보의 사용 및 다른 앱으로의 이전은 제한적 사용 (Limited
          Use) 요건을 포함한{' '}
          <a
            class={CONTENT_LINK_CLASSES}
            href="https://developers.google.com/terms/api-services-user-data-policy"
          >
            Google API Services User Data Policy
          </a>
          를 준수합니다. Google 사용자 데이터에는 아래 일반적인 제공 안내보다 이 제한이 우선
          적용됩니다. 제3자 이전은 이용자의 동의를 받은 앱 기능 제공·개선, 보안, 법적 의무 이행,
          이용자의 사전 동의를 받은 합병·인수·자산 매각의 경우로 제한합니다. 사람의 데이터 열람은
          이용자의 명시적 동의, 보안상 필요, 법적 의무 또는 관계 법령에 따른 내부 운영용 집계 데이터
          처리의 경우로 제한합니다.
        </p>
        <p class={PARAGRAPH_CLASSES}>
          캘린더 설정에서 연결을 해제하면 저장된 계정 연결정보와 토큰을 삭제합니다. Google 계정의
          연결된 앱 관리에서도 접근 권한을 철회할 수 있습니다. 기기에 저장한 일정 알림이나 대화에
          포함된 일정 정보는 해당 항목 또는 브라우저 저장공간을 삭제하여 지울 수 있습니다.
        </p>
      </div>
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
