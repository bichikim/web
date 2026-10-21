import type {PuppetDocument, PuppetHitArea} from '../../player/document'
import {hasValidHitAreas} from '../../player/internal/parse-hit-area'
import {acceptName, createUniqueName} from './preset-ids'

const HIT_AREA_NAME = '영역'

const getHitAreas = (document: PuppetDocument) => document.hitAreas ?? []

const withHitAreas = (
  document: PuppetDocument,
  hitAreas: ReadonlyArray<PuppetHitArea>,
): PuppetDocument | undefined => {
  const kept = hitAreas.filter((area) => area.partIds.length > 0)
  return hasValidHitAreas(kept, document.parts)
    ? {...document, hitAreas: kept.length === 0 ? undefined : kept}
    : undefined
}

/** The hit area containing `partId`, if any. */
export const getPartHitArea = (document: PuppetDocument, partId: string) =>
  getHitAreas(document).find((area) => area.partIds.includes(partId))

/**
 * Moves `partId` into `areaId`, creating the area when it does not exist; `undefined` removes
 * the part from every area. Areas left without parts are dropped.
 */
export const setPartHitArea = (
  document: PuppetDocument,
  partId: string,
  areaId: string | undefined,
) => {
  const released = getHitAreas(document).map((area) => ({
    ...area,
    partIds: area.partIds.filter((id) => id !== partId),
  }))
  if (areaId === undefined) {
    return withHitAreas(document, released)
  }
  return withHitAreas(
    document,
    released.some((area) => area.id === areaId)
      ? released.map((area) =>
          area.id === areaId ? {...area, partIds: [...area.partIds, partId]} : area,
        )
      : [...released, {id: areaId, partIds: [partId]}],
  )
}

/** Adds `partId` to a new hit area; returns its ID with the document. */
export const addPartHitArea = (document: PuppetDocument, partId: string) => {
  const id = createUniqueName(
    HIT_AREA_NAME,
    getHitAreas(document).map((area) => area.id),
  )
  const next = setPartHitArea(document, partId, id)
  return next === undefined ? undefined : {document: next, id}
}

/** Renames a hit area; empty or duplicate names are rejected. */
export const renameHitArea = (document: PuppetDocument, areaId: string, name: string) => {
  const id = acceptName(
    name,
    areaId,
    getHitAreas(document).map((area) => area.id),
  )
  return id === undefined
    ? undefined
    : withHitAreas(
        document,
        getHitAreas(document).map((area) => (area.id === areaId ? {...area, id} : area)),
      )
}
