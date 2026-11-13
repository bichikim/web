import {AD_REWARD_READINGS, FREE_DAILY_READINGS, READING_PRICE} from '../../config/service'

export function SReadingPolicy() {
  return (
    <section aria-labelledby="policy-title" class="py-12 sm:py-16">
      <h2 class="mb-6 text-sm font-medium text-[#655d6c]" id="policy-title">
        출시 예정 이용 방식
      </h2>
      <dl class="grid gap-6 sm:grid-cols-3">
        <div>
          <dt class="text-sm text-[#655d6c]">한 번의 풀이</dt>
          <dd class="mt-1 text-2xl font-semibold">{READING_PRICE}원</dd>
        </div>
        <div>
          <dt class="text-sm text-[#655d6c]">매일 무료로</dt>
          <dd class="mt-1 text-2xl font-semibold">{FREE_DAILY_READINGS}회</dd>
        </div>
        <div>
          <dt class="text-sm text-[#655d6c]">광고를 보면</dt>
          <dd class="mt-1 text-2xl font-semibold">무료 +{AD_REWARD_READINGS}회</dd>
        </div>
      </dl>
    </section>
  )
}
