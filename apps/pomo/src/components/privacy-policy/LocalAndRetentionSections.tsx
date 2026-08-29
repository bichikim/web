import {HEADING_CLASSES, LIST_CLASSES, PARAGRAPH_CLASSES, SECTION_CLASSES} from './shared'

export const LocalAndRetentionSections = () => (
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
