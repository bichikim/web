import {Show} from 'solid-js'
import {type CodexPort, usePromptSend} from '../features/codex'

interface SCodexPromptProps {
  readonly sessionId: string
  readonly onSend?: CodexPort['sendPrompt']
}
export const SCodexPrompt = (props: SCodexPromptProps) => {
  const prompt = usePromptSend({send: () => props.onSend, sessionId: () => props.sessionId})
  const handleSubmit = (event: SubmitEvent) => {
    event.preventDefault()
    prompt.send()
  }
  return (
    <form
      aria-label="Codex 프롬프트 전송"
      class="grid shrink-0 grid-cols-[minmax(0,1fr)_2rem] items-end gap-1.5 pt-2"
      onSubmit={handleSubmit}
    >
      <textarea
        aria-label="Codex에 보낼 메시지"
        placeholder="다음 요청"
        rows={2}
        maxLength={4000}
        disabled={prompt.busy()}
        class="wallpaper-field resize-none appearance-none [font-family:inherit]"
        value={prompt.draft()}
        onInput={(event) => prompt.edit(event.currentTarget.value)}
      />
      <button
        type="submit"
        aria-label="보내기"
        title="보내기"
        class="wallpaper-file-button grid h-8 w-8 place-items-center p-0"
        disabled={prompt.busy() || !prompt.draft().trim()}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          class="h-4 w-4 fill-none stroke-current stroke-2"
        >
          <path d="m5 12 7-7 7 7M12 5v14" class="[stroke-linecap:round] [stroke-linejoin:round]" />
        </svg>
      </button>
      <Show when={prompt.error()}>
        {(message) => (
          <p role="alert" class="col-span-2 m-0 text-xs text-red-700">
            {message()}
          </p>
        )}
      </Show>
    </form>
  )
}
