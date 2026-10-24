import type {
  PuppetDocument,
  PuppetMotion,
  PuppetTimelineEffectRow,
  PuppetTrack,
} from '../../../player/document'
import {getMotionTimelineRows} from '../../../player/motion-timeline-rows'
import {getDocumentScene} from '../../../player/scene'
import {mapBindingReferences} from './map-binding-references'
import {mapSceneReferences} from './map-scene-references'
import type {ReferenceTransform} from './types'

/** Breath, look, parameter groups, roles and mouth shapes with renamed parameter and group IDs. */
const renameModelMetadata = (document: PuppetDocument, rename: (id: string) => string) => ({
  breath: document.breath?.map((entry) => ({...entry, parameterId: rename(entry.parameterId)})),
  look: document.look?.map((entry) => ({...entry, parameterId: rename(entry.parameterId)})),
  mouthShapes:
    document.mouthShapes === undefined
      ? undefined
      : {...document.mouthShapes, parameterIds: document.mouthShapes.parameterIds.map(rename)},
  parameterGroups: document.parameterGroups?.map((group) => ({
    ...group,
    groupId: group.groupId === undefined ? undefined : rename(group.groupId),
    id: rename(group.id),
  })),
  parameterRoles:
    document.parameterRoles === undefined
      ? undefined
      : {
          eyeBlink: document.parameterRoles.eyeBlink?.map(rename),
          lipSync: document.parameterRoles.lipSync?.map(rename),
        },
})

/**
 * Motions with renamed references; vertex curves of dropped parts and opacity curves and rows
 * of dropped groups go.
 */
const mapMotionReferences = (
  document: PuppetDocument,
  transform: ReferenceTransform,
): Array<PuppetMotion> => {
  const {keepPart, rename} = transform
  const keepNode = (id: string) => transform.keepNode?.(id) !== false
  return document.motions.map((motion) => {
    const rows = getMotionTimelineRows(document, motion)
    return {
      ...motion,
      id: rename(motion.id),
      timelineParameterIds:
        motion.timelineParameterIds === undefined ? undefined : rows.parameterIds.map(rename),
      ...(rows.effectRows.length === 0 && motion.timelineEffectRows === undefined
        ? {}
        : {
            timelineEffectRows: rows.effectRows.flatMap<PuppetTimelineEffectRow>((row) =>
              row.kind === 'model'
                ? [row]
                : keepNode(row.groupId)
                  ? [{...row, groupId: rename(row.groupId)}]
                  : [],
            ),
          }),
      tracks: motion.tracks.flatMap<PuppetTrack>((track) => {
        switch (track.kind) {
          case 'vertex':
            return keepPart(track.partId) ? [{...track, partId: rename(track.partId)}] : []
          case 'parameter':
            return [{...track, parameterId: rename(track.parameterId)}]
          case 'group-opacity':
            return keepNode(track.groupId) ? [{...track, groupId: rename(track.groupId)}] : []
          case 'model':
            return [track]
          default: {
            const exhaustive: never = track
            return exhaustive
          }
        }
      }),
    }
  })
}

interface MapDocumentReferencesOptions {
  readonly document: PuppetDocument
  readonly rename: (id: string) => string
  readonly keepNode?: (id: string) => boolean
  readonly keepPart?: (id: string) => boolean
}

export const mapDocumentReferences = (options: MapDocumentReferencesOptions): PuppetDocument => {
  const {document, rename} = options
  const keepPart = options.keepPart ?? (() => true)
  const glue = document.glue?.filter(
    (value) => keepPart(value.first.partId) && keepPart(value.second.partId),
  )
  const glueIds = new Set(glue?.map((value) => value.id))
  const transform = {
    keepGlue: (id: string) => glueIds.has(id),
    keepNode: options.keepNode,
    keepPart,
    rename,
  }
  return {
    ...document,
    expressions: document.expressions?.map((expression) => ({
      ...expression,
      id: rename(expression.id),
      parameters: expression.parameters.map((parameter) => ({
        ...parameter,
        parameterId: rename(parameter.parameterId),
      })),
    })),
    glue: glue?.map((value) => ({
      ...value,
      first: {...value.first, partId: rename(value.first.partId)},
      id: rename(value.id),
      second: {...value.second, partId: rename(value.second.partId)},
    })),
    hitAreas: document.hitAreas?.flatMap((area) => {
      const partIds = area.partIds.filter(keepPart).map(rename)
      return partIds.length > 0 ? [{...area, id: rename(area.id), partIds}] : []
    }),
    layerOrderRules: document.layerOrderRules?.flatMap((rule) => {
      const partIds = rule.partIds.filter(keepPart).map(rename)
      return keepPart(rule.referencePartId) && partIds.length > 0
        ? [
            {
              ...rule,
              partIds,
              referencePartId: rename(rule.referencePartId),
              when: {...rule.when, parameterIds: rule.when.parameterIds.map(rename)},
            },
          ]
        : []
    }),
    motions: mapMotionReferences(document, transform),
    parameterBindings: document.parameterBindings?.map((binding) =>
      mapBindingReferences(binding, transform),
    ),
    ...renameModelMetadata(document, rename),
    parameters: document.parameters?.map((parameter) => ({
      ...parameter,
      groupId: parameter.groupId === undefined ? undefined : rename(parameter.groupId),
      id: rename(parameter.id),
    })),
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
        spatial:
          part.spatial === undefined
            ? undefined
            : {
                ...part.spatial,
                groupId:
                  part.spatial.groupId === undefined ? undefined : rename(part.spatial.groupId),
              },
      })),
    physics:
      document.physics === undefined
        ? undefined
        : {
            ...document.physics,
            chains: document.physics.chains?.map((chain) => ({
              ...chain,
              id: transform.rename(chain.id),
              inputs: chain.inputs.map((input) => ({
                ...input,
                parameterId: transform.rename(input.parameterId),
              })),
              outputs: chain.outputs.map((output) => ({
                ...output,
                parameterId: transform.rename(output.parameterId),
              })),
            })),
            pendulums: document.physics.pendulums.map((pendulum) => ({
              ...pendulum,
              id: transform.rename(pendulum.id),
              inputParameterId: transform.rename(pendulum.inputParameterId),
              outputParameterId: transform.rename(pendulum.outputParameterId),
            })),
          },
    poseGroups: document.poseGroups?.flatMap((group) => {
      const keptIndices: number[] = []
      const entries = group.entries.flatMap((entry, index) => {
        const partIds = entry.partIds.filter(keepPart).map(rename)
        if (partIds.length > 0) {
          keptIndices.push(index)
        }
        return partIds.length > 0 ? [{...entry, partIds}] : []
      })
      return entries.length > 0
        ? [
            {
              ...group,
              entries,
              id: rename(group.id),
              parameterId: rename(group.parameterId),
              sourceParameterIds:
                group.sourceParameterIds === undefined
                  ? undefined
                  : keptIndices.map((index) => rename(group.sourceParameterIds![index]!)),
            },
          ]
        : []
    }),
    scene: {roots: mapSceneReferences(getDocumentScene(document).roots, transform)},
  }
}
