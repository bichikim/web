import type {PuppetDocument, PuppetTrack} from '../../../player/document'
import {getDocumentScene} from '../../../player/scene'
import {mapBindingReferences} from './map-binding-references'
import {mapSceneReferences} from './map-scene-references'

interface MapDocumentReferencesOptions {
  readonly document: PuppetDocument
  readonly rename: (id: string) => string
  readonly keepPart?: (id: string) => boolean
}

export const mapDocumentReferences = (options: MapDocumentReferencesOptions): PuppetDocument => {
  const {document, rename} = options
  const keepPart = options.keepPart ?? (() => true)
  const glue = document.glue?.filter(
    (value) => keepPart(value.first.partId) && keepPart(value.second.partId),
  )
  const glueIds = new Set(glue?.map((value) => value.id))
  const transform = {keepPart, rename, keepGlue: (id: string) => glueIds.has(id)}
  return {
    ...document,
    parts: document.parts
      .filter((part) => keepPart(part.id))
      .map((part) => ({
        ...part,
        id: rename(part.id),
        properties:
          part.properties === undefined
            ? undefined
            : {
                ...part.properties,
                clippingMaskIds: part.properties.clippingMaskIds?.filter(keepPart).map(rename),
              },
        psdSource:
          part.psdSource === undefined
            ? undefined
            : {
                ...part.psdSource,
                documentId:
                  part.psdSource.documentId === undefined
                    ? undefined
                    : rename(part.psdSource.documentId),
              },
      })),
    parameters: document.parameters?.map((parameter) => ({...parameter, id: rename(parameter.id)})),
    scene: {roots: mapSceneReferences(getDocumentScene(document).roots, transform)},
    motions: document.motions.map((motion) => ({
      ...motion,
      id: rename(motion.id),
      tracks: motion.tracks.flatMap<PuppetTrack>((track) => {
        switch (track.kind) {
          case 'vertex':
            return keepPart(track.partId) ? [{...track, partId: rename(track.partId)}] : []
          case 'parameter':
            return [{...track, parameterId: rename(track.parameterId)}]
          default: {
            const exhaustive: never = track
            return exhaustive
          }
        }
      }),
    })),
    parameterBindings: document.parameterBindings?.map((binding) =>
      mapBindingReferences(binding, transform),
    ),
    glue: glue?.map((value) => ({
      ...value,
      first: {...value.first, partId: rename(value.first.partId)},
      id: rename(value.id),
      second: {...value.second, partId: rename(value.second.partId)},
    })),
  }
}
