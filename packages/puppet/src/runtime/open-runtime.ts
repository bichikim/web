import {navigateWorkspace} from '../navigate-workspace'
import type {PuppetDocument} from '../player'
import {createRuntimeDocumentSession} from './create-runtime-document-session'

interface OpenRuntimeOptions {
  /** Omitted, complete navigation after saving; aborting retains the current screen. */
  readonly signal?: AbortSignal
  readonly page?: 'studio' | 'viewer'
  readonly document: PuppetDocument
  readonly motionId?: string | null
}

/** Persists the current document before switching to a runtime workspace in this tab. */
export const openRuntime = async (options: OpenRuntimeOptions): Promise<void> => {
  const sessionId = crypto.randomUUID()
  await createRuntimeDocumentSession(sessionId).write(options.document)
  if (options.signal?.aborted) {
    return
  }
  const url = new URL(`/${options.page ?? 'viewer'}`, location.origin)
  url.searchParams.set('session', sessionId)
  if (options.motionId !== undefined && options.motionId !== null) {
    url.searchParams.set('motion', options.motionId)
  }
  navigateWorkspace(url.href)
}
