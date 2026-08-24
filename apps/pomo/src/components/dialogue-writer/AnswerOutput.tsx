import {cx} from 'class-variance-authority'
import {Show} from 'solid-js'

const SECONDARY_BUTTON_CLASSES = cx(
  'h-10 rounded-full border border-white/12 bg-white/5 px-4 text-sm font-650 text-#d9cfdd',
  'transition hover:bg-white/9 disabled:cursor-not-allowed disabled:opacity-35',
)

interface DirectAnswerOutputProps {
  readonly canCopy: boolean
  readonly isGenerating: boolean
  readonly onCopy: () => void
  readonly output: string
  readonly title: string
  readonly titleId: string
}

export const DirectAnswerOutput = (props: DirectAnswerOutputProps) => (
  <section aria-labelledby={props.titleId} class="grid gap-2.5">
    <div class="flex items-center justify-between gap-4">
      <h2 class="m-0 text-sm font-650 text-#eee5ef" id={props.titleId}>
        {props.title}
      </h2>
      <button
        class={SECONDARY_BUTTON_CLASSES}
        disabled={!props.canCopy}
        onClick={() => props.onCopy()}
        type="button"
      >
        복사하기
      </button>
    </div>
    <div
      aria-busy={props.isGenerating}
      class={cx(
        'min-h-52 whitespace-pre-wrap rounded-5 border p-5 text-[15px] leading-7',
        props.output.length > 0
          ? 'border-#9ed6bb/20 bg-#9ed6bb/6 text-#edf8f2'
          : 'border-white/8 bg-#17131f/70 text-#776c7f',
      )}
    >
      {props.output || '생성한 답변이 여기에 나타나요.'}
      <Show when={props.isGenerating}>
        <span aria-hidden="true" class="ml-1 inline-block h-4 w-0.5 animate-pulse bg-#9ed6bb" />
      </Show>
    </div>
  </section>
)
