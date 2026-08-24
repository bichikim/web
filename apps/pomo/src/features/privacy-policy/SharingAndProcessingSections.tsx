import {
  CARD_CLASSES,
  CARD_HEADING_CLASSES,
  HEADING_CLASSES,
  LIST_CLASSES,
  PARAGRAPH_CLASSES,
  SECTION_CLASSES,
} from './shared'

export const SharingAndProcessingSections = () => (
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
