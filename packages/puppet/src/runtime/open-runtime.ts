import type {PuppetDocument} from '../player'
import {createRuntimeDocumentSession} from './create-runtime-document-session'

interface OpenRuntimeOptions {
  readonly page?: 'studio' | 'viewer'
  readonly document: PuppetDocument
  readonly motionId?: string | null
}

/** Opens a locally persisted document snapshot in a separate viewer tab. */
export const openRuntime = async (options: OpenRuntimeOptions): Promise<void> => {
  const popup = globalThis.open('about:blank', '_blank')
  if (popup === null) {
    throw new Error('팝업을 허용한 뒤 다시 열어주세요.')
  }
  popup.opener = null
  try {
    const sessionId = crypto.randomUUID()
    await createRuntimeDocumentSession(sessionId).write(options.document)
    const url = new URL(`/${options.page ?? 'viewer'}`, location.origin)
    url.searchParams.set('session', sessionId)
    if (options.motionId !== undefined && options.motionId !== null) {
      url.searchParams.set('motion', options.motionId)
    }
    popup.location.replace(url.href)
  } catch (error) {
    popup.close()
    throw error
  }
}
