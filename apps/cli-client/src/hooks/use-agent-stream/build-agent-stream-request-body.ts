import {DEFAULT_WORKING_DIRECTORY} from '@/utils/agent-defaults'

export interface BuildAgentStreamRequestBodyInput {
  readonly conversationId: string
  readonly prompt: string
  readonly workingDirectory: string
  readonly resumeSessionId: string | null
}

export const buildAgentStreamRequestBody = (
  input: BuildAgentStreamRequestBodyInput,
): Record<string, string> => {
  const normalizedWorkingDirectory = input.workingDirectory.trim()
  const resumeSessionId = input.resumeSessionId?.trim() ?? ''

  const body: Record<string, string> = {
    conversationId: input.conversationId,
    prompt: input.prompt,
    workingDirectory:
      normalizedWorkingDirectory.length > 0
        ? normalizedWorkingDirectory
        : DEFAULT_WORKING_DIRECTORY,
  }

  if (resumeSessionId !== '') {
    body.resumeSessionId = resumeSessionId
  }

  return body
}
