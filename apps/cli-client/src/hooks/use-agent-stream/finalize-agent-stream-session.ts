import {flushAgentJsonStdoutBuffer} from '@/utils/agent-json-stdout-display'
import {hasProcessFailureIndicators} from '@/hooks/use-agent-stream/has-process-failure-indicators'
import {updateLastMessageContentByRole} from '@/hooks/use-agent-stream/update-last-message-content-by-role'
import {composeAgentStreamFailureErrorMessage} from './compose-agent-stream-failure-error-message'
import {finalizeAssistantMessageContent} from '@/hooks/use-agent-stream/finalize-assistant-message-content'
import type {AgentStreamLoopMutable} from '@/hooks/use-agent-stream/create-agent-post-stream-handlers'
import type {
  AgentStreamControl,
  UseAgentStreamProperties,
} from '@/hooks/use-agent-stream/use-agent-stream-types'

export interface FinalizeAgentStreamSessionOptions {
  readonly controller: AbortController
  readonly mutable: AgentStreamLoopMutable
  readonly properties: UseAgentStreamProperties
  readonly requestUrl: string
  readonly streamControl: AgentStreamControl
}

export const finalizeAgentStreamSession = (options: FinalizeAgentStreamSessionOptions): void => {
  const {controller, mutable, properties, requestUrl, streamControl} = options

  mutable.sessionIdParser!.flush()
  streamControl.activeController = undefined
  mutable.stdoutJsonState = flushAgentJsonStdoutBuffer(mutable.stdoutJsonState)
  const {display} = mutable.stdoutJsonState
  const hasStreamFailure = hasProcessFailureIndicators({
    exitCode: mutable.exitCode,
    signalText: mutable.exitSignalText,
    stderrText: mutable.stderrOutput,
  })

  properties.setMessages((previous) =>
    updateLastMessageContentByRole(
      previous,
      'assistant',
      finalizeAssistantMessageContent({
        aborted: controller.signal.aborted,
        display,
        hasStreamFailure,
      }),
    ),
  )

  if (hasStreamFailure) {
    properties.setStreamError(
      composeAgentStreamFailureErrorMessage({
        exitCode: mutable.exitCode,
        exitSignalText: mutable.exitSignalText,
        requestUrl,
        stderrOutput: mutable.stderrOutput,
      }),
    )
  } else if (mutable.didConsumeStream && !controller.signal.aborted) {
    // Resume state is user recovery data; keep it when HTTP/read errors stop the run.
    properties.clearResumeSessionId()
  }

  // Failed requests are reset to idle before this cleanup runs; do not mask them
  // as completed just because handlers were initialized.
  if (mutable.didConsumeStream) {
    properties.setStatus('done')
  }
}
