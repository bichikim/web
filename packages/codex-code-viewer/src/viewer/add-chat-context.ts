import type {ViewerContext, ViewerPort} from './types'

interface ChatContextOptions {
  readonly port: Pick<ViewerPort, 'context' | 'attachSelection'>
  readonly selection: ViewerContext
  readonly message: string
  readonly onNotice: (message: string) => void
}

/** Adds exactly one selection through native attachment or the host context capability. */
export const addChatContext = async (options: ChatContextOptions): Promise<void> => {
  if (options.port.attachSelection === undefined) {
    await options.port.context(options.selection)
    options.onNotice(options.message)
  } else {
    await options.port.attachSelection(options.selection)
  }
}
