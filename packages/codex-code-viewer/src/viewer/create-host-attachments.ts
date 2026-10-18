import type {ChatAttachment} from '../shared/chat-attachment'
import type {ViewerContext, ViewerPort} from './types'
import {errorMessage} from './error-message'
import {formatContext} from './format-context'
import {contextAttachmentFilename} from '../shared/context-attachment-filename'

interface HostAttachmentOptions {
  readonly call: ViewerPort['call']
  readonly session: () => string | undefined
  readonly standard: boolean
  readonly composer?: boolean
  readonly clipboard?: boolean
  readonly clear: () => Promise<void>
}

const selectionAttachment = async (
  call: ViewerPort['call'],
  selection: ViewerContext,
): Promise<ChatAttachment> => {
  if ('kind' in selection && selection.kind === 'file') {
    return {kind: 'file', path: selection.path}
  }
  const text = formatContext(selection)
  if ('kind' in selection && selection.kind !== 'directory') {
    return {
      filename: contextAttachmentFilename(
        selection.path,
        selection.kind === 'code' ? 'selection' : 'changes',
      ),
      kind: 'text',
      text,
    }
  }
  const result = await call('code.context', {
    path: selection.path,
    ...('kind' in selection ? {} : {endLine: selection.endLine, line: selection.line}),
  })
  if (result.isError) {
    throw new Error(errorMessage(result.structuredContent))
  }
  const content = result.content
    .flatMap((entry) => (entry.type === 'text' ? [entry.text] : []))
    .join('\n')
  return {
    ...('kind' in selection
      ? {}
      : {filename: contextAttachmentFilename(selection.path, 'selection')}),
    kind: 'text',
    text: `${text}\n\n${content}`,
  }
}

/** Connects explicit attachment actions to the current session and clears only confirmed pending delivery. */
export const createHostAttachments = (options: HostAttachmentOptions) => {
  let queue = Promise.resolve()
  const invoke = async (name: string, attachment?: ChatAttachment): Promise<void> => {
    const session = options.session()
    if (session === undefined) {
      throw new Error('파일을 먼저 열어 주세요.')
    }
    const result = await options.call(name, {
      ...(attachment === undefined ? {} : {attachment}),
      session,
    })
    if (result.isError) {
      throw new Error(errorMessage(result.structuredContent))
    }
  }
  const attach = (selection?: ViewerContext): Promise<void> => {
    const task = queue.then(async () => {
      const attachment =
        selection === undefined ? undefined : await selectionAttachment(options.call, selection)
      await invoke('code.attach-to-composer', attachment)
      if (selection === undefined) {
        await options.clear()
      }
    })
    queue = task.catch(() => undefined)
    return task
  }
  return {
    ...(options.standard && options.clipboard
      ? {copyContextFiles: () => invoke('code.copy-attachments')}
      : {}),
    ...(options.standard && options.composer
      ? {
          attachContextFiles: () => attach(),
          attachSelection: (selection: ViewerContext) => attach(selection),
        }
      : {}),
  }
}
