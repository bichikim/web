import {createCodePatch} from '../headless/create-code-patch'
import type {ViewerSession} from '../shared/contracts'
import type {ViewerPort} from './types'
import {addChatContext} from './add-chat-context'

interface ShareCodeChangesOptions {
  readonly session: ViewerSession | null
  readonly original: string
  readonly source: string
  readonly revision: string
  readonly port: Pick<ViewerPort, 'context' | 'attachSelection'>
  readonly onNotice: (message: string) => void
  readonly onError: (error: unknown) => void
}

/** Attaches a snapshot of unsaved changes against the supplied read/save baseline. */
export const shareCodeChanges = async (options: ShareCodeChangesOptions): Promise<void> => {
  const {session, original, source, revision} = options
  if (session === null || original === source) {
    return
  }
  try {
    const {path} = session.document.location
    const patch = createCodePatch({original, path, source})
    if (patch === undefined) {
      options.onError(
        new Error('변경 범위가 커서 채팅에 추가하지 못했습니다. 변경 내용을 나누어 추가하세요.'),
      )
      return
    }
    await addChatContext({
      message: '변경 내용을 다음 채팅 메시지에 추가했습니다.',
      onNotice: options.onNotice,
      port: options.port,
      selection: {
        kind: 'changes',
        patch,
        path,
        revision,
      },
    })
  } catch (error) {
    options.onError(error)
  }
}
