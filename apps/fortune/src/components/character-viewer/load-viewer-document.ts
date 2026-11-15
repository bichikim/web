import type {PreparedPuppetDocument} from '@winter-love/puppet/player'
import {getViewerLook} from './get-viewer-look'

export const loadViewerDocument = async (signal: AbortSignal): Promise<PreparedPuppetDocument> => {
  const [{compactDocumentTextures, preparePuppetDocument}, response] = await Promise.all([
    import('@winter-love/puppet/player'),
    fetch('/models/fortune-teller/model.poffo', {cache: 'no-cache', signal}),
  ])
  if (!response.ok) {
    throw new Error('Character download failed')
  }
  const source = await preparePuppetDocument({signal, source: await response.blob()})
  if (!source.ok) {
    throw new Error('Invalid character document', {cause: source})
  }
  const tracked = await preparePuppetDocument({
    document: compactDocumentTextures({
      ...source.document,
      look: getViewerLook(source.document),
      // Rebuild derived outlines: the prepared hair boundaries fail revalidation.
      parts: source.document.parts.map((part) => ({
        ...part,
        mesh: {...part.mesh, boundaryLoops: undefined},
      })),
    }),
    signal,
  })
  if (!tracked.ok) {
    throw new Error('Invalid character tracking', {cause: tracked})
  }
  return tracked.document
}
