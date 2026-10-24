import {failure, type Result, success} from '../shared/contracts'
import {runComposerAction as run} from './run-composer-action'

export interface ComposerAttachment {
  (viewer: string, exportFile: () => Promise<Result<string>>): Promise<Result<boolean>>
}

/** Validates the active Claude session, exports on demand and confirms its native composer file card. */
export const createComposerAttachment = (application: string): ComposerAttachment => {
  let busy = false
  return async (viewer, exportFile) => {
    if (busy) {
      return failure('composer-attachment-failed')
    }
    busy = true
    try {
      const target = await run(application, ['check', viewer])
      if (!target.ok) {
        return failure(target.code)
      }
      if (target.session === undefined) {
        return failure('composer-target-missing')
      }
      const file = await exportFile()
      if (!file.ok) {
        return file
      }
      const result = await run(application, ['paste', viewer, target.session, file.value])
      return result.ok ? success(true) : failure(result.code)
    } catch {
      return failure('composer-attachment-failed')
    } finally {
      busy = false
    }
  }
}
