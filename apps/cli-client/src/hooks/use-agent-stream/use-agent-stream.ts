import {submitAgentPrompt} from '@/hooks/use-agent-stream/submit-agent-prompt'
import {updateLastMessageContentByRole} from '@/hooks/use-agent-stream/update-last-message-content-by-role'
import type {
  AgentStreamControl,
  UseAgentStreamProperties,
} from '@/hooks/use-agent-stream/use-agent-stream-types'

export type {UseAgentStreamProperties} from '@/hooks/use-agent-stream/use-agent-stream-types'

export const useAgentStream = (properties: UseAgentStreamProperties) => {
  const streamControl: AgentStreamControl = {
    activeController: undefined,
  }

  const updateLastAssistantContent = (content: string) => {
    properties.setMessages((previous) =>
      updateLastMessageContentByRole(previous, 'assistant', content),
    )
  }

  const abortRun = () => {
    streamControl.activeController?.abort()
    streamControl.activeController = undefined
  }

  const submitPrompt = async ({
    event,
    promptText,
  }: {
    event: Event & {currentTarget: HTMLFormElement}
    promptText: string
  }): Promise<void> => {
    await submitAgentPrompt({
      event,
      promptText,
      properties,
      streamControl,
      updateLastAssistantContent,
    })
  }

  return {
    abortRun,
    submitPrompt,
  }
}
