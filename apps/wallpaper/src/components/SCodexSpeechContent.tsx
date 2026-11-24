import {localizeLiteral, localizeMessage, text as uiText} from '../features/localization'

import {type JSX, Show} from 'solid-js'
import {
  type CodexActivity,
  type CodexApproval,
  codexPhaseLabel,
  type CodexQuestionRequest,
} from '../features/codex'
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
  readonly onRecording?: (active: boolean) => void
  readonly footerActions?: JSX.Element
}
export const SCodexSpeechContent = (props: SCodexSpeechContentProps) => (
  <div inert={props.inactive} class="flex min-h-0 min-w-0 flex-col gap-1">
    <Show
      when={props.activity.phase === 'response' && props.activity.response}
      fallback={
        <Show when={!props.questions?.length}>
          <div
            data-speech-body
            tabIndex={props.activity.phase === 'working' ? 0 : undefined}
            data-wrap={props.wrap ?? true}
            class="[min-height:var(--speech-body-minimum,0px)] min-w-0 overflow-auto
            overscroll-contain text-[13px] leading-5
            data-[wrap=true]:overflow-x-hidden"
          >
            <SSpeechMarkdown
              source={localizeLiteral(props.activity.text)}
              wrap={props.wrap ?? true}
            />
          </div>
        </Show>
      }
    >
      {(response) => (
        <div
          data-speech-body
          role="region"
          aria-label={uiText('{value0} 응답', {value0: String(props.caption ?? 'Codex')})}
          tabIndex={0}
          data-wrap={props.wrap ?? false}
          class="[min-height:var(--speech-body-minimum,0px)] min-w-0 overflow-auto overscroll-contain text-[13px]
            data-[wrap=true]:overflow-x-hidden
            leading-5 focus-visible:outline-2 focus-visible:outline-blue-700
            [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar]:w-1.5
            [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-stone-400/60"
        >
          <SSpeechMarkdown source={response()} wrap={props.wrap} />
        </div>
      )}
    </Show>
    <SCodexApprovals requests={props.approvals} />
    <SCodexQuestions requests={props.questions} />
    <footer class="mt-1 flex min-h-6 min-w-0 shrink-0 items-center gap-2 text-[11px] leading-4">
      <Show when={props.activity.tool && props.activity.phase === 'working'}>
        <span
          class="min-w-0 flex-1 truncate text-stone-600"
          title={props.activity.tool ?? undefined}
        >
          {props.activity.tool}
        </span>
      </Show>
      <div class="ml-auto flex shrink-0 items-center gap-1.5">
        {props.footerActions}
        <span
          class="whitespace-nowrap font-medium"
          classList={{
            'text-amber-900': props.activity.phase === 'approval',
            'text-blue-800': props.activity.phase !== 'approval',
          }}
        >
          {localizeMessage(codexPhaseLabel(props.activity.phase) ?? '')}
        </span>
      </div>
    </footer>
    <Show when={props.activity.phase === 'response' || props.activity.phase === 'interrupted'}>
      <SCodexPrompt
        active={!props.inactive}
        onRecording={props.onRecording}
        sessionId={props.activity.sessionId}
        notificationId={props.activity.notificationId}
      />
    </Show>
  </div>
)
