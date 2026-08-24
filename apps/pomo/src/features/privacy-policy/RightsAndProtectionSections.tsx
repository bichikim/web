import {SERVICE_OPERATOR} from 'src/features/service-operator'
import {
  CONTENT_LINK_CLASSES,
  HEADING_CLASSES,
  LIST_CLASSES,
  PARAGRAPH_CLASSES,
  SECTION_CLASSES,
} from './shared'

export const RightsAndProtectionSections = () => (
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
