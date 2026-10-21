import {execFile} from 'node:child_process'
import {MAX_CODE_BYTES} from '../shared/editing-limits'
import {failure, type Result, success} from '../shared/contracts'
import {createAttachmentClipboard} from './create-attachment-clipboard'
export interface ClipboardPort {
  readonly read: () => Promise<Result<string>>
  readonly write: (text: string) => Promise<Result<boolean>>
  readonly writeAttachment?: (
    content: string | Uint8Array,
    filename?: string,
  ) => Promise<Result<string>>
}
/** Creates an explicit local text clipboard adapter without reading at initialization. */
export const createClipboard = (): ClipboardPort => ({
  ...(process.platform === 'darwin' ? {writeAttachment: createAttachmentClipboard()} : {}),
  read: () =>
    new Promise((resolve) => {
      if (process.platform !== 'darwin') {
        resolve(failure('clipboard-unavailable'))
        return
      }
      execFile(
        '/usr/bin/pbpaste',
        [],
        {
          encoding: 'utf8',
          env: {...process.env, LC_ALL: 'en_US.UTF-8'},
          maxBuffer: MAX_CODE_BYTES,
        },
        (error, stdout) => {
          resolve(error === null ? success(stdout) : failure('clipboard-unavailable'))
        },
      )
    }),
  write: (text) =>
    new Promise((resolve) => {
      if (process.platform !== 'darwin') {
        resolve(failure('clipboard-unavailable'))
        return
      }
      const child = execFile(
        '/usr/bin/pbcopy',
        [],
        {env: {...process.env, LC_ALL: 'en_US.UTF-8'}, maxBuffer: MAX_CODE_BYTES},
        (error) => {
          resolve(error === null ? success(true) : failure('clipboard-unavailable'))
        },
      )
      child.stdin?.once('error', () => resolve(failure('clipboard-unavailable')))
      child.stdin?.end(text)
    }),
})
