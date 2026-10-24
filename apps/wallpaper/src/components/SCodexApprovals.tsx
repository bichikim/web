import {For, Show} from 'solid-js'
import type {CodexApproval} from '../features/codex'
import {SCodexApproval} from './SCodexApproval'

interface SCodexApprovalsProps {
  readonly requests?: readonly CodexApproval[]
}
export const SCodexApprovals = (props: SCodexApprovalsProps) => (
  <For each={props.requests?.map((request) => request.id)}>
    {(id) => (
      <Show when={props.requests?.find((request) => request.id === id)}>
        {(request) => <SCodexApproval request={request()} />}
      </Show>
    )}
  </For>
)
