import type {CreateCommandServiceOptions} from './command-types'

export const createCommandContext = (options: CreateCommandServiceOptions) => {
  const {model} = options
  const requireFiles = () => {
    if (options.files === undefined) {
      throw new Error('unsupported-capability: path I/O')
    }
    return options.files
  }
  const checkRevision = (revision: number) => {
    const view = model.read()
    if (view.transaction !== null) {
      throw new Error('busy: finish the active edit')
    }
    if (view.revision !== revision) {
      throw new Error('stale-revision: inspect the current document')
    }
    return view
  }
  return {checkRevision, model, options, requireFiles}
}

export type CommandContext = ReturnType<typeof createCommandContext>
