import {localizeMessage, text as uiText} from '../features/localization'

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
    <form
      aria-label={uiText('Codex 질문 답변')}
      class="grid min-h-0 min-w-0 grid-rows-[minmax(var(--speech-body-minimum,0px),1fr)_minmax(0,auto)] gap-2"
      onSubmit={handleSubmit}
    >
      <div
        data-speech-body
        role="region"
        aria-label={uiText('질문 내용')}
        tabIndex={0}
        class="grid content-start [min-height:var(--speech-body-minimum,0px)] overflow-auto
        overscroll-contain text-[13px] leading-5
        focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-blue-700"
      >
        <div class="grid gap-3">
          <For each={props.request.questions.map((question) => question.id)}>
            {(id, index) => (
              <Show when={props.request.questions.find((question) => question.id === id)}>
                {(question) => (
                  <div>
                    <Show when={props.request.questions.length > 1}>
                      <p class="m-0 mb-1 text-xs font-medium">
                        {`${uiText('질문')} `}
                        {index() + 1}
                      </p>
                    </Show>
                    <p class="m-0 whitespace-pre-wrap break-words">{question().question}</p>
                  </div>
                )}
              </Show>
            )}
          </For>
        </div>
      </div>
      <div class="grid min-h-min grid-rows-[minmax(var(--speech-choices-minimum,0px),1fr)_auto] gap-2">
        <div
          data-speech-choices
          role="region"
          aria-label={uiText('답변 선택')}
          class="grid min-h-0 content-start overflow-auto overscroll-contain"
        >
          <div class="grid gap-3">
            <For each={props.request.questions.map((question) => question.id)}>
              {(id, index) => (
                <Show when={props.request.questions.find((question) => question.id === id)}>
                  {(question) => (
                    <fieldset disabled={answer.busy()} class="m-0 grid min-w-0 gap-1 border-0 p-0">
                      <legend class="p-0 text-xs font-medium">
                        <span class="sr-only">{question().question}</span>
                        <Show when={props.request.questions.length > 1}>
                          <span aria-hidden="true" class="mb-2 block">
                            {`${uiText('질문')} `}
                            {index() + 1}
                          </span>
                        </Show>
                      </legend>
                      <For each={question().options.map((choice) => choice.label)}>
                        {(label) => (
                          <Show when={question().options.find((choice) => choice.label === label)}>
                            {(choice) => (
                              <button
                                type="button"
                                aria-pressed={
                                  answer.answers().get(question().id) === choice().label
                                }
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
                        aria-label={uiText('{value0} 답변', {value0: String(question().question)})}
                        placeholder={uiText('직접 입력')}
                        rows={1}
                        maxLength={4000}
                        class="wallpaper-field resize-y appearance-none [font-family:inherit]"
                        value={answer.answers().get(question().id) ?? ''}
                        onInput={(event) =>
                          answer.setAnswer(question().id, event.currentTarget.value)
                        }
                      />
                    </fieldset>
                  )}
                </Show>
              )}
            </For>
          </div>
        </div>
        <button
          type="submit"
          class="wallpaper-file-button shrink-0 self-end"
          disabled={answer.busy() || !answer.complete()}
        >
          {uiText('답변 보내기')}
        </button>
        <Show when={answer.error()}>
          {(message) => (
            <p role="alert" class="m-0 shrink-0 text-xs text-red-700">
              {localizeMessage(message() ?? '')}
            </p>
          )}
        </Show>
      </div>
    </form>
  )
}
