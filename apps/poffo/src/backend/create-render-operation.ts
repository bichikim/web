import {defineOperation} from './define-operation'
import type {CommandContext} from './create-command-context'
import {renderInputSchema} from './render-types'
import {hashValue} from './hash-value'

export const createRenderOperation = ({checkRevision, requireFiles, options}: CommandContext) =>
  defineOperation(
    'view.render',
    'Capture an exact pose as PNG through a connected GUI renderer. Does not change the live pose.',
    renderInputSchema,
    async (input) => {
      const view = checkRevision(input.expectedRevision)
      if (options.render === undefined) {
        throw new Error('requires-gui: attach a renderer')
      }
      const rendered = await options.render(view.document, input)
      const content = await (await fetch(rendered.dataUrl)).blob()
      await requireFiles().write(input.path, content, input.overwrite)
      return {
        height: rendered.height,
        modelHash: await hashValue(view.document),
        path: input.path,
        renderedRevision: view.revision,
        width: rendered.width,
      }
    },
  )
