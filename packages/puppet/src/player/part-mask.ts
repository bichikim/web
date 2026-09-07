import type {PuppetPart} from './document'

export interface CanUsePartAsMaskOptions {
  readonly maskPartId: string
  readonly partId: string
  readonly parts: ReadonlyArray<PuppetPart>
}

interface ReachesPartOptions {
  readonly currentPartId: string
  readonly partById: ReadonlyMap<string, PuppetPart>
  readonly targetPartId: string
  readonly visitedPartIds: Set<string>
}

const reachesPart = (options: ReachesPartOptions): boolean => {
  if (options.currentPartId === options.targetPartId) {
    return true
  }
  if (options.visitedPartIds.has(options.currentPartId)) {
    return false
  }

  options.visitedPartIds.add(options.currentPartId)
  const part = options.partById.get(options.currentPartId)
  return (part?.properties?.clippingMaskIds ?? []).some((maskPartId) =>
    reachesPart({
      currentPartId: maskPartId,
      partById: options.partById,
      targetPartId: options.targetPartId,
      visitedPartIds: options.visitedPartIds,
    }),
  )
}

export const canUsePartAsMask = (options: CanUsePartAsMaskOptions) => {
  const partById = new Map(options.parts.map((part) => [part.id, part]))
  if (!partById.has(options.partId) || !partById.has(options.maskPartId)) {
    return false
  }

  return !reachesPart({
    currentPartId: options.maskPartId,
    partById,
    targetPartId: options.partId,
    visitedPartIds: new Set(),
  })
}
