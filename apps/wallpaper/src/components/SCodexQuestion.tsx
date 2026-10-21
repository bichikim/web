import {For, Show} from 'solid-js'
import {type CodexPort, type CodexQuestionRequest, useQuestionAnswer} from '../features/codex'

interface SCodexQuestionProps {
  readonly request: CodexQuestionRequest
  readonly onAnswer?: CodexPort['answerQuestion']
}
export const SCodexQuestion = (props: SCodexQuestionProps) => {
  const answer = useQuestionAnswer({answer: () => props.onAnswer, request: () => props.request})
  const handleSubmit = (event: SubmitEvent) => {
    event.preventDefault()
    answer.submit()
  }
  return (
    <form aria-label="Codex 질문 답변" class="flex min-h-0 flex-col gap-3" onSubmit={handleSubmit}>
      <div
        role="region"
        aria-label="질문 내용"
        class="grid min-h-0 gap-3 overflow-auto overscroll-contain"
      >
        <For each={props.request.questions.map((question) => question.id)}>
          {(id) => (
            <Show when={props.request.questions.find((question) => question.id === id)}>
              {(question) => (
                <fieldset disabled={answer.busy()} class="m-0 grid min-w-0 gap-2 border-0 p-0">
                  <legend class="mb-2 p-0 text-[13px] font-medium">{question().question}</legend>
                  <For each={question().options.map((choice) => choice.label)}>
                    {(label) => (
                      <Show when={question().options.find((choice) => choice.label === label)}>
                        {(choice) => (
                          <button
                            type="button"
                            aria-pressed={answer.answers().get(question().id) === choice().label}
                            class="wallpaper-file-button grid w-full gap-0.5 text-left
                      aria-pressed:border-blue-500 aria-pressed:bg-blue-50"
                            onClick={() => answer.setAnswer(question().id, choice().label)}
                          >
                            <span>{choice().label}</span>
                            <Show when={choice().description}>
                              <span class="text-xs text-stone-500">{choice().description}</span>
                            </Show>
                          </button>
                        )}
                      </Show>
                    )}
                  </For>
                  <textarea
                    aria-label={`${question().question} 답변`}
                    placeholder="직접 입력"
                    rows={2}
                    maxLength={4000}
                    class="wallpaper-field resize-y appearance-none [font-family:inherit]"
                    value={answer.answers().get(question().id) ?? ''}
                    onInput={(event) => answer.setAnswer(question().id, event.currentTarget.value)}
                  />
                </fieldset>
              )}
            </Show>
          )}
        </For>
      </div>
      <button
        type="submit"
        class="wallpaper-file-button shrink-0 self-end"
        disabled={answer.busy() || !answer.complete()}
      >
        답변 보내기
      </button>
      <Show when={answer.error()}>
        {(message) => (
          <p role="alert" class="m-0 shrink-0 text-xs text-red-700">
            {message()}
          </p>
        )}
      </Show>
    </form>
  )
}
