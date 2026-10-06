interface ConsumeTransferLinkOptions {
  readonly hash: string
  readonly isConfigured: boolean
  readonly pathname: string
  readonly search: string
}

export interface ConsumedTransferLink {
  readonly replacementUrl: string
  readonly secret: string
  readonly sessionId: string | null
}

/** Interprets a transfer link and removes its consumed query and invitation fragment. */
export const consumeTransferLink = (
  options: ConsumeTransferLinkOptions,
): ConsumedTransferLink | null => {
  const parameters = new URLSearchParams(options.search)
  if (parameters.get('tool') !== 'transfer' || !options.isConfigured) {
    return null
  }

  const sessionId = parameters.get('session')
  const hash = sessionId === null ? options.hash : ''
  parameters.delete('tool')
  parameters.delete('session')
  const search = parameters.size === 0 ? '' : `?${parameters.toString()}`

  return {
    replacementUrl: `${options.pathname}${search}${hash}`,
    secret: options.hash.slice(1),
    sessionId,
  }
}
