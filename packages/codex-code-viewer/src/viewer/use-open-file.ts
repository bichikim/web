import {sessionSchema, type ViewerSession} from '../shared/contracts'
import {errorMessage} from './error-message'
import type {ViewerPort} from './types'
import {useLatestRequest} from './use-latest-request'

export const useOpenFile = (
  port: ViewerPort,
  receive: (session: ViewerSession) => void,
  report: (error: unknown) => void,
) => {
  const request = useLatestRequest(report)
  const closeDiscarded = async (session: ViewerSession): Promise<void> => {
    await port.call('code.close', {session: session.session}).catch(report)
  }
  const open = async (path: string): Promise<boolean> => {
    const result = await request.run(async () => {
      const response = await port.call('code.open', {path})
      if (response.isError) {
        throw new Error(errorMessage(response.structuredContent))
      }
      return sessionSchema.parse(response.structuredContent)
    }, closeDiscarded)
    if (result !== null) {
      receive(result)
    }
    return result !== null
  }
  return {open, opening: request.pending}
}
