import {text as uiText} from '../features/localization'
interface SPoffoActionPreviewProps {
  /** Accessible connection name; omission uses the generic connection label. */
  readonly label?: string
  /** Whether this connection owns manual playback; omission shows the start button. */
  readonly active?: boolean
  /** Prevents toggling when playback is unavailable; omission enables the button. */
  readonly disabled?: boolean
  /** Starts or stops the connected preview when the button is pressed. */
  readonly onToggle: () => void
}
export const SPoffoActionPreview = (props: SPoffoActionPreviewProps) => (
  <button
    type="button"
    aria-label={uiText('{value0} 수동 실행{value1}', {
      value0: String(props.label ?? uiText('연결')),
      value1: String(props.active ? uiText(' 중지') : ''),
    })}
    aria-pressed={props.active === true}
    onClick={() => props.onToggle()}
    disabled={props.disabled}
    class="ml-auto shrink-0 cursor-pointer rounded-md border border-solid border-stone-300 bg-white
    px-2 py-1 text-xs text-stone-700 aria-pressed:border-blue-600 aria-pressed:text-blue-700 disabled:opacity-40"
  >
    {props.active ? uiText('중지') : uiText('수동 실행')}
  </button>
)
