import {cx} from 'class-variance-authority'
import {Show, untrack} from 'solid-js'
import type {BirthInput} from 'k-saju'
import type {SajuFormDraft, SajuFormDraftPersistence} from 'src/features/saju/form-draft-storage'
import {PSelect} from '../p-select/PSelect'
import {PTimePicker} from '../p-time-picker/PTimePicker'
import {SajuCalendarChoice} from './SajuCalendarChoice'
import {useSajuFormDraft} from './use-saju-form-draft'

const FIRST_BIRTH_YEAR = 1900
const LAST_BIRTH_YEAR = 2050
const MONTHS_PER_YEAR = 12

const YEAR_OPTIONS = Array.from({length: LAST_BIRTH_YEAR - FIRST_BIRTH_YEAR + 1}, (_, index) => {
  const value = String(FIRST_BIRTH_YEAR + index)
  return {label: value, value}
})
const MONTH_OPTIONS = Array.from({length: MONTHS_PER_YEAR}, (_, index) => {
  const value = String(index + 1)
  return {label: value, value}
})
const GENDER_OPTIONS = [
  {label: '남성', value: 'M'},
  {label: '여성', value: 'F'},
  {label: '지정하지 않음 (대운 생략)', value: 'N'},
] as const

const BUTTON_CLASSES = cx(
  'min-h-11 rounded-3 bg-#f0c99a px-5 font-750 text-#241927 hover:bg-#f8dcba',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white',
)
const SECONDARY_BUTTON_CLASSES = cx(
  'justify-self-start self-center rounded-2 px-2 py-1 text-sm text-#d2c4d7 underline',
  'underline-offset-3 hover:text-white focus-visible:outline-2',
  'focus-visible:outline-offset-2 focus-visible:outline-#f0c99a',
)
const QUESTION_CLASSES = cx(
  'min-h-24 w-full rounded-3 border border-white/20 bg-#211a2b p-3 text-#f8edf1',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-#f0c99a',
)

export interface SajuFormInput {
  readonly birth: BirthInput
  readonly gender: 'M' | 'F' | 'N'
  readonly question: string
}

export interface SajuFormProps {
  readonly busy?: boolean
  readonly draftPersistence?: SajuFormDraftPersistence
  readonly initialDate?: string
  readonly onCancel?: () => void
  readonly onSubmit: (input: SajuFormInput) => void
  readonly ready?: boolean
}

function createSajuFormInput(current: SajuFormDraft, day: string): SajuFormInput {
  const {calendar} = current
  const year = calendar === 'solar' ? current.solarYear : current.lunarYear
  const month = calendar === 'solar' ? current.solarMonth : current.lunarMonth
  const date =
    year === '' || month === '' || day === ''
      ? ''
      : `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  const birth: BirthInput = {
    calendar,
    date,
    ...(current.time ? {time: current.time} : {}),
  }
  if (calendar === 'lunar') {
    birth.isLeapMonth = current.leapMonth
  }
  return {birth, gender: current.gender, question: current.question.trim()}
}

export function SajuForm(props: SajuFormProps) {
  const {
    calendarLabel,
    changeDay,
    changeMonth,
    changeYear,
    dateMonth,
    dateYear,
    dayOptions,
    draft,
    resetDraft,
    selectedDay,
    updateDraft,
  } = useSajuFormDraft(
    untrack(() => ({
      initialDate: props.initialDate ?? '1995-03-16',
      persistence: props.draftPersistence,
    })),
  )
  const selectableYear = () =>
    props.initialDate === '' ? [{label: '연도 선택', value: ''}, ...YEAR_OPTIONS] : YEAR_OPTIONS
  const selectableMonth = () =>
    props.initialDate === '' ? [{label: '월 선택', value: ''}, ...MONTH_OPTIONS] : MONTH_OPTIONS
  const handleGenderChange = (gender: 'M' | 'F' | 'N') => updateDraft({gender})

  function handleSubmit(event: SubmitEvent) {
    event.preventDefault()
    const form = event.currentTarget
    if (!(form instanceof HTMLFormElement)) {
      return
    }

    props.onSubmit(createSajuFormInput(draft(), selectedDay()))
  }

  return (
    <form class="grid items-start gap-3 sm:grid-cols-2 sm:gap-4" onSubmit={handleSubmit}>
      <div class="grid min-w-0 gap-3 sm:col-span-2">
        <SajuCalendarChoice
          value={draft().calendar}
          onChange={(calendar) => updateDraft({calendar})}
        />
        <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <PSelect
            class="col-span-2 sm:col-span-1"
            label={`${calendarLabel()} 연도`}
            options={selectableYear()}
            value={dateYear()}
            onChange={changeYear}
          />
          <PSelect
            label={`${calendarLabel()} 월`}
            options={selectableMonth()}
            value={dateMonth()}
            onChange={changeMonth}
          />
          <Show when={dayOptions().length > 0}>
            <PSelect
              label={`${calendarLabel()} 일`}
              options={dayOptions()}
              value={selectedDay()}
              onChange={changeDay}
            />
          </Show>
        </div>
        <Show when={draft().calendar === 'lunar'}>
          <Show when={dayOptions().length === 0}>
            <p class="m-0 text-sm text-#f2a7b8" role="status">
              선택한 음력 월 또는 윤달에 해당하는 날짜가 없습니다.
            </p>
          </Show>
          <label class="flex items-center gap-2 text-sm text-#d2c4d7">
            <input
              checked={draft().leapMonth}
              name="leapMonth"
              type="checkbox"
              onChange={(event) => updateDraft({leapMonth: event.currentTarget.checked})}
            />
            윤달
          </label>
        </Show>
      </div>
      <PTimePicker
        label="출생 시각 (모르면 비워두기)"
        value={draft().time}
        clearable
        onChange={(time) => updateDraft({time})}
      />
      <PSelect
        label="성별"
        options={GENDER_OPTIONS}
        value={draft().gender}
        onChange={handleGenderChange}
      />
      <label class="grid gap-2 text-sm font-650 sm:col-span-2">
        질문
        <textarea
          class={QUESTION_CLASSES}
          name="question"
          placeholder="예: 제 성향을 어떻게 해석하나요?"
          required
          value={draft().question}
          onInput={(event) => updateDraft({question: event.currentTarget.value})}
        />
      </label>
      <button
        aria-busy={props.busy}
        class={cx(BUTTON_CLASSES, 'flex items-center justify-center gap-2')}
        disabled={props.busy || props.ready === false}
        type="submit"
      >
        <Show when={props.busy} fallback="사주 풀이 생성">
          <span
            aria-hidden="true"
            class="i-tabler-loader-2 size-5 animate-spin motion-reduce:animate-none"
          />
          사주 풀이 중…
        </Show>
      </button>
      <Show when={props.onCancel}>
        <button class={SECONDARY_BUTTON_CLASSES} onClick={() => props.onCancel?.()} type="button">
          취소
        </button>
      </Show>
      <Show when={props.draftPersistence}>
        <button class={SECONDARY_BUTTON_CLASSES} onClick={resetDraft} type="button">
          입력 지우기
        </button>
      </Show>
    </form>
  )
}
