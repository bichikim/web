import {usePreference} from 'src/hooks/use-preference'
import {createMemo, Show} from 'solid-js'
import {
  calculateService,
  DEFAULT_SERVICE_SETTINGS,
  parseServiceDays,
  servicePreference,
  type ServiceSettings,
} from 'src/features/tools'
import {useKoreanToday} from 'src/features/civil-date'
import {PDatePicker} from '../p-date-picker/PDatePicker'
import {PSelect} from '../p-select/PSelect'
import {PInput} from '../p-input/PInput'
import {PSwitch} from '../p-switch/PSwitch'
import {Result} from './Result'

export const Service = () => {
  const [preference, setPreference] = usePreference({
    ...servicePreference,
    onError: (error) => console.warn('Failed to persist service settings.', error),
  })
  const settings = createMemo(() => preference() ?? DEFAULT_SERVICE_SETTINGS)
  const ready = () => preference() !== null
  const today = useKoreanToday()
  const start = () => settings().start
  const manual = () => settings().manual
  const branch = () => settings().branch
  const handleChange = (changes: Partial<ServiceSettings>) => {
    setPreference({...settings(), ...changes})
  }
  const serviceDays = createMemo(() => parseServiceDays(settings().days))
  const result = createMemo(() =>
    calculateService({
      branch: branch(),
      days: manual() ? (serviceDays() ?? NaN) : undefined,
      start: start(),
      today: today(),
    }),
  )
  return (
    <div class="grid gap-4">
      <PSelect
        label="복무 구분"
        options={[
          {label: '육군 · 18개월', value: 'army'},
          {label: '해병대 · 18개월', value: 'marines'},
          {label: '해군 · 20개월', value: 'navy'},
          {label: '공군 · 21개월', value: 'air'},
        ]}
        value={branch()}
        disabled={!ready() || manual()}
        onChange={(branch) => handleChange({branch})}
      />
      <PDatePicker
        label="입대일"
        value={start()}
        min={manual() ? '1900-01-01' : '2022-01-01'}
        disabled={!ready()}
        onChange={(start) => handleChange({start})}
      />
      <PSwitch
        label="복무기간 직접 입력"
        checked={manual()}
        disabled={!ready()}
        onChange={(manual) => handleChange({manual})}
        description="복무기간이 다르면 전체 복무일수를 입력하세요. 입대일을 1일째로 계산합니다."
      />
      <Show when={manual()}>
        <label class="grid gap-1.5 text-sm text-muted-foreground">
          복무기간 (일)
          <PInput
            type="text"
            inputmode="numeric"
            placeholder="예: 300"
            disabled={!ready()}
            value={settings().days}
            onInput={(event) => handleChange({days: event.currentTarget.value})}
            aria-invalid={settings().days !== '' && serviceDays() === null}
          />
          <span class="text-xs leading-5">1일 이상의 정수를 입력하세요.</span>
        </label>
      </Show>
      <Show
        when={result()}
        fallback={
          <p role="status" class="text-sm text-muted-foreground">
            {start() ? '입대일과 복무기간을 확인해주세요.' : '입대일을 선택해주세요.'}
          </p>
        }
      >
        {(value) => (
          <Result
            label="예상 전역일"
            value={`${value().end}\n남은 날짜: ${value().remaining}일\n복무 진행률: ${value().progress.toFixed(1)}%`}
          />
        )}
      </Show>
      <p class="m-0 text-sm leading-6 text-muted-foreground">
        한국 날짜 {today()} 기준. 자동 계산은 2022년 이후 입대하는 현역병의 현재 복무기간을 적용한
        예상치입니다. 입대일을 포함하며 복무 제외 기간·개인별 조정은 자동 반영하지 않습니다.
        진행률은 완료한 날짜를 기준으로 계산하며, 예상 전역일부터 100%로 표시합니다.
      </p>
    </div>
  )
}
