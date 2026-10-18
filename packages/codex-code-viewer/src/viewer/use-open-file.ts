import {hasDeferredSource} from '../shared/has-deferred-source'
import {sessionSchema, type ViewerSession} from '../shared/contracts'
import {errorMessage} from './error-message'
import {loadDocumentSource} from './load-document-source'
import type {NavigationOptions, ViewerPort} from './types'
import {useLatestRequest} from './use-latest-request'

export const useOpenFile = (
  port: ViewerPort,
  receive: (session: ViewerSession, options?: NavigationOptions) => void | Promise<void>,
  report: (error: unknown) => void,
) => {
  const request = useLatestRequest(report)
  const closeDiscarded = async (session: ViewerSession): Promise<void> => {
    await port.call('code.close', {session: session.session}).catch(report)
  }
  const open = async (path: string, options?: NavigationOptions): Promise<boolean> => {
    const result = await request.run(async () => {
      const response = await port.call('code.open', {path})
      if (response.isError) {
        throw new Error(errorMessage(response.structuredContent))
      }
      const value = sessionSchema.parse(response.structuredContent)
      if (!hasDeferredSource(value.document)) {
        return value
      }
      try {
        const source = await loadDocumentSource({
          document: value.document,
          port,
          session: value.session,
        })
        return {...value, document: {...value.document, source}}
      } catch (error) {
        await closeDiscarded(value)
        throw error
      }
    }, closeDiscarded)
    if (result !== null) {
      if (options === undefined) {
        await receive(result)
      } else {
        await receive(result, options)
      }
    }
    return result !== null
  }
  return {open, opening: request.pending}
}
