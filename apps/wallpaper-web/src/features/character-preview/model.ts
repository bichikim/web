import type {PreparedPuppetDocument} from '@winter-love/puppet/prepare-document'

const CHARACTER_MODEL_URL = '/models/white-cat/model.poffo'

interface InitialCharacterDocument {
  readonly controller: AbortController
  readonly document: Promise<PreparedPuppetDocument>
}

let initial: InitialCharacterDocument | undefined

const fetchModel = async (signal: AbortSignal): Promise<Blob> => {
  const response = await fetch(CHARACTER_MODEL_URL, {signal})
  if (!response.ok) {
    throw new Error('Character download failed')
  }
  return response.blob()
}

const prepareModel = async (signal: AbortSignal): Promise<PreparedPuppetDocument> => {
  const [source, {preparePuppetDocument}] = await Promise.all([
    fetchModel(signal),
    import('@winter-love/puppet/prepare-document'),
  ])
  const prepared = await preparePuppetDocument({signal, source})
  if (!prepared.ok) {
    throw new Error('Character document is invalid')
  }
  return prepared.document
}

export const startInitialCharacterDocument = (): void => {
  if (initial === undefined) {
    const controller = new AbortController()
    const document = prepareModel(controller.signal)
    initial = {controller, document}
    // The first character still receives failures that happen before it mounts.
    document.catch(() => undefined)
  }
}

export const loadCharacterDocument = async (
  signal: AbortSignal,
): Promise<PreparedPuppetDocument> => {
  const pending = initial
  initial = undefined
  if (pending === undefined) {
    return prepareModel(signal)
  }
  const abort = () => pending.controller.abort(signal.reason)
  if (signal.aborted) {
    abort()
    signal.throwIfAborted()
  }
  signal.addEventListener('abort', abort, {once: true})
  try {
    return await pending.document
  } finally {
    signal.removeEventListener('abort', abort)
  }
}
