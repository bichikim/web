import {z} from 'zod'
import {defineOperation} from './define-operation'
import type {CommandContext} from './create-command-context'
import {modelActionSchema, patchInputSchema, patchSchema} from './command-schemas'
import {applyDocumentPatch} from './apply-document-patch'

export const createModelOperations = ({model, checkRevision}: CommandContext) => [
  defineOperation(
    'model.request',
    'Submit a GUI model action; completion means the authoritative backend accepted it.',
    modelActionSchema,
    (action) => {
      if (
        action.expectedRevision !== undefined &&
        action.expectedRevision !== model.read().revision
      ) {
        throw new Error('stale-revision: model changed')
      }
      if (action.type === 'reset') {
        checkRevision(action.expectedRevision)
      }
      return model.request(action)
    },
  ),
  defineOperation(
    'model.patch',
    'Apply a GUI document delta against its captured revision.',
    patchInputSchema.extend({
      expectedSessionId: z.string().optional(),
      ownerId: z.string(),
      patch: z.array(patchSchema.element).max(MAXIMUM_GUI_PATCHES),
      requestId: z.string(),
      title: z.string().optional(),
      transactionId: z.string().optional(),
      type: z.enum(['edit', 'replace']),
    }),
    async (input) => {
      const view = model.read()
      if (view.revision !== input.expectedRevision) {
        throw new Error('stale-revision: model changed')
      }
      const document = applyDocumentPatch(view.document, input.patch)
      return model.request({...input, document})
    },
  ),
]

const MAXIMUM_GUI_PATCHES = 262_144
