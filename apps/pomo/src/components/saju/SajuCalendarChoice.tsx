import {cx} from 'class-variance-authority'

const CHOICE_CLASSES = cx(
  'cursor-pointer rounded-2 px-4 py-2 text-sm font-650',
  'focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-#f0c99a',
)

export interface SajuCalendarChoiceProps {
  readonly value: 'solar' | 'lunar'
  readonly onChange: (value: 'solar' | 'lunar') => void
}

export function SajuCalendarChoice(props: SajuCalendarChoiceProps) {
  return (
    <fieldset class="m-0 min-w-0 border-0 p-0">
      <legend class="mb-2 text-sm font-650">생년월일</legend>
      <div class="inline-flex gap-1 rounded-3 border border-white/20 bg-#211a2b p-1">
        <label
          class={cx(
            CHOICE_CLASSES,
            props.value === 'solar' ? 'bg-#f0c99a text-#241927' : 'text-#d2c4d7',
          )}
        >
          <input
            class="sr-only"
            checked={props.value === 'solar'}
            name="calendar"
            type="radio"
            value="solar"
            onChange={() => props.onChange('solar')}
          />
          양력
        </label>
        <label
          class={cx(
            CHOICE_CLASSES,
            props.value === 'lunar' ? 'bg-#f0c99a text-#241927' : 'text-#d2c4d7',
          )}
        >
          <input
            class="sr-only"
            checked={props.value === 'lunar'}
            name="calendar"
            type="radio"
            value="lunar"
            onChange={() => props.onChange('lunar')}
          />
          음력
        </label>
      </div>
    </fieldset>
  )
}
