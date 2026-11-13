import {createCodePatch, formatContext} from '../../../src/headless/index.ts'
import type {PaneAttachment, PaneDocument, PaneState} from './pane-state'
const MAX_ATTACHMENTS = 20
const MAX_ATTACHMENT_BYTES = 65_536
/** Appends a snapshot within the shared chat context budget. */
export const appendAttachment = (state: PaneState, attachment: PaneAttachment): PaneState => {
  const attachments = [...state.attachments, attachment]
  if (
    attachments.length > MAX_ATTACHMENTS ||
    new TextEncoder().encode(attachments.map((entry) => entry.text).join('\n')).length >
      MAX_ATTACHMENT_BYTES
  ) {
    throw new Error('첨부 용량을 초과했습니다.')
  }
  return {...state, attachments}
}
/** Captures a draft patch against its last read or saved revision. */
export const draftAttachment = (
  document: PaneDocument,
): {readonly patch: string; readonly attachment: PaneAttachment} | undefined => {
  if (document.source === document.base) {
    return undefined
  }
  const patch = createCodePatch({
    original: document.base,
    path: document.path,
    source: document.source,
  })
  if (patch === undefined) {
    throw new Error('변경 범위가 커서 첨부하지 못했습니다.')
  }
  return {
    attachment: {
      end: document.source.split(/\r\n|\n|\r/u).length,
      path: document.path,
      start: 1,
      text: formatContext({
        kind: 'changes',
        patch,
        path: document.path,
        revision: document.revision,
      }),
    },
    patch,
  }
}
