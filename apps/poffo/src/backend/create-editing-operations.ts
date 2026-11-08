import {z} from 'zod'
import {defineOperation} from './define-operation'
import type {CommandContext} from './create-command-context'
import {patchInputSchema} from './command-schemas'
import {previewDocumentPatch} from './preview-document-patch'

export const createEditingOperations = ({model, checkRevision}: CommandContext) => [
  defineOperation(
    'edit.preview',
    'Validate an ordered RFC 6902 patch without changing the model or history.',
    patchInputSchema,
    async (input) => {
      const view = checkRevision(input.expectedRevision)
      const candidate = await previewDocumentPatch(view.document, input.patch)
      return {
        expectedRevision: view.revision,
        fingerprint: candidate.fingerprint,
        operations: input.patch.length,
      }
    },
  ),
  defineOperation(
    'edit.apply',
    'Apply exactly the previewed patch as one undo step.',
    patchInputSchema.extend({fingerprint: z.string(), title: z.string().optional()}),
    async (input, requestId) => {
      const view = checkRevision(input.expectedRevision)
      const candidate = await previewDocumentPatch(view.document, input.patch)
      if (candidate.fingerprint !== input.fingerprint) {
        throw new Error('preview-mismatch: preview the exact candidate')
      }
      checkRevision(input.expectedRevision)
      return model.request({
        document: candidate.document,
        expectedRevision: input.expectedRevision,
        ownerId: 'commands',
        requestId,
        title: input.title,
        type: 'edit',
      })
    },
  ),
  ...(['undo', 'redo'] as const).map((type) =>
    defineOperation(
      `history.${type}`,
      `Perform one shared ${type} step.`,
      z.object({expectedRevision: z.number().int().nonnegative()}),
      (input, requestId) => {
        checkRevision(input.expectedRevision)
        return model.request({ownerId: 'commands', requestId, type})
      },
    ),
  ),
]
