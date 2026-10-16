import {type JSX, Show} from 'solid-js'
import type {Lab} from './use-lab'
import type {Editor} from './use-editor'
export interface SEditorProps {
  readonly lab: Lab
  readonly editor: Editor
}
export const SEditor = (props: SEditorProps) => {
  const handleInfer = (): void => {
    try {
      props.lab.infer(props.editor.prompt())
    } catch (cause) {
      props.lab.reportError(cause)
    }
  }
  const handleState: JSX.EventHandler<HTMLTextAreaElement, InputEvent> = (event) =>
    props.editor.updateState(event.currentTarget.value)
  const handleInstructions: JSX.EventHandler<HTMLTextAreaElement, InputEvent> = (event) =>
    props.editor.updateInstructions(event.currentTarget.value)
  const handleChoices: JSX.EventHandler<HTMLTextAreaElement, InputEvent> = (event) =>
    props.editor.updateChoices(event.currentTarget.value)
  const handleType: JSX.EventHandler<HTMLSelectElement, Event> = (event) => {
    try {
      props.editor.changeType(event.currentTarget.value)
    } catch (cause) {
      props.lab.reportError(cause)
    }
  }
  return (
    <section aria-labelledby="question-title" class="lab-card">
      <div class="mb-6 flex items-center justify-between gap-4">
        <h2 id="question-title" class="m-0 text-lg font-700">
          01 · 분류 지시문과 문장
        </h2>
        <select
          aria-label="질문 유형"
          value={props.editor.type()}
          onChange={handleType}
          disabled={props.lab.busy()}
          class="lab-input w-auto"
        >
          <option value="choice">선택 · choice</option>
          <option value="score">점수 · score</option>
          <option value="noul">참·거짓 · noul</option>
        </select>
      </div>
      <label for="instructions" class="lab-label">
        분류 지시문
      </label>
      <textarea
        id="instructions"
        rows={2}
        value={props.editor.instructions()}
        onInput={handleInstructions}
        disabled={props.lab.busy()}
        class="lab-input mb-5 resize-y"
      />
      <Show when={props.editor.type() !== 'noul'}>
        <label for="choices" class="lab-label">
          선택지 <span class="font-400 text-slate-500">· 한 줄에 하나, 점수는 낮은 단계부터</span>
        </label>
        <textarea
          id="choices"
          rows={3}
          value={props.editor.choices()}
          onInput={handleChoices}
          disabled={props.lab.busy()}
          class="lab-input mb-5 resize-y font-mono"
        />
      </Show>
      <label for="state" class="lab-label">
        분류할 문장
      </label>
      <textarea
        id="state"
        rows={5}
        value={props.editor.state()}
        onInput={handleState}
        disabled={props.lab.busy()}
        class="lab-input mb-4 resize-y"
      />
      <button
        type="button"
        onClick={handleInfer}
        disabled={!props.lab.loaded() || props.lab.busy()}
        class="lab-primary w-full"
      >
        추론하기 <span aria-hidden="true">↗</span>
      </button>
      <div role="status" aria-label="추론 답" aria-live="polite" aria-atomic="true">
        <Show when={!props.lab.busy() && props.lab.answer()}>
          {(answer) => (
            <div class="mt-4 rounded-xl bg-teal-50 p-5 text-teal-950">
              <p class="mb-2 mt-0 text-sm font-600">최근 판단</p>
              <p class="m-0 break-words text-3xl font-800 leading-snug">{answer().label}</p>
              <p class="mb-0 mt-3 text-xl font-700">확률 {answer().probability}</p>
            </div>
          )}
        </Show>
      </div>
    </section>
  )
}
