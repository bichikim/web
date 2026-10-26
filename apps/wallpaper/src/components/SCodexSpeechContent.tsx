import {Show} from 'solid-js'
import type {CodexActivity, CodexApproval, CodexQuestionRequest} from '../features/codex'
import {SCodexApprovals} from './SCodexApprovals'
import {SCodexQuestions} from './SCodexQuestions'
import {SCodexPrompt} from './SCodexPrompt'
import {SSpeechMarkdown} from './SSpeechMarkdown'

interface SCodexSpeechContentProps {
  readonly questions?: readonly CodexQuestionRequest[]
  readonly activity: CodexActivity
  readonly caption?: string
  readonly approvals?: readonly CodexApproval[]
  readonly inactive?: boolean
  readonly wrap?: boolean
}
export const SCodexSpeechContent = (props: SCodexSpeechContentProps) => (
  <div inert={props.inactive} class="flex min-h-0 min-w-0 flex-col gap-1">
    <Show
      when={props.activity.phase === 'response' && props.activity.response}
      fallback={
        <Show when={!props.questions?.length}>
          <div
            tabIndex={props.activity.phase === 'working' ? 0 : undefined}
            data-wrap={props.wrap ?? true}
            class="min-h-0 min-w-0 overflow-auto overscroll-contain text-[13px] leading-5
            data-[wrap=true]:overflow-x-hidden"
          >
            <SSpeechMarkdown source={props.activity.text} wrap={props.wrap ?? true} />
          </div>
        </Show>
      }
    >
      {(response) => (
        <div
          role="region"
          aria-label={`${props.caption ?? 'Codex'} 응답`}
          tabIndex={0}
          data-wrap={props.wrap ?? false}
          class="min-h-0 min-w-0 overflow-auto overscroll-contain text-[13px]
            data-[wrap=true]:overflow-x-hidden
            leading-5 focus-visible:outline-2 focus-visible:outline-blue-700
            [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar]:w-1.5
            [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-stone-400/60"
        >
          <SSpeechMarkdown source={response()} wrap={props.wrap} />
        </div>
      )}
    </Show>
    <Show when={props.activity.tool && props.activity.phase === 'working'}>
      <span class="truncate text-[11px] text-stone-500">{props.activity.tool}</span>
    </Show>
    <SCodexApprovals requests={props.approvals} />
    <SCodexQuestions requests={props.questions} />
    <Show when={props.activity.phase === 'response' || props.activity.phase === 'interrupted'}>
      <SCodexPrompt
        sessionId={props.activity.sessionId}
        notificationId={props.activity.notificationId}
      />
    </Show>
  </div>
)
