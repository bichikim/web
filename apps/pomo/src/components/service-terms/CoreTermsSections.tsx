import {SERVICE_OPERATOR} from 'src/features/service-operator'
import {HEADING_CLASSES, LIST_CLASSES, PARAGRAPH_CLASSES, SECTION_CLASSES} from './shared'

export const CoreTermsSections = () => (
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
