import {hashValue} from './hash-value'
import {z} from 'zod'
import {defineOperation} from './define-operation'
import type {CommandContext} from './create-command-context'
import {documentSchema} from './command-schemas'
import {serializeDocumentFile} from './serialize-document-file'

export const createDocumentOperations = ({
  model,
  checkRevision,
  requireFiles,
  options,
}: CommandContext) => [
  defineOperation(
    'document.saved',
    'Acknowledge a completed native save of the exact current snapshot.',
    z.object({expectedRevision: z.number().int().nonnegative(), fingerprint: z.string()}),
    async (input) => {
      const view = checkRevision(input.expectedRevision)
      if ((await hashValue(view.document)) !== input.fingerprint) {
        throw new Error('snapshot-mismatch: file represents a different document')
      }
      checkRevision(input.expectedRevision)
      options.onSaved?.(view.document, view.revision)
      return {savedRevision: view.revision}
    },
  ),
  defineOperation(
    'document.replace',
    'Replace the document as one undo step.',
    z.object({document: documentSchema, expectedRevision: z.number().int().nonnegative()}),
    (input, requestId) => {
      checkRevision(input.expectedRevision)
      return model.request({...input, ownerId: 'commands', requestId, type: 'replace'})
    },
  ),
  defineOperation(
    'document.open',
    'Read a PSD/JSON/Poffo path and replace the model as one undo step.',
    z.object({expectedRevision: z.number().int().nonnegative(), path: z.string()}),
    async (input, requestId) => {
      checkRevision(input.expectedRevision)
      const read = await requireFiles().read(input.path)
      if (!read.ok) {
        throw new Error(`${read.error.code}: file import failed`)
      }
      checkRevision(input.expectedRevision)
      return {
        result: model.request({
          document: read.document,
          expectedRevision: input.expectedRevision,
          ownerId: 'commands',
          requestId,
          type: 'replace',
        }),
        warnings: read.warnings,
      }
    },
  ),
  defineOperation(
    'document.save',
    'Save the committed snapshot; overwriting requires an explicit flag.',
    z.object({
      expectedRevision: z.number().int().nonnegative(),
      format: z.enum(['poffo', 'json']),
      overwrite: z.boolean().default(false),
      path: z.string(),
    }),
    async (input) => {
      const view = checkRevision(input.expectedRevision)
      const content = await serializeDocumentFile(view.document, input.format)
      await requireFiles().write(input.path, content, input.overwrite)
      options.onSaved?.(view.document, view.revision)
      return {bytes: content.size, path: input.path, savedRevision: view.revision}
    },
  ),
]
