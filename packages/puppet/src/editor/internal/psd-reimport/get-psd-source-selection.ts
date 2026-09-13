import type {PuppetDocument, PuppetPart} from '../../../player/document'

import type {PsdSourceOption} from './types'
const getPsdSources = (document: PuppetDocument): ReadonlyArray<PsdSourceOption> => {
  const groups = new Map<string, Array<PuppetPart>>()
  for (const part of document.parts) {
    if (part.psdSource !== undefined || /(?:^|:)psd-\d+$/u.test(part.id)) {
      const id =
        part.psdSource?.documentId ?? `legacy:${part.id.slice(0, part.id.lastIndexOf(':') + 1)}`
      groups.set(id, [...(groups.get(id) ?? []), part])
    }
  }
  return [...groups].map(([id, parts], index) => ({
    fileName: parts[0]?.psdSource?.fileName,
    id,
    name: `${index + 1}. ${parts[0]?.psdSource?.fileName ?? '기존 PSD'} · ${parts.length}개 레이어`,
    parts,
  }))
}

export const getPsdSourceSelection = (
  document: PuppetDocument,
  incoming: PuppetDocument,
  selectedSource?: string,
) => {
  const sources = getPsdSources(document)
  const fileName = incoming.parts[0]?.psdSource?.fileName
  const named = sources.filter((source) => fileName !== undefined && source.fileName === fileName)
  const sourceId =
    selectedSource ??
    (sources.length === 1 ? sources[0]?.id : named.length === 1 ? named[0]?.id : undefined)
  const candidates = sources.find((source) => source.id === sourceId)?.parts ?? []
  return {sourceId, candidates, sources}
}
