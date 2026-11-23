import {createSignal} from 'solid-js'
import {COMPOSITION_BUTTON_CLASSES} from './button-classes'

export interface PConfigurationExportProps {
  readonly configuration: string
}

export function PConfigurationExport(props: PConfigurationExportProps) {
  const [message, setMessage] = createSignal('')
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(props.configuration)
      setMessage('조합 설정을 복사했습니다.')
    } catch {
      setMessage('아래 설정을 선택해 직접 복사해 주세요.')
    }
  }

  return (
    <details class="mt-6 rounded-xl border border-#ffffff/12 p-4">
      <summary class="cursor-pointer text-sm font-700">조합 설정 JSON</summary>
      <button class={`${COMPOSITION_BUTTON_CLASSES} mt-3`} onClick={handleCopy} type="button">
        설정 복사
      </button>
      <p aria-live="polite" class="text-sm text-#f4d7b5">
        {message()}
      </p>
      <textarea
        aria-label="조합 설정 JSON"
        class="h-60 w-full rounded-lg bg-#17131f p-3 font-mono text-xs text-#ccc2d0"
        readonly
        value={props.configuration}
      />
    </details>
  )
}
