import {text as uiText} from '../features/localization'
interface SSpeechSendButtonProps {
  readonly disabled?: boolean
}
export const SSpeechSendButton = (props: SSpeechSendButtonProps) => (
  <button
    type="submit"
    aria-label={uiText('보내기')}
    title={uiText('보내기')}
    class="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-lg border-0 bg-stone-800 p-0
    text-white hover:bg-stone-700 focus-visible:outline-solid focus-visible:outline-2
    focus-visible:outline-offset-2 focus-visible:outline-blue-700
    disabled:cursor-default disabled:bg-stone-100 disabled:text-stone-400"
    disabled={props.disabled}
  >
    <svg aria-hidden="true" viewBox="0 0 24 24" class="h-4 w-4 fill-none stroke-current stroke-2">
      <path d="m5 12 7-7 7 7M12 5v14" class="[stroke-linecap:round] [stroke-linejoin:round]" />
    </svg>
  </button>
)
