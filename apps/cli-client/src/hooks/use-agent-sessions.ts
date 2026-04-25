import type {AgentSessionSummary} from '@/components/agent/types'
import {fetchSessions} from '@/utils/agent-page'

interface UseAgentSessionsProperties {
  readonly getPostUrl: () => string
  readonly getWorkingDirectory: () => string
  readonly setIsSessionsOpen: (value: boolean) => void
  readonly setSessionsError: (value: string | null) => void
  readonly setIsSessionsLoading: (value: boolean) => void
  readonly setSessions: (value: readonly AgentSessionSummary[]) => void
}

export const useAgentSessions = (properties: UseAgentSessionsProperties) => {
  const openSessionsPopup = async () => {
    properties.setIsSessionsOpen(true)
    properties.setSessionsError(null)
    properties.setIsSessionsLoading(true)

    const result = await fetchSessions({
      postUrl: properties.getPostUrl(),
      workingDirectory: properties.getWorkingDirectory(),
    })

    if ('error' in result) {
      properties.setSessionsError(result.error)
      properties.setSessions([])
      properties.setIsSessionsLoading(false)
      return
    }

    properties.setSessions(result.sessions)
    properties.setIsSessionsLoading(false)
  }

  return {
    openSessionsPopup,
  }
}
