import {TEXT_MOOD_CLASSIFIER_INFO, TEXT_MOOD_MODEL} from '../features/text-mood'

const MAXIMUM_PERCENTAGE = 100
const METRIC_DIGITS = 3

const formatPercentage = (value: number) => `${Math.round(value * MAXIMUM_PERCENTAGE)}%`

export const TextMoodEvaluation = () => (
  <footer class="mt-10 grid gap-4 border-t border-white/8 pt-6 2xl:grid-cols-[1fr_auto] 2xl:items-end">
    <div>
      <h2 class="m-0 text-sm font-800">현재 파일럿 성능</h2>
      <p class="mb-0 mt-2 max-w-2xl text-xs leading-5 text-#8f8297">
        직접 작성한 {TEXT_MOOD_CLASSIFIER_INFO.evaluation.totalSamples}문장으로 학습·검증했습니다.
        테스트 표본이 작으므로 실제 사용 문장을 더 모으면서 계속 재평가해야 합니다.
      </p>
      <p class="mb-0 mt-1 max-w-2xl text-[11px] leading-5 text-#756a7d">
        단서 부족 헤드 {TEXT_MOOD_CLASSIFIER_INFO.evaluation.insufficiency.totalSamples}건 · 정밀도{' '}
        {formatPercentage(TEXT_MOOD_CLASSIFIER_INFO.evaluation.insufficiency.precision)} · 재현율{' '}
        {formatPercentage(TEXT_MOOD_CLASSIFIER_INFO.evaluation.insufficiency.recall)} · 정상문장
        오탐률{' '}
        {formatPercentage(TEXT_MOOD_CLASSIFIER_INFO.evaluation.insufficiency.falsePositiveRate)}
      </p>
    </div>
    <dl class="m-0 grid grid-cols-3 gap-5 text-right">
      <div>
        <dt class="text-[10px] text-#8f8297">Macro F1</dt>
        <dd class="mb-0 ml-0 mt-1 text-lg font-800">
          {TEXT_MOOD_CLASSIFIER_INFO.evaluation.macroF1.toFixed(METRIC_DIGITS)}
        </dd>
      </div>
      <div>
        <dt class="text-[10px] text-#8f8297">정확도</dt>
        <dd class="mb-0 ml-0 mt-1 text-lg font-800">
          {formatPercentage(TEXT_MOOD_CLASSIFIER_INFO.evaluation.accuracy)}
        </dd>
      </div>
      <div>
        <dt class="text-[10px] text-#8f8297">Top-2</dt>
        <dd class="mb-0 ml-0 mt-1 text-lg font-800">
          {formatPercentage(TEXT_MOOD_CLASSIFIER_INFO.evaluation.topTwoAccuracy)}
        </dd>
      </div>
    </dl>
    <p class="m-0 text-[11px] leading-5 text-#655b6c 2xl:col-span-2">
      {TEXT_MOOD_MODEL.repositoryId} · q8 · mean pooling · {TEXT_MOOD_CLASSIFIER_INFO.modelKind}
    </p>
  </footer>
)
