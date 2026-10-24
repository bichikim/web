import {Show} from 'solid-js'
import {SERVICE_POLICY_PATHS} from '../../features/service-terms'
import {SERVICE_OPERATOR} from 'src/features/service-operator'
import {
  CONTENT_LINK_CLASSES,
  HEADING_CLASSES,
  PARAGRAPH_CLASSES,
  PServiceTermsProps,
  SECTION_CLASSES,
} from './shared'

export const OperationTermsSections = (props: PServiceTermsProps) => (
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
          <a class={CONTENT_LINK_CLASSES} href={SERVICE_POLICY_PATHS.refund}>
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
