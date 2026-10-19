import {Show} from 'solid-js'
import {type CodexApproval, type CodexPort, useApprovalDecision} from '../features/codex'

interface SCodexApprovalProps {
  readonly request: CodexApproval
  readonly onDecide?: CodexPort['decideApproval']
}
export const SCodexApproval = (props: SCodexApprovalProps) => {
  const decision = useApprovalDecision({
    decide: () => props.onDecide,
    requestId: () => props.request.id,
  })
  const allow = () => decision.decide('allow')
  const deny = () => decision.decide('deny')
  const fallback = () => decision.decide('codex')
  return (
    <section
      aria-label={`${props.request.tool} 승인`}
      class="flex min-h-0 min-w-0 flex-col gap-2 border-0 border-t border-solid border-amber-200 pt-2"
    >
      <div
        role="region"
        aria-label="승인 요청 내용"
        tabIndex={0}
        class="min-h-0 overflow-auto overscroll-contain"
      >
        <span class="text-xs font-medium">{props.request.tool}</span>
        <p class="m-0 break-all text-[11px] text-stone-600">{props.request.cwd}</p>
        <pre
          class="m-0 whitespace-pre-wrap break-words rounded bg-white/60
          p-2 text-[11px] [overflow-wrap:anywhere]"
        >
          {JSON.stringify(props.request.input, null, 2)}
        </pre>
      </div>
      <div class="flex shrink-0 flex-wrap gap-1.5">
        <button
          type="button"
          class="wallpaper-file-button"
          disabled={decision.busy()}
          onClick={allow}
        >
          이번만 승인
        </button>
        <button
          type="button"
          class="wallpaper-file-button"
          disabled={decision.busy()}
          onClick={deny}
        >
          거절
        </button>
        <button
          type="button"
          class="wallpaper-file-button"
          disabled={decision.busy()}
          onClick={fallback}
        >
          Codex에서 처리
        </button>
      </div>
      <Show when={decision.error()}>
        {(message) => (
          <p role="alert" class="m-0 shrink-0 text-xs text-red-700">
            {message()}
          </p>
        )}
      </Show>
    </section>
  )
}
