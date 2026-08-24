import {EMPHASIS_CLASSES, HEADING_CLASSES, PARAGRAPH_CLASSES, SECTION_CLASSES} from './shared'

export const PurchasePolicySections = () => (
  <>
    <section class={SECTION_CLASSES} id="music-license">
      <h2 class={HEADING_CLASSES}>1. 음악 이용권</h2>
      <p class={PARAGRAPH_CLASSES}>
        Pomofi는 앱인토스에서 곡 또는 앨범 단위의 음악 이용권을 1회 결제로 판매합니다. 이용권에는
        정기결제나 자동 갱신이 없으며, 구매한 앱인토스 계정으로 Pomofi 서비스가 존속하는 동안 해당
        음악을 계속 이용할 수 있습니다.
      </p>
      <p class={PARAGRAPH_CLASSES}>
        음악 이용권은 음원 파일의 소유권이나 지식재산권을 이전하는 상품이 아닙니다. Pomofi는 음악
        파일의 다운로드 기능을 제공하지 않으며, 이용권은 다른 계정이나 사람에게 양도할 수 없습니다.
      </p>
      <p class={PARAGRAPH_CLASSES}>
        가격, 이용 가능한 곡 또는 앨범, 제공 내용과 이용 조건은 구매 전에 표시합니다. Pomofi가
        서비스를 종료하여 구매한 음악을 더 이상 제공할 수 없는 경우에는 관계 법령과
        소비자분쟁해결기준에 따라 처리합니다.
      </p>
    </section>

    <section class={SECTION_CLASSES} id="withdrawal">
      <h2 class={HEADING_CLASSES}>2. 청약철회</h2>
      <p class={PARAGRAPH_CLASSES}>
        소비자는 계약내용에 관한 전자문서를 받은 날부터{' '}
        <strong class={EMPHASIS_CLASSES}>7일 이내</strong>에 청약철회를 신청할 수 있습니다. 음악
        이용권이 더 늦게 활성화된 경우에는 활성화된 날부터 7일 이내에 신청할 수 있습니다.
      </p>
      <p class={PARAGRAPH_CLASSES}>
        구매한 음악의 재생이 시작되면 디지털콘텐츠의 제공이 개시된 것으로 볼 수 있어 청약철회가
        제한될 수 있습니다. Pomofi는 이러한 제한을 적용하려면 구매 전에 제한 사실을 명확히 알리고
        관계 법령이 요구하는 동의를 받으며, 미리듣기 또는 이에 준하는 정보를 제공합니다.
      </p>
      <p class={PARAGRAPH_CLASSES}>
        필요한 사전 고지·동의 또는 시험 사용 수단을 제공하지 않은 경우에는 관계 법령이 보장하는
        청약철회 권리를 제한하지 않습니다.
      </p>
    </section>
  </>
)
