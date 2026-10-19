import {For, Show} from 'solid-js'
import type {CodexQuestionRequest} from '../features/codex'
import {SCodexQuestion} from './SCodexQuestion'

interface SCodexQuestionsProps {
  readonly requests?: readonly CodexQuestionRequest[]
}
export const SCodexQuestions = (props: SCodexQuestionsProps) => (
  <For each={props.requests?.map((request) => request.id) ?? []}>
    {(id) => (
      <Show when={props.requests?.find((request) => request.id === id)}>
        {(request) => <SCodexQuestion request={request()} />}
      </Show>
    )}
  </For>
)
