import {execFile} from 'node:child_process'
import {mkdtemp, rm, writeFile} from 'node:fs/promises'
import {platform} from 'node:os'
import {basename, join} from 'node:path'
import {MAX_ATTACHMENT_BYTES} from '../shared/chat-attachment'
import {MAX_CONTEXT_BYTES} from '../shared/context-limits'
import {failure, type Result, success} from '../shared/contracts'

const COPY_FILE = `
ObjC.import('AppKit')
ObjC.import('Foundation')
function run(paths) {
  const clipboard = $.NSPasteboard.generalPasteboard
  const file = $.NSURL.fileURLWithPath(paths[0])
  clipboard.clearContents
  if (!clipboard.writeObjects([file])) throw new Error('clipboard-unavailable')
  // Electron's copied-file paste path also uses the legacy filename-list representation.
  clipboard.addTypesOwner(['NSFilenamesPboardType'], null)
  if (!clipboard.setPropertyListForType([paths[0]], 'NSFilenamesPboardType')) {
    throw new Error('clipboard-unavailable')
  }
}
`

/** Copies a private temporary snapshot for an explicit native file paste, without reading the clipboard. */
export const createAttachmentClipboard =
  (): ((content: string | Uint8Array, filename?: string) => Promise<Result<string>>) =>
  async (content, filename = 'code-viewer-context.txt') => {
    if (platform() !== 'darwin') {
      return failure('clipboard-unavailable')
    }
    if (
      filename.length === 0 ||
      filename === '.' ||
      filename === '..' ||
      basename(filename) !== filename ||
      filename.includes('\\') ||
      filename.includes('\0')
    ) {
      return failure('invalid-name')
    }
    const bytes =
      typeof content === 'string' ? new TextEncoder().encode(content).length : content.byteLength
    if (bytes > (typeof content === 'string' ? MAX_CONTEXT_BYTES : MAX_ATTACHMENT_BYTES)) {
      return failure('context-too-large')
    }
    let directory: string | undefined
    try {
      directory = await mkdtemp('/tmp/cv-')
      const path = join(directory, filename)
      await writeFile(path, content, {encoding: 'utf8', mode: 0o600})
      await new Promise<void>((resolve, reject) => {
        execFile(
          '/usr/bin/osascript',
          ['-l', 'JavaScript', '-e', COPY_FILE, path],
          {encoding: 'utf8', maxBuffer: MAX_CONTEXT_BYTES},
          (error) => (error === null ? resolve() : reject(error)),
        )
      })
      // Native paste reads this file later; leave successful exports for OS temporary-file cleanup.
      return success(path)
    } catch {
      if (directory !== undefined) {
        await rm(directory, {force: true, recursive: true}).catch(() => undefined)
      }
      return failure('clipboard-unavailable')
    }
  }
